// One direction of a link: a FIFO queue with tail drop, served at a fixed rate (SPEC R4, S5).
//
// Step-edge semantics, fixed here so spec case 9 is exact:
//   1. advanceDir() runs once per step: packets in flight move on, then the head of the queue
//      is put on the wire if a whole service credit is available.
//   2. enqueue() calls for that step happen AFTER advanceDir().
// An idle link holds at most one credit, so a packet reaching an idle link leaves on the next step.

export interface Packet {
  id: number;
  src: number;
  dst: number;
  /** Steps left on the current link while in flight; 0 while queued. */
  remain: number;
  /** Flight time of the current link in steps, for drawing position. */
  total: number;
}

export interface Dir {
  queue: Packet[];
  flight: Packet[];
  /** Service credit in packets x stepsPerSec; a packet leaves when credit >= stepsPerSec. */
  credit: number;
  /** Packets served in each of the last N steps (ring), and their sum, for utilization. */
  hist: number[];
  histSum: number;
  /** Packets this direction refused or lost, for the inspector. */
  dropped: number;
}

export function newDir(windowSteps: number): Dir {
  return { queue: [], flight: [], credit: 0, hist: new Array<number>(windowSteps).fill(0), histSum: 0, dropped: 0 };
}

/** Returns false (tail drop) when the queue is full. */
export function enqueue(dir: Dir, p: Packet, queueLen: number): boolean {
  if (dir.queue.length >= queueLen) { dir.dropped++; return false; }
  p.remain = 0;
  dir.queue.push(p);
  return true;
}

/** Advance one step. Returns the packets that reached the far end this step. */
export function advanceDir(dir: Dir, step: number, capacityPerSec: number, stepsPerSec: number, flightSteps: number): Packet[] {
  const arrived: Packet[] = [];
  if (dir.flight.length > 0) {
    const still: Packet[] = [];
    for (const p of dir.flight) {
      p.remain--;
      if (p.remain <= 0) arrived.push(p); else still.push(p);
    }
    dir.flight = still;
  }

  dir.credit += capacityPerSec;
  let served = 0;
  while (dir.credit >= stepsPerSec && dir.queue.length > 0) {
    dir.credit -= stepsPerSec;
    const p = dir.queue.shift()!;
    p.remain = flightSteps;
    p.total = flightSteps;
    dir.flight.push(p);
    served++;
  }
  if (dir.queue.length === 0 && dir.credit > stepsPerSec) dir.credit = stepsPerSec;

  const slot = step % dir.hist.length;
  dir.histSum += served - (dir.hist[slot] ?? 0);
  dir.hist[slot] = served;
  return arrived;
}

/** Empties the direction (link cut or removed). Returns how many packets were lost. */
export function flushDir(dir: Dir): number {
  const lost = dir.queue.length + dir.flight.length;
  dir.queue = [];
  dir.flight = [];
  dir.credit = 0;
  // A dead link carries nothing: clear the utilization window so it does not keep reporting its old load.
  dir.hist.fill(0);
  dir.histSum = 0;
  dir.dropped += lost;
  return lost;
}
