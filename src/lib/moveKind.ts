import type { Move } from "@/lib/scenes";
import type { HitKind } from "@/lib/hitConfig";

/**
 * How a move reads physically on screen. Shared by the arena (hit profiles)
 * and by the configuration validator (gift → hit cross-references).
 */
export function moveKind(move: Pick<Move, "label"> & { kind?: HitKind }): HitKind {
  if (move.kind) return move.kind;
  const l = move.label;
  if (/KICK|TEEP|DROPKICK/.test(l)) return "kick";
  if (/ROPE|CLIMB|DIVE|SPLASH|MOONSAULT|JUMP|DROP/.test(l)) return "aerial";
  if (/SLAM|THROW|POWERBOMB|TOSS|FINISHER/.test(l)) return "throw";
  if (/JAB|HOOK|CROSS|RIGHT|UPPERCUT|ELBOW|COMBO|COMBINATION|COUNTER|SHOT/.test(l)) return "punch";
  return "grapple";
}
