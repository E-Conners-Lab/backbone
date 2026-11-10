"""Compare the spec's hand-worked OSPF cases with a real OSPF implementation (FRR).

Builds each fixture topology as FRR routers in Docker, one bridge network per link, lets
OSPF converge, and reads every expected route back with `show ip route ... json`. This is
a control-plane check against independent software (PLAN decision D4). It does not test
the game engine directly: the unit tests check the engine against the same fixture file.

Usage: python3 tools/frr_check.py [--image IMAGE] [--topology T1] [--keep]
Exit codes: 0 all routes match, 1 a route differs, 2 the lab was unhealthy (no verdict).
Requires Docker. Creates containers and networks named bbfrr-*, and removes them afterwards.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
from collections.abc import Callable
from pathlib import Path

FIXTURES = (
    Path(__file__).resolve().parent.parent / "tests" / "fixtures" / "ospf-cases.json"
)
PREFIX = "bbfrr"
Link = tuple[str, str, int]


def sh(*args: str) -> str:
    done = subprocess.run(args, capture_output=True, text=True, check=False)
    if done.returncode != 0:
        raise RuntimeError(f"{' '.join(args)}\n{done.stderr.strip()}")
    return done.stdout


def vtysh(router: str, *commands: str) -> str:
    args = ["docker", "exec", f"{PREFIX}-{router}", "vtysh"]
    for command in commands:
        args += ["-c", command]
    return sh(*args)


def cleanup() -> None:
    containers = sh("docker", "ps", "-aq", "--filter", f"name={PREFIX}-").split()
    if containers:
        sh("docker", "rm", "-f", *containers)
    networks = sh("docker", "network", "ls", "--format", "{{.Name}}").split()
    ours = [n for n in networks if n.startswith(f"{PREFIX}-")]
    if ours:
        sh("docker", "network", "rm", *ours)


def wait_for(check: Callable[[], bool], seconds: int, what: str) -> bool:
    deadline = time.time() + seconds
    while time.time() < deadline:
        if check():
            return True
        time.sleep(1)
    print(f"  timed out waiting for {what}")
    return False


class Lab:
    """One fixture topology running as FRR containers."""

    def __init__(
        self,
        name: str,
        routers: dict[str, int],
        links: list[Link],
        image: str,
        base: int,
    ) -> None:
        self.routers, self.links, self.base = routers, links, base
        self.owner: dict[str, str] = {}  # interface IP -> router name
        self.ifname: dict[tuple[str, str], str] = {}  # (router, neighbour) -> interface
        self.stub: dict[
            str, int
        ] = {}  # router -> metric it advertises for its loopback
        subnet: dict[tuple[str, str], str] = {}
        first: dict[str, str] = {}
        start = "sed -i 's/^ospfd=no/ospfd=yes/' /etc/frr/daemons && exec /usr/lib/frr/docker-start"

        def net_name(a: str, b: str) -> str:
            return f"{PREFIX}-{name}-{a}{b}".lower()

        for i, (a, b, _) in enumerate(links):
            subnet[(a, b)] = f"10.{base}.{i}."
            sh(
                "docker",
                "network",
                "create",
                "--subnet",
                f"10.{base}.{i}.0/29",
                net_name(a, b),
            )
            first.setdefault(a, net_name(a, b))
            first.setdefault(b, net_name(a, b))
        for r in routers:
            sh("docker", "run", "-d", "--name", f"{PREFIX}-{r}", "--hostname", r, "--privileged",
               "--network", first[r], image, "sh", "-c", start)  # fmt: skip
        for a, b, _ in links:
            for r in (a, b):
                if first[r] != net_name(a, b):
                    sh("docker", "network", "connect", net_name(a, b), f"{PREFIX}-{r}")
        time.sleep(4)

        # Docker picks the interface names and addresses, so read them back (structured JSON).
        for r in routers:
            for iface in json.loads(
                sh("docker", "exec", f"{PREFIX}-{r}", "ip", "-j", "addr")
            ):
                for addr in iface.get("addr_info", []):
                    if addr.get("family") != "inet":
                        continue
                    self.owner[addr["local"]] = r
                    for (a, b), prefix in subnet.items():
                        if addr["local"].startswith(prefix) and r in (a, b):
                            self.ifname[(r, b if r == a else a)] = iface["ifname"]

        for r, rid in routers.items():
            cmds = [
                "configure terminal",
                "interface lo",
                f"ip address 10.255.{base}.{rid}/32",
                "exit",
            ]
            for a, b, cost in links:
                if r in (a, b):
                    cmds += [
                        f"interface {self.ifname[(r, b if r == a else a)]}",
                        "ip ospf network point-to-point",
                        f"ip ospf cost {cost}",
                        "ip ospf hello-interval 1",
                        "ip ospf dead-interval 4",
                        "exit",
                    ]
            cmds += [
                "router ospf",
                f"ospf router-id 0.0.0.{rid}",
                "network 10.0.0.0/8 area 0",
            ]
            vtysh(r, *cmds)

    def loopback_metric(self, router: str) -> int:
        """The metric FRR itself advertises for the router's loopback (a stub link).

        A route to that loopback costs the path plus this value, so it is subtracted when
        comparing with the spec. Read from FRR's own router-LSA, as JSON, rather than assumed.
        """
        loopback = f"10.255.{self.base}.{self.routers[router]}"
        data = json.loads(
            vtysh(router, "show ip ospf database router self-originate json")
        )
        for lsas in data.get("routerLinkStates", {}).get("areas", {}).values():
            for lsa in lsas:
                for link in lsa.get("routerLinks", {}).values():
                    if (
                        link.get("linkType") == "Stub Network"
                        and link.get("networkAddress") == loopback
                    ):
                        return int(link["tos0Metric"])
        raise RuntimeError(f"could not read the loopback stub metric for {router}")

    def set_cost(self, a: str, b: str, cost: int) -> None:
        for r, n in ((a, b), (b, a)):
            vtysh(
                r,
                "configure terminal",
                f"interface {self.ifname[(r, n)]}",
                f"ip ospf cost {cost}",
            )

    def set_link(self, a: str, b: str, up: bool) -> None:
        for r, n in ((a, b), (b, a)):
            vtysh(
                r,
                "configure terminal",
                f"interface {self.ifname[(r, n)]}",
                "no shutdown" if up else "shutdown",
            )

    def full_neighbours(self) -> int:
        total = 0
        for r in self.routers:
            data = json.loads(vtysh(r, "show ip ospf neighbor json"))
            for entries in data.get("neighbors", {}).values():
                total += sum(
                    1
                    for e in entries
                    if str(e.get("nbrState", e.get("state", ""))).startswith("Full")
                )
        return total

    def adjacencies_up(self) -> bool:
        return self.full_neighbours() == 2 * len(self.links)

    def route(self, src: str, dst: str) -> tuple[int, list[str]] | None:
        prefix = f"10.255.{self.base}.{self.routers[dst]}/32"
        data = json.loads(vtysh(src, f"show ip route {prefix} json") or "{}")
        for entry in data.get(prefix, []):
            if entry.get("protocol") == "ospf" and entry.get("selected"):
                hops = sorted(
                    self.owner.get(h.get("ip", ""), "?")
                    for h in entry.get("nexthops", [])
                    if h.get("active")
                )
                return entry["metric"] - self.stub[dst], hops
        return None

    def matches(self, expect: dict) -> bool:
        got = self.route(expect["from"], expect["to"])
        if expect.get("unreachable"):
            return got is None
        return got == (expect["cost"], sorted(expect["nextHops"]))


def run_case(lab: Lab, case: dict) -> tuple[int, int]:
    """Applies the case's changes, compares every expected route, then undoes the changes."""
    for a, b, cost in case.get("setCost", []):
        lab.set_cost(a, b, cost)
    for a, b in case.get("cut", []):
        lab.set_link(a, b, False)

    wait_for(
        lambda: all(lab.matches(e) for e in case["expect"]),
        40,
        f"case {case['id']} to converge",
    )
    checked = failed = 0
    for e in case["expect"]:
        got = lab.route(e["from"], e["to"])
        want = (
            "unreachable"
            if e.get("unreachable")
            else (e["cost"], sorted(e["nextHops"]))
        )
        good = lab.matches(e)
        checked += 1
        failed += 0 if good else 1
        verdict = "match" if good else "MISMATCH"
        print(
            f"  case {case['id']} {e['from']}->{e['to']}: FRR {got or 'unreachable'} | spec {want} | {verdict}"
        )

    for a, b in case.get("cut", []):
        lab.set_link(a, b, True)
    original = {(a, b): c for a, b, c in lab.links}
    for a, b, _ in case.get("setCost", []):
        lab.set_cost(a, b, original[(a, b)])
    return checked, failed


