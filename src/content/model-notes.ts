// Plain-language notes shown in the game's "About the model" panel (constitution C1).
// They mirror the faithful (F) and simplified (S) tables in StarterKit/SPEC.md.

export const FAITHFUL: string[] = [
  "Every site is a router. Each one works out the lowest-cost path to every other site, where a path's cost is the sum of its link costs (RFC 2328 §16.1).",
  "A link cost is a whole number from 1 to 65535. Zero is not allowed (§C.3, §A.4.2).",
  "When two or more paths tie on cost, the router knows every tied next hop (§16.1, §16.8).",
  "A router may keep fewer than all of the tied routes. In this version each router keeps one (§16.8).",
  "Forwarding is hop by hop: each router along the way uses its own table (§16.1.1).",
  "A link is used only while both ends report it. A cut removes it in both directions (§16.1 step 2b).",
  "When a link goes down or a cost changes, every router recalculates and traffic follows the new tables (§13.2).",
  "Cost is configuration. It never reacts to load: a congested lowest-cost path stays the path until you change something.",
];

export const SIMPLIFIED: string[] = [
  "One area, point-to-point links, one router per site. No areas, Designated Routers or external routes.",
  "One cost per link, used in both directions. Real OSPF cost is set per interface, per direction.",
  "Convergence is instant. Real networks take time to detect a failure, flood it and recalculate, and can briefly loop packets. The ripple you see is a visual effect.",
  "When a tie is kept to one route, the neighbor with the lowest router ID wins. RFC 2328 does not say which route to keep.",
  "Congestion is simple: packets are one size, each link direction sends a fixed number per second from a short queue, and a packet that meets a full queue is dropped. Senders never slow down. There is no TCP or QoS.",
  "A new link costs 10. Upgrading capacity does not change cost. RFC 2328 does not define how cost is chosen; deriving it from bandwidth is a vendor default.",
  "One pulse is one simulated packet, standing for a unit of traffic.",
  "Only links fail. Sites never do.",
  "Packets on a link, or queued for it, are lost when it is cut or removed.",
  "Travel time along a link follows its length on the map, scaled for play.",
];
