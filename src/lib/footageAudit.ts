/**
 * TEMPORARY debug helper — footage audit only.
 *
 * Read-only lookup of the real reel window a scene plays. Nothing here takes
 * part in selection, anti-repetition or state logic: it exists so the scene
 * debug panel can show which piece of video is actually on screen and whether
 * another scene id points at the exact same src + start + end window.
 */

import { FOLLOW_UPS, IDLE_SCENES, MOVES } from "@/lib/scenes";
import { PRIMARY_REEL, REELS } from "@/lib/reels";
import { visualSequenceIdOf } from "@/lib/visualSequences";

type AnyScene = {
  id: string;
  label?: string;
  src?: string;
  start?: number;
  end?: number;
  impact?: number;
  rate?: number;
};

const SCENES: AnyScene[] = [
  ...(MOVES as AnyScene[]),
  ...(FOLLOW_UPS as AnyScene[]),
  ...(IDLE_SCENES as AnyScene[]),
];

const byId = new Map<string, AnyScene>();
for (const scene of SCENES) if (!byId.has(scene.id)) byId.set(scene.id, scene);

/** Short file name of a reel url ("arena-moves.webm"). */
export function reelName(src: string | undefined): string {
  const url = src ?? PRIMARY_REEL;
  const file = url.split("?")[0]!.split("/").pop() ?? url;
  const index = REELS.indexOf(url);
  return index >= 0 ? `reel${index} · ${file}` : file;
}

const windowKey = (scene: AnyScene) => `${scene.src ?? PRIMARY_REEL}|${scene.start}|${scene.end}`;

const sameWindow = new Map<string, string[]>();
for (const scene of SCENES) {
  if (typeof scene.start !== "number" || typeof scene.end !== "number") continue;
  const key = windowKey(scene);
  sameWindow.set(key, [...(sameWindow.get(key) ?? []), scene.id]);
}

export type FootageAudit = {
  id: string;
  label: string;
  reel: string;
  start: number;
  end: number;
  impact: number;
  rate: number;
  visualSequenceId: string;
  duplicate: boolean;
  usedBy: string[];
};

/** Real footage behind a scene id, or undefined when the id is unknown. */
export function footageAuditOf(id: string): FootageAudit | undefined {
  const scene = byId.get(id);
  if (!scene || typeof scene.start !== "number" || typeof scene.end !== "number") return undefined;
  const others = (sameWindow.get(windowKey(scene)) ?? []).filter((other) => other !== scene.id);
  return {
    id: scene.id,
    label: scene.label ?? scene.id,
    reel: reelName(scene.src),
    start: scene.start,
    end: scene.end,
    impact: scene.impact ?? scene.start,
    rate: scene.rate ?? 1,
    visualSequenceId: visualSequenceIdOf(scene),
    duplicate: others.length > 0,
    usedBy: others,
  };
}
