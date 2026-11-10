// A run is fully described by its seed and the commands the player gave, each tagged with the
// step counter at the moment it was given (R13, R14). Re-simulating the log reproduces the run.

import { createWorld, step, type Command, type Region, type Tuning, type World } from "./world";

export interface LoggedCommand { at: number; command: Command }

export interface Recording { seedText: string; regionId: string; log: LoggedCommand[]; finalStep: number }

/** Re-simulates a recording. `onStep` sees the world after every step (used for the time-lapse). */
export function replay(rec: Recording, region: Region, tuning: Tuning, onStep?: (w: World) => void): World {
  const w = createWorld(rec.seedText, region, tuning);
  let i = 0;
  // Guard is generous: a pending reward makes step() return without advancing.
  for (let guard = 0; guard < rec.finalStep + rec.log.length + 10 && w.step < rec.finalStep && !w.over; guard++) {
    const commands: Command[] = [];
    while (i < rec.log.length && rec.log[i]!.at <= w.step) commands.push(rec.log[i++]!.command);
    step(w, commands);
    onStep?.(w);
  }
  return w;
}