class LabUnhealthy(RuntimeError):
    """The lab itself is broken (an adjacency or router ID is wrong), so no comparison is valid."""


def check_health(lab: Lab, tname: str) -> None:
    """Refuses to compare anything unless the lab is the topology the fixture describes."""
    if not wait_for(lab.adjacencies_up, 90, "all adjacencies Full"):
        raise LabUnhealthy(
            f"{tname}: only {lab.full_neighbours()} of {2 * len(lab.links)} neighbour entries are Full"
        )
    for r, rid in lab.routers.items():
        got = json.loads(vtysh(r, "show ip ospf json")).get("routerId")
        if got != f"0.0.0.{rid}":
            raise LabUnhealthy(
                f"{tname}: router {r} has router ID {got}, expected 0.0.0.{rid}"
            )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", default="quay.io/frrouting/frr:10.7.1")
    parser.add_argument("--topology", help="run only this fixture topology, e.g. T1")
    parser.add_argument(
        "--keep", action="store_true", help="leave the last lab running"
    )
    args = parser.parse_args()
    fixtures = json.loads(FIXTURES.read_text())
    checked = failed = 0
    cleanup()
    try:
        for base, (tname, topo) in enumerate(fixtures["topologies"].items(), start=71):
            if args.topology and args.topology != tname:
                continue
            links: list[Link] = [(a, b, c) for a, b, c in topo["links"]]
            lab = Lab(tname, topo["routers"], links, args.image, base)
            version = vtysh(next(iter(topo["routers"])), "show version").splitlines()[0]
            print(f"{tname}: {version}")
            check_health(lab, tname)
            print(
                f"{tname}: {lab.full_neighbours()} of {2 * len(links)} neighbour entries Full; router IDs verified"
            )
            lab.stub = {r: lab.loopback_metric(r) for r in topo["routers"]}
            print(f"{tname}: loopback stub metrics advertised by FRR: {lab.stub}")
            for case in fixtures["cases"]:
                # FRR installs every equal-cost next hop, so only cases with sharing on compare.
                if case["topology"] == tname and case["sharing"]:
                    c, f = run_case(lab, case)
                    checked, failed = checked + c, failed + f
                    check_health(
                        lab, tname
                    )  # the lab must be whole again before the next case
            last = tname == (args.topology or list(fixtures["topologies"])[-1])
            if not (args.keep and last):
                cleanup()  # router names repeat across topologies, so only the last lab can be kept
    except LabUnhealthy as problem:
        print(f"LAB UNHEALTHY, no verdict: {problem}")
        return 2
    finally:
        if not args.keep:
            cleanup()
    print(f"{checked} routes compared, {failed} mismatches")
    return 1 if failed or checked == 0 else 0


if __name__ == "__main__":
    sys.exit(main())
