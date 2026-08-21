import { DIFFICULTY_CONFIG, type Difficulty } from "@/lib/difficulty";
import { VARIETY_DEFAULT, type VarietyConfig } from "@/lib/variety";
import { useEffect, useRef, useState } from "react";
import fightVideo from "@/assets/arena-heights2.webm.asset.json";
import { GIFT_BY_ID, type GiftEvent, type Side } from "@/lib/battle";
import { SIDE_NAME, UI_TEXT, type Lang } from "@/lib/i18n";

const FIGHT_VIDEO = fightVideo.url;

type Move = {
  id: string;
  start: number;
  end: number;
  impact: number;
  label: string;
  rate: number;
  /** 1 = light strike, 5 = finisher */
  tier: number;
};

/** How a hit reads physically on screen. */
type HitKind = "punch" | "kick" | "grapple" | "aerial" | "throw";

function kindOf(move: Move): HitKind {
  const l = move.label;
  if (/KICK|TEEP|DROPKICK/.test(l)) return "kick";
  if (/ROPE|CLIMB|DIVE|SPLASH|MOONSAULT|JUMP|DROP/.test(l)) return "aerial";
  if (/SLAM|THROW|POWERBOMB|TOSS|FINISHER/.test(l)) return "throw";
  if (/JAB|HOOK|CROSS|RIGHT|UPPERCUT|ELBOW|COMBO|COMBINATION|COUNTER|SHOT/.test(l)) return "punch";
  return "grapple";
}

/**
 * Hit-stun and KO tuning, per kind of hit. Everything the impact feels like is
 * declared here so punches, kicks, grapples, aerials and throws stay coherent:
 *   stun     — how long the defender is shaken (ms)
 *   force    — amplitude multiplier of the physical reaction
 *   recovery — extra seconds of footage after the move: landing + struggle
 *   settleRate — playback multiplier while that recovery plays
 *   cheer    — crowd reaction strength
 *   koHold   — how long the KO reaction is held when this hit finishes the match
 */
type HitProfile = {
  stun: number;
  force: number;
  recovery: number;
  settleRate: number;
  cheer: number;
  koHold: number;
  /** Extra push-in at the moment of impact (kept small — never a close-up). */
  impactZoom: number;
  /** Camera tilt down + push-in while the action settles on the mat. */
  matY: number;
  matZoom: number;
};

const HIT_PROFILE: Record<HitKind, HitProfile> = {
  punch:   { stun: 380, force: 0.85, recovery: 0.45, settleRate: 0.95, cheer: 1,   koHold: 1100, impactZoom: 0.01, matY: 0.4, matZoom: 0.01 },
  kick:    { stun: 700, force: 1.15, recovery: 0.9,  settleRate: 0.9,  cheer: 1.2, koHold: 1400, impactZoom: 0.02, matY: 0.8, matZoom: 0.02 },
  grapple: { stun: 900, force: 0.9,  recovery: 1.6,  settleRate: 0.85, cheer: 1.2, koHold: 1600, impactZoom: 0.025, matY: 1.6, matZoom: 0.03 },
  aerial:  { stun: 1200, force: 1.35, recovery: 2.2, settleRate: 0.82, cheer: 1.6, koHold: 1900, impactZoom: 0.035, matY: 2.4, matZoom: 0.045 },
  throw:   { stun: 1400, force: 1.6,  recovery: 2.6, settleRate: 0.78, cheer: 1.8, koHold: 2200, impactZoom: 0.04, matY: 2.8, matZoom: 0.05 },
};

/**
 * Framing presets: the fighters travel across the ring instead of staying
 * pinned in the centre. Values stay small (no close-ups) — they only shift the
 * wide shot left/right, a touch nearer/further, with a controlled tilt.
 */
type Frame = { x: number; y: number; scale: number; rotate: number };

const FRAMES: Frame[] = [
  { x: 0, y: 0, scale: 1, rotate: 0 },
  { x: -4.5, y: 0.5, scale: 1.04, rotate: -0.9 },
  { x: 4.5, y: 0.5, scale: 1.04, rotate: 0.9 },
  { x: -6, y: -1, scale: 1.06, rotate: 1.1 },
  { x: 6, y: -1, scale: 1.06, rotate: -1.1 },
  { x: 0, y: 1.5, scale: 0.97, rotate: 0 },
  { x: -2.5, y: -1.5, scale: 1.02, rotate: 0.6 },
  { x: 2.5, y: -1.5, scale: 1.02, rotate: -0.6 },
];

/** Each block of the reel gets its own corner of the ring, plus a little drift. */
function frameFor(move: Move): Frame {
  const block = Math.floor(move.start / 10); // 0..3
  const base = FRAMES[(block * 2 + (move.tier % 2) + 1) % FRAMES.length]!;
  const drift = (Math.random() - 0.5) * 2.4;
  return {
    x: Math.max(-7, Math.min(7, base.x + drift)),
    y: base.y + (Math.random() - 0.5) * 1.2,
    scale: base.scale,
    rotate: base.rotate + (Math.random() - 0.5) * 0.5,
  };
}


/**
 * A spot runs through phases; the camera and the cross-fade blend differently in
 * each one, so lift → throw → landing → recovery reads as one continuous motion
 * instead of a jump between states.
 */
type Phase = "idle" | "windup" | "impact" | "landing" | "recovery";

const PHASE_BLEND: Record<Phase, { camera: number; ease: string; fade: number }> = {
  idle:     { camera: 1400, ease: "cubic-bezier(0.4, 0, 0.2, 1)", fade: 320 },
  windup:   { camera: 700,  ease: "cubic-bezier(0.33, 0, 0.2, 1)", fade: 240 },
  impact:   { camera: 220,  ease: "cubic-bezier(0.16, 1, 0.3, 1)", fade: 120 },
  landing:  { camera: 900,  ease: "cubic-bezier(0.22, 0.9, 0.28, 1)", fade: 160 },
  recovery: { camera: 1200, ease: "cubic-bezier(0.4, 0, 0.2, 1)", fade: 260 },
};

/** Clamp every camera move so the shot stays wide and readable. */
function clampFrame(frame: Frame): Frame {
  return {
    x: Math.max(-7, Math.min(7, frame.x)),
    y: Math.max(-3.5, Math.min(4, frame.y)),
    scale: Math.max(0.96, Math.min(1.09, frame.scale)),
    rotate: Math.max(-1.6, Math.min(1.6, frame.rotate)),
  };
}

/**
 * The reel is one continuous wide camera, 40s long, built from four blocks:
 *   A  0.0 – 10.0  stand-up exchange: circling, punches, lock-up
 *   B 10.1 – 20.0  kickboxing: ring rush, rope run, spin/high kicks, corner clinch
 *   C 20.2 – 30.1  ground: opponent down, corner climb, top-rope dive, arms raised
 *   D 30.3 – 40.3  power: lift, carry across the ring, slam, throw over the ropes
 * Every window below is a real, distinct piece of action — no two moves reuse
 * the same seconds, so the fight never looks like the same loop.
 */
const MOVES: Move[] = [
  // Tier 1 — boxing strikes from block A.
  { id: "jab-a", start: 0.2, end: 1.3, impact: 1.0, label: "JAB", rate: 1.16, tier: 1 },
  { id: "jab-b", start: 1.3, end: 2.4, impact: 2.05, label: "DOUBLE JAB", rate: 1.06, tier: 1 },
  { id: "cross", start: 2.4, end: 3.5, impact: 3.1, label: "STRAIGHT RIGHT", rate: 1.14, tier: 1 },
  { id: "hook-a", start: 3.5, end: 4.6, impact: 4.25, label: "LEFT HOOK", rate: 1.12, tier: 1 },
  { id: "body-shot", start: 4.6, end: 5.7, impact: 5.35, label: "BODY SHOT", rate: 1.08, tier: 1 },
  { id: "uppercut", start: 5.7, end: 6.8, impact: 6.45, label: "UPPERCUT", rate: 1.12, tier: 1 },
  { id: "short-hook", start: 6.8, end: 7.9, impact: 7.5, label: "SHORT HOOK", rate: 1.08, tier: 1 },
  { id: "elbow-jab", start: 7.9, end: 9.0, impact: 8.6, label: "ELBOW", rate: 1.1, tier: 1 },
  { id: "low-kick", start: 10.2, end: 11.4, impact: 11.0, label: "LOW KICK", rate: 1.1, tier: 1 },
  { id: "teep", start: 11.4, end: 12.5, impact: 12.1, label: "PUSH KICK", rate: 1.18, tier: 1 },
  { id: "counter-jab", start: 30.4, end: 31.5, impact: 31.1, label: "COUNTER", rate: 1.08, tier: 1 },

  // Tier 2 — kickboxing and travel across the ring (block B).
  { id: "combo-a", start: 0.4, end: 2.3, impact: 1.7, label: "COMBINATION", rate: 1.0, tier: 2 },
  { id: "combo-b", start: 5.4, end: 7.4, impact: 6.7, label: "1-2-3 COMBO", rate: 1.02, tier: 2 },
  { id: "ring-rush", start: 10.1, end: 12.2, impact: 11.6, label: "RING RUSH", rate: 1.0, tier: 2 },
  { id: "rope-run", start: 12.2, end: 14.3, impact: 13.7, label: "ROPE RUN", rate: 1.0, tier: 2 },
  {
    id: "spinning-kick",
    start: 14.3,
    end: 16.4,
    impact: 15.7,
    label: "SPINNING KICK",
    rate: 1.02,
    tier: 2,
  },
  { id: "high-kick", start: 16.4, end: 18.3, impact: 17.6, label: "HIGH KICK", rate: 1.04, tier: 2 },
  {
    id: "corner-combo",
    start: 18.3,
    end: 20.0,
    impact: 19.4,
    label: "CORNER COMBO",
    rate: 1.0,
    tier: 2,
  },
  {
    id: "counter",
    start: 31.5,
    end: 33.4,
    impact: 32.8,
    label: "COUNTER KICK",
    rate: 1.0,
    tier: 2,
  },

  // Tier 3 — clinch, knees, mat work.
  {
    id: "grapple-a",
    start: 2.3,
    end: 4.5,
    impact: 3.9,
    label: "CLINCH KNEES",
    rate: 0.94,
    tier: 3,
  },
  { id: "grapple-b", start: 7.6, end: 9.9, impact: 9.2, label: "TAKEDOWN", rate: 0.92, tier: 3 },
  {
    id: "corner-drive",
    start: 17.6,
    end: 20.0,
    impact: 19.2,
    label: "CORNER DRIVE",
    rate: 0.94,
    tier: 3,
  },
  {
    id: "turnbuckle",
    start: 20.3,
    end: 22.6,
    impact: 21.9,
    label: "TURNBUCKLE SMASH",
    rate: 0.94,
    tier: 3,
  },
  {
    id: "mat-work",
    start: 26.0,
    end: 28.4,
    impact: 27.6,
    label: "MAT TAKEDOWN",
    rate: 0.92,
    tier: 3,
  },
  { id: "dropkick", start: 33.4, end: 35.6, impact: 34.9, label: "DROPKICK", rate: 0.96, tier: 3 },

  // Tier 4 — rope attacks, throws, out-of-the-ring spots.
  {
    id: "rope-climb",
    start: 20.4,
    end: 23.4,
    impact: 22.7,
    label: "CORNER CLIMB",
    rate: 0.9,
    tier: 4,
  },
  { id: "rope-jump", start: 22.4, end: 25.4, impact: 24.6, label: "ROPE JUMP", rate: 0.88, tier: 4 },
  {
    id: "rope-attack",
    start: 24.6,
    end: 27.6,
    impact: 26.4,
    label: "ROPE ATTACK",
    rate: 0.9,
    tier: 4,
  },
  { id: "slam-a", start: 30.4, end: 33.3, impact: 32.6, label: "BODY SLAM", rate: 0.9, tier: 4 },
  { id: "slam-b", start: 32.6, end: 35.6, impact: 34.8, label: "POWERSLAM", rate: 0.88, tier: 4 },
  {
    id: "corner-run",
    start: 12.4,
    end: 15.5,
    impact: 14.7,
    label: "CORNER RUSH",
    rate: 0.9,
    tier: 4,
  },
  {
    id: "ring-throw",
    start: 36.4,
    end: 39.4,
    impact: 38.4,
    label: "THROWN OUT OF THE RING",
    rate: 0.88,
    tier: 4,
  },

  // Rope work — contact with the mesh, being pushed off the ropes, rebound
  // jumps and turns, so the action leaves the centre of the ring.
  { id: "rope-press", start: 12.6, end: 14.4, impact: 13.6, label: "PRESSED ON THE ROPES", rate: 0.96, tier: 2 },
  { id: "rope-whip", start: 13.2, end: 15.2, impact: 14.5, label: "ROPE WHIP", rate: 1.0, tier: 2 },
  { id: "rope-rebound", start: 15.2, end: 17.2, impact: 16.4, label: "ROPE REBOUND", rate: 1.02, tier: 2 },
  { id: "rope-shoulder", start: 18.4, end: 20.0, impact: 19.5, label: "ROPE SHOULDER CHARGE", rate: 0.98, tier: 3 },
  { id: "rope-spin", start: 20.6, end: 22.8, impact: 22.0, label: "ROPE SPIN OUT", rate: 0.94, tier: 3 },
  { id: "rope-vault", start: 23.2, end: 25.6, impact: 24.8, label: "ROPE VAULT", rate: 0.9, tier: 4 },

  // Restored strike/jump vocabulary — windows that had dropped out of rotation
  // over the last revisions, spread across all four blocks of the reel.
  { id: "overhand", start: 4.2, end: 5.4, impact: 5.0, label: "OVERHAND RIGHT", rate: 1.1, tier: 1 },
  { id: "shoulder-bump", start: 9.0, end: 10.2, impact: 9.8, label: "SHOULDER BUMP", rate: 1.06, tier: 1 },
  { id: "knee-strike", start: 17.0, end: 18.4, impact: 18.0, label: "FLYING KNEE", rate: 1.0, tier: 2 },
  { id: "jump-kick", start: 15.6, end: 17.4, impact: 16.8, label: "JUMP KICK", rate: 1.0, tier: 2 },
  { id: "headbutt", start: 6.2, end: 7.8, impact: 7.3, label: "HEADBUTT", rate: 1.0, tier: 2 },
  { id: "corner-splash", start: 19.0, end: 21.0, impact: 20.4, label: "CORNER SPLASH", rate: 0.96, tier: 3 },
  { id: "suplex", start: 28.2, end: 30.4, impact: 29.7, label: "SUPLEX", rate: 0.92, tier: 3 },
  { id: "clothesline", start: 11.0, end: 12.8, impact: 12.3, label: "CLOTHESLINE", rate: 0.98, tier: 3 },
  { id: "gut-wrench", start: 33.0, end: 35.2, impact: 34.5, label: "GUT WRENCH", rate: 0.92, tier: 3 },
  { id: "fireman-carry", start: 29.6, end: 32.4, impact: 31.7, label: "CARRY ACROSS THE RING", rate: 0.88, tier: 4 },
  { id: "top-rope-splash", start: 21.0, end: 24.0, impact: 23.3, label: "TOP-ROPE SPLASH", rate: 0.88, tier: 4 },
  { id: "moonsault", start: 24.0, end: 26.8, impact: 26.0, label: "MOONSAULT", rate: 0.86, tier: 4 },
  { id: "double-toss", start: 35.0, end: 38.2, impact: 37.2, label: "DOUBLE TOSS", rate: 0.86, tier: 5 },
  { id: "mat-finisher", start: 25.4, end: 29.2, impact: 28.3, label: "MAT FINISHER", rate: 0.84, tier: 5 },

  // Tier 5 — finishers.

  {
    id: "powerbomb-a",
    start: 34.2,
    end: 37.8,
    impact: 36.8,
    label: "POWERBOMB",
    rate: 0.86,
    tier: 5,
  },
  {
    id: "finisher-a",
    start: 14.0,
    end: 17.6,
    impact: 16.6,
    label: "SPINNING FINISHER",
    rate: 0.86,
    tier: 5,
  },
  {
    id: "rope-finisher",
    start: 21.4,
    end: 25.2,
    impact: 24.3,
    label: "TOP-ROPE FINISHER",
    rate: 0.84,
    tier: 5,
  },
  {
    id: "throw-finisher",
    start: 31.6,
    end: 35.4,
    impact: 34.4,
    label: "THROW FINISHER",
    rate: 0.84,
    tier: 5,
  },
  { id: "finisher", start: 35.6, end: 39.6, impact: 38.2, label: "FINISHER", rate: 0.84, tier: 5 },
];

/**
 * Follow-up spots played while the opponent is already down: corner climbs,
 * dives from the ropes and throws — all taken from the ground/power blocks.
 */
const FOLLOW_UPS: Move[] = [
  {
    id: "fu-splash-a",
    start: 22.8,
    end: 25.8,
    impact: 25.0,
    label: "SPLASH ON THE MAT",
    rate: 0.88,
    tier: 4,
  },
  { id: "fu-stomp", start: 25.8, end: 28.0, impact: 27.3, label: "SOCCER KICK", rate: 0.92, tier: 3 },
  {
    id: "fu-elbow-a",
    start: 26.4,
    end: 29.4,
    impact: 28.6,
    label: "ELBOW DROP",
    rate: 0.88,
    tier: 4,
  },
  {
    id: "fu-corner-a",
    start: 20.3,
    end: 23.3,
    impact: 22.5,
    label: "CORNER CLIMB",
    rate: 0.86,
    tier: 4,
  },
  { id: "fu-rope-a", start: 21.8, end: 24.9, impact: 24.1, label: "ROPE DIVE", rate: 0.86, tier: 4 },
  { id: "fu-legdrop", start: 27.0, end: 29.8, impact: 29.0, label: "LEG DROP", rate: 0.9, tier: 3 },
  {
    id: "fu-ground-a",
    start: 24.2,
    end: 27.2,
    impact: 26.3,
    label: "GROUND AND POUND",
    rate: 0.88,
    tier: 3,
  },
  {
    id: "fu-toss",
    start: 36.2,
    end: 39.6,
    impact: 38.6,
    label: "TOSS OVER THE ROPES",
    rate: 0.86,
    tier: 4,
  },
  {
    id: "fu-moonsault",
    start: 21.2,
    end: 24.6,
    impact: 23.8,
    label: "MOONSAULT",
    rate: 0.84,
    tier: 4,
  },
  {
    id: "fu-finisher-a",
    start: 33.8,
    end: 37.4,
    impact: 36.4,
    label: "FOLLOW-UP FINISHER",
    rate: 0.84,
    tier: 5,
  },
];

/** Victory pose: the winner stands over the ring with both hands raised. */
const CHAMPION_POSE = { start: 28.6, end: 30.1, rate: 0.7 };

const GIFT_TIER: Record<string, number> = {
  rose: 1,
  donut: 2,
  tiktok: 3,
  gift: 4,
  rocket: 5,
};

/**
 * Each gift reads as a specific kind of blow, delivered by the fighter the gift
 * was sent to: a rose is a strike, a rocket ends with a throw.
 */
const GIFT_KIND: Record<string, HitKind[]> = {
  rose: ["punch"],
  donut: ["kick", "punch"],
  tiktok: ["grapple", "kick"],
  gift: ["aerial", "grapple"],
  rocket: ["throw", "aerial"],
};

/**
 * Feeling-out scenarios played when nobody is sending gifts. Deliberately many,
 * so the idle fight keeps travelling across the ring instead of looping the
 * same two or three windows.
 */
const IDLE_SCENES: Array<{ start: number; end: number; rate: number }> = [
  { start: 0.2, end: 2.4, rate: 0.8 },
  { start: 1.4, end: 3.6, rate: 0.78 },
  { start: 2.2, end: 4.6, rate: 0.75 },
  { start: 3.4, end: 5.6, rate: 0.82 },
  { start: 4.4, end: 6.8, rate: 0.8 },
  { start: 5.6, end: 7.8, rate: 0.76 },
  { start: 6.6, end: 9.0, rate: 0.75 },
  { start: 8.0, end: 10.1, rate: 0.8 },
  { start: 10.2, end: 12.6, rate: 0.82 },
  { start: 11.4, end: 13.6, rate: 0.8 },
  { start: 12.4, end: 14.8, rate: 0.78 },
  { start: 13.8, end: 16.0, rate: 0.76 },
  { start: 15.0, end: 17.4, rate: 0.8 },
  { start: 16.2, end: 18.6, rate: 0.78 },
  { start: 17.2, end: 19.8, rate: 0.76 },
  { start: 18.6, end: 20.6, rate: 0.8 },
  { start: 20.4, end: 22.6, rate: 0.74 },
  { start: 21.6, end: 23.8, rate: 0.76 },
  { start: 23.0, end: 25.2, rate: 0.78 },
  { start: 24.6, end: 26.8, rate: 0.74 },
  { start: 26.6, end: 29.4, rate: 0.78 },
  { start: 28.2, end: 30.2, rate: 0.76 },
  { start: 30.5, end: 32.8, rate: 0.8 },
  { start: 31.8, end: 34.0, rate: 0.78 },
  { start: 32.6, end: 35.0, rate: 0.76 },
  { start: 34.4, end: 36.6, rate: 0.78 },
  { start: 36.2, end: 38.4, rate: 0.76 },
  { start: 37.4, end: 39.6, rate: 0.8 },
];




type IdleScene = (typeof IDLE_SCENES)[number];

/**
 * Idle scenes rotate least-recently-used as well: every feeling-out window is
 * shown before any of them comes back, so the fight never loops the same beat.
 */
function drawIdle(
  usage: Map<string, number>,
  recent: string[],
  current: IdleScene,
): IdleScene {
  const blocked = new Set([...recent.slice(-Math.floor(IDLE_SCENES.length / 2)), `${current.start}`]);
  const open = IDLE_SCENES.filter((scene) => !blocked.has(`${scene.start}`));
  const list = open.length > 0 ? open : IDLE_SCENES;
  let best = Infinity;
  for (const scene of list) best = Math.min(best, usage.get(`${scene.start}`) ?? 0);
  const fresh = list.filter((scene) => (usage.get(`${scene.start}`) ?? 0) === best);
  const chosen = fresh[Math.floor(Math.random() * fresh.length)]!;
  usage.set(`${chosen.start}`, (usage.get(`${chosen.start}`) ?? 0) + 1);
  recent.push(`${chosen.start}`);
  if (recent.length > IDLE_SCENES.length) recent.shift();
  return chosen;
}


/**
 * Pool for a gift: the moves whose physical kind matches the gift (rose = a
 * strike, rocket = a throw) at that power tier, widened to the neighbouring
 * tiers so a stream of the same gift still produces different scenes.
 */
function movesForGift(giftId: string, tier: number): Move[] {
  const kinds = GIFT_KIND[giftId];
  const exact = MOVES.filter((move) => move.tier === tier);
  const near = MOVES.filter((move) => Math.abs(move.tier - tier) <= 1);
  const matching = kinds
    ? near.filter((move) => kinds.includes(kindOf(move)))
    : [];
  // Weight: the gift's own kind first, then the exact tier, then the neighbours.
  const pool = [...matching, ...matching, ...exact, ...near];
  return pool.length > 0 ? pool : MOVES;
}


/**
 * Least-recently-used draw: every move in the pool is played before any of them
 * comes back. Recently used ids are skipped outright, and among the rest the
 * ones seen the fewest times win — that is what keeps both the moves and their
 * openings from repeating.
 */
function drawMove(
  pool: Move[],
  recent: string[],
  usage: Map<string, number>,
  cooldowns?: Map<string, number>,
  cooldownMs = 0,
): Move {
  const unique = Array.from(new Map(pool.map((move) => [move.id, move])).values());
  // Never block more than half the pool, otherwise the filter empties out.
  const blocked = new Set(recent.slice(-Math.floor(unique.length / 2)));
  const now = performance.now();
  let open = unique.filter((move) => !blocked.has(move.id));
  if (cooldowns && cooldownMs > 0) {
    const cool = open.filter((move) => now - (cooldowns.get(move.id) ?? -Infinity) >= cooldownMs);
    if (cool.length > 0) open = cool;
  }
  const list = open.length > 0 ? open : unique;
  let best = Infinity;
  for (const move of list) best = Math.min(best, usage.get(move.id) ?? 0);
  const fresh = list.filter((move) => (usage.get(move.id) ?? 0) === best);
  const chosen = fresh[Math.floor(Math.random() * fresh.length)]!;
  usage.set(chosen.id, (usage.get(chosen.id) ?? 0) + 1);
  cooldowns?.set(chosen.id, now);
  return chosen;
}

/**
 * Varied entry: start a touch before the scripted window when there is room, so
 * the same move does not always open on the identical frame.
 */
function entryOf(move: Move, jitter = 1): number {
  const room = Math.min(0.32, Math.max(0, move.start - 0.15)) * Math.max(0, Math.min(1, jitter));
  return move.start - Math.random() * room;
}


type FloatItem = { id: string; emoji: string; side: Side; left: number };
type DamageItem = { id: string; side: Side; amount: number };

type Props = {
  lang: Lang;
  /** Pace preset: speed, move frequency and anti-repetition memory. */
  difficulty?: Difficulty;
  /** Referee anti-repetition tuning: cooldown, LRU rotation, entry variation. */
  variety?: VarietyConfig;

  events: GiftEvent[];
  ko: Side | null;
  combo: number;
  comboSide: Side | null;
  /** True while the referee is counting — the sequence holds on the mat. */
  paused?: boolean;
  /** The ten-count is finished, so the knockout headline is official. */
  koConfirmed?: boolean;
  /** Real-time trace of triggered moves, impacts, KO and replay. */
  onLog?: (kind: "move" | "impact" | "ko" | "replay", text: string) => void;
};

export function Arena({
  lang,
  difficulty = "normal",
  variety = VARIETY_DEFAULT,
  events,
  ko,
  combo,
  comboSide,
  paused = false,
  koConfirmed = true,
  onLog,
}: Props) {
  const logRef = useRef(onLog);
  logRef.current = onLog;
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([null, null]);
  const activeLayerRef = useRef(0);
  const activeVideoRef = useRef<HTMLVideoElement | null>(null);
  const switchingRef = useRef(false);
  const switchTokenRef = useRef(0);
  const seen = useRef<Set<string>>(new Set());
  const queue = useRef<GiftEvent[]>([]);
  const playing = useRef(false);
  const stopAt = useRef(0);
  const impactAt = useRef(0);
  const impacted = useRef(false);
  /** True while a spot is playing out its aftermath (landing, struggle). */
  const settling = useRef(false);
  /**
   * Animation lock. While it is held no new command — gift, idle scene, camera
   * change or KO replay — may cut the current sequence. It is released only
   * after the move, its impact, the landing and the recovery have all played.
   */
  const lockUntil = useRef(0);
  const isLocked = () =>
    playing.current || settling.current || switchingRef.current || performance.now() < lockUntil.current;


  const currentEvent = useRef<GiftEvent | null>(null);
  const currentMove = useRef<Move | null>(null);
  const recentMoves = useRef<string[]>([]);
  const recentFollows = useRef<string[]>([]);
  /** How often each move/follow-up has been played — drives the LRU rotation. */
  const moveUsage = useRef<Map<string, number>>(new Map());
  const followUsage = useRef<Map<string, number>>(new Map());
  const idleScene = useRef(IDLE_SCENES[0]!);
  /** LRU memory of the feeling-out scenes, so none of them repeats early. */
  const idleUsage = useRef<Map<string, number>>(new Map());
  const recentIdle = useRef<string[]>([]);

  const follow = useRef<{ event: GiftEvent; move: Move } | null>(null);
  const primed = useRef(false);
  /** A KO may be scored during a move, but its replay must never cut that move. */
  const handledKo = useRef<Side | null>(null);
  const pendingKo = useRef<Side | null>(null);

  const varietyRef = useRef(variety);
  varietyRef.current = variety;
  /** Last time each move was played — drives the referee cooldown control. */
  const moveCooldowns = useRef<Map<string, number>>(new Map());
  const followCooldowns = useRef<Map<string, number>>(new Map());

  const cfg = DIFFICULTY_CONFIG[difficulty];
  const cfgRef = useRef(cfg);
  cfgRef.current = cfg;

  // Low-power phones: skip the per-hit colour grading repaint, which is the
  // most expensive effect during a fast exchange.
  const [lite, setLite] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cores = navigator.hardwareConcurrency ?? 8;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    setLite(reduced || cores <= 4 || (coarse && window.innerWidth < 480));
  }, []);

  // Stop decoding frames while the tab is in the background.
  useEffect(() => {
    const onVisibility = () => {
      const video = activeVideoRef.current;
      if (!video) return;
      if (document.hidden) video.pause();
      else void video.play();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const [attacker, setAttacker] = useState<Side>("us");
  const [activeLayer, setActiveLayer] = useState(0);
  const [crowd, setCrowd] = useState(0);
  const [replay, setReplay] = useState(false);
  const [champion, setChampion] = useState(false);
  const [completedSequences, setCompletedSequences] = useState(0);
  const [impact, setImpact] = useState<{ id: string; side: Side; label: string } | null>(null);
  const [floats, setFloats] = useState<FloatItem[]>([]);
  /** Current camera framing: where in the ring the action sits. */
  const [frame, setFrame] = useState<Frame>({ x: 0, y: 0, scale: 1, rotate: 0 });
  /** Which phase of the current spot the camera is blending towards. */
  const [phase, setPhase] = useState<Phase>("idle");
  /** Physical reaction to the last landed hit (drives the shake/stagger). */
  const [reaction, setReaction] = useState<
    { id: string; kind: HitKind; dir: number; force: number; stun: number } | null
  >(null);
  /** Hit kind that scored the knockout — drives how long the KO reaction holds. */
  const koKind = useRef<HitKind>("throw");
  /** Base framing of the current spot; impact and mat-work move relative to it. */
  const baseFrame = useRef<Frame>({ x: 0, y: 0, scale: 1, rotate: 0 });

  const [damages, setDamages] = useState<DamageItem[]>([]);
  /** Impact sparks: count and spread scale with the force of the hit. */
  const [sparks, setSparks] = useState<
    { id: string; side: Side; force: number; life: number; count: number }[]
  >([]);
  /** Instant-replay panel shown after the count is confirmed. */
  const [showReplayPanel, setShowReplayPanel] = useState(false);
  const koReplayRef = useRef<(() => void) | null>(null);

  // Slow "breathing" of the wide shot between spots: the camera keeps living
  // without ever cutting in close. Only the video layer moves — the scoreboard
  // and the top bar sit outside this transform, so the HUD never shifts.
  useEffect(() => {
    if (ko) return;
    const timer = window.setInterval(() => {
      if (playing.current || settling.current) return;
      const shot = baseFrame.current;
      const drift = clampFrame({
        x: shot.x + (Math.random() - 0.5) * 1.6,
        y: shot.y + (Math.random() - 0.5) * 0.6,
        scale: shot.scale + (Math.random() - 0.5) * 0.012,
        rotate: shot.rotate + (Math.random() - 0.5) * 0.25,
      });
      baseFrame.current = drift;
      setPhase("idle");
      setFrame(drift);
    }, 3800);
    return () => window.clearInterval(timer);
  }, [ko]);

  const t = UI_TEXT[lang];
  const names = SIDE_NAME[lang];

  const seek = (video: HTMLVideoElement, time: number) => {
    video.currentTime = time;
  };

  /**
   * Decode the next scene off-screen before replacing the visible frame.
   * `force` is reserved for sequences that own the lock (a move start, the KO
   * replay); every other call is refused while the lock is held.
   */
  const switchScene = (time: number, rate: number, force = false) => {
    if (!force && isLocked()) return false;
    const previous = activeVideoRef.current;
    const nextLayer = activeLayerRef.current === 0 ? 1 : 0;
    const next = videoRefs.current[nextLayer];
    if (!next || switchingRef.current) return false;


    switchingRef.current = true;
    const token = ++switchTokenRef.current;
    next.pause();
    next.playbackRate = rate;
    const reveal = () => {
      if (token !== switchTokenRef.current) return;
      void next.play().then(() => {
        if (token !== switchTokenRef.current) return;
        activeLayerRef.current = nextLayer;
        activeVideoRef.current = next;
        setActiveLayer(nextLayer);
        switchingRef.current = false;
        window.setTimeout(() => {
          if (previous && previous !== activeVideoRef.current) previous.pause();
        }, 180);
      }).catch(() => {
        switchingRef.current = false;
      });
    };
    next.addEventListener("seeked", reveal, { once: true });
    seek(next, time);
    return true;
  };

  /** Crowd reaction pulse, synced to hits and knockouts. */
  const cheer = (strength: number) => {
    setCrowd(strength);
    window.setTimeout(() => setCrowd(0), strength > 1 ? 2200 : 700);
  };

  // While the referee counts, the picture holds on the downed fighter.
  useEffect(() => {
    const video = activeVideoRef.current;
    if (!video || ko) return;
    if (paused) video.pause();
    else if (playing.current) void video.play();
  }, [paused, ko]);

  useEffect(() => {
    if (!primed.current) {
      if (events.length === 0) return;
      for (const event of events) seen.current.add(event.id);
      primed.current = true;
      return;
    }
    const fresh: GiftEvent[] = [];
    for (const event of events) {
      if (seen.current.has(event.id)) continue;
      seen.current.add(event.id);
      fresh.push(event);
    }
    queue.current.push(...fresh.slice(-5));
  }, [events]);

  // Knockout: finish the active move first, then replay the finish in slow motion.
  // This prevents a gift that reaches zero HP from cutting a lift, throw or fall.
  useEffect(() => {
    if (!ko) {
      handledKo.current = null;
      pendingKo.current = null;
      setShowReplayPanel(false);
      koReplayRef.current = null;
      // Smooth return to live speed after the slow-motion finish.
      const video = activeVideoRef.current;
      if (video && video.playbackRate < 0.95) {
        const ramp = window.setInterval(() => {
          const target = activeVideoRef.current;
          if (!target) return window.clearInterval(ramp);
          const next = Math.min(1, target.playbackRate + 0.08);
          target.playbackRate = next;
          if (next >= 1) window.clearInterval(ramp);
        }, 70);
      }
      return;
    }
    if (handledKo.current === ko) return;
    // Never cut a move: wait until the animation lock is fully released.
    if (isLocked()) {
      pendingKo.current = ko;
      return;
    }
    const video = activeVideoRef.current;
    if (!video) return;
    handledKo.current = ko;
    pendingKo.current = null;
    playing.current = false;
    settling.current = false;

    currentEvent.current = null;
    currentMove.current = null;
    const finisher = MOVES.find((move) => move.id === "finisher");
    if (!finisher) return;
    cheer(2);
    setReplay(true);
    // KO reads heaviest of all: full loss of balance, then the shot settles.
    setFrame({ x: 0, y: 0.5, scale: 1.02, rotate: 0 });
    const koProfile = HIT_PROFILE[koKind.current];
    setReaction({
      id: `ko-${ko}`,
      kind: koKind.current,
      dir: ko === "ru" ? 1 : -1,
      // A finishing blow always reads heavier than the same hit mid-match.
      force: koProfile.force * 1.25,
      stun: koProfile.koHold,
    });
    window.setTimeout(() => setReaction(null), koProfile.koHold);

    logRef.current?.("ko", `KO — ${ko === "ru" ? names.us : names.ru} down`);
    logRef.current?.("replay", "slow-motion replay");

    // Replay: rewind slightly before the finish and play it back in slow motion.
    video.playbackRate = 0.45;
    switchScene(Math.max(0, finisher.impact - 1.2), 0.45, true);

    // Instant replay of the finish, re-runnable from the panel below.
    const runReplay = () => {
      setShowReplayPanel(false);
      setReplay(true);
      logRef.current?.("replay", "instant replay");
      switchScene(Math.max(0, finisher.impact - 1.2), 0.4, true);
      window.setTimeout(() => {
        setReplay(false);
        // Return to the champion shot in the very same camera framing.
        switchScene(CHAMPION_POSE.start, CHAMPION_POSE.rate, true);
        setShowReplayPanel(true);
      }, 3400);
    };
    koReplayRef.current = runReplay;

    let pose = 0;
    let panel = 0;
    const settle = window.setTimeout(() => {
      setReplay(false);
      switchScene(finisher.impact, 0.35, true);
      window.setTimeout(() => activeVideoRef.current?.pause(), 900);

      // The winner then walks the ring with both hands raised.
      pose = window.setTimeout(() => {
        setChampion(true);
        switchScene(CHAMPION_POSE.start, CHAMPION_POSE.rate, true);
        cheer(2);
        logRef.current?.("ko", `champion pose — ${ko === "ru" ? names.ru : names.us}`);
        panel = window.setTimeout(() => setShowReplayPanel(true), 900);
      }, 2600);
    }, 2500);
    return () => {
      window.clearTimeout(settle);
      window.clearTimeout(pose);
      window.clearTimeout(panel);
      setChampion(false);
      setShowReplayPanel(false);
    };
  }, [ko, completedSequences, names.ru, names.us]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const video = activeVideoRef.current;
      if (!video || ko) return;
      // Animation lock: no new command while a sequence is still running.
      if (isLocked()) return;
      // Lock released and a KO is waiting: hand control to the replay sequence.
      if (pendingKo.current) {
        setCompletedSequences((value) => value + 1);
        return;
      }

      // Feeling-out phase: rotate through different idle scenarios.
      const scene = idleScene.current;
      if (video.paused || video.currentTime < scene.start || video.currentTime > scene.end) {
        if (video.currentTime < scene.start || video.currentTime > scene.end) {
          idleScene.current = drawIdle(idleUsage.current, recentIdle.current, idleScene.current);
          switchScene(idleScene.current.start, idleScene.current.rate * cfgRef.current.speed);
          return;
        }

        video.playbackRate = idleScene.current.rate * cfgRef.current.speed;
        void video.play();
      }

      // A big spot leaves the opponent flat on the mat — chain corner climbs and
      // dives onto the downed fighter before taking new gifts.
      if (paused) return;
      const pendingFollow = follow.current;
      const event = pendingFollow ? pendingFollow.event : queue.current.shift();
      if (!event) return;
      follow.current = null;

      const tier = GIFT_TIER[event.gift] ?? 1;
      const move = pendingFollow
        ? pendingFollow.move
        : drawMove(
            movesForGift(event.gift, tier),
            recentMoves.current,
            moveUsage.current,
            moveCooldowns.current,
            varietyRef.current.cooldownMs,
          );

      recentMoves.current = [...recentMoves.current, move.id].slice(
        -Math.max(cfgRef.current.moveMemory, varietyRef.current.rotation),
      );

      // Chance of a follow-up: high after a big spot, still possible after a
      // chained one so we get 2-3 spot sequences without visible repetition.
      const base = pendingFollow ? 0.4 : tier >= 4 ? 0.85 : tier === 3 ? 0.55 : 0.15;
      const chance = Math.min(0.95, base * cfgRef.current.followChance);
      if (Math.random() < chance) {
        const next = drawMove(
          FOLLOW_UPS,
          recentFollows.current,
          followUsage.current,
          followCooldowns.current,
          varietyRef.current.cooldownMs * 0.5,
        );
        recentFollows.current = [...recentFollows.current, next.id].slice(
          -cfgRef.current.followMemory,
        );
        follow.current = {
          event: { ...event, id: `${event.id}-fu${Math.random().toString(36).slice(2, 6)}` },
          move: next,
        };
      }

      const gift = GIFT_BY_ID[event.gift];

      currentEvent.current = event;
      currentMove.current = move;
      playing.current = true;
      impacted.current = false;
      settling.current = false;
      stopAt.current = move.end;
      const entry = entryOf(move, varietyRef.current.entryJitter);
      // Hold the lock for at least the length of this move at its playback rate,
      // so nothing can cut the scene before it has played out.
      lockUntil.current =
        performance.now() + ((move.end - entry) / (move.rate * cfgRef.current.speed)) * 1000;

      impactAt.current = move.impact;
      setAttacker(event.side);
      setFloats((previous) => [
        ...previous.slice(-3),
        {
          id: event.id,
          emoji: gift?.emoji ?? "🌹",
          side: event.side,
          left: event.side === "ru" ? 8 + Math.random() * 22 : 70 + Math.random() * 20,
        },
      ]);

      logRef.current?.("move", `${event.side.toUpperCase()} · ${move.label}`);
      // Move the wide shot to this block's corner of the ring.
      const shot = frameFor(move);
      baseFrame.current = shot;
      setPhase("windup");
      setFrame(clampFrame(shot));
      switchScene(entry, move.rate * cfgRef.current.speed, true);

    }, cfg.tickMs);
    return () => window.clearInterval(timer);
  }, [ko, paused, cfg.tickMs]);

  const handleTimeUpdate = (video: HTMLVideoElement) => {
    if (video !== activeVideoRef.current) return;
    const event = currentEvent.current;
    const move = currentMove.current;
    if (!video || !event || !move || !playing.current) return;

    if (!impacted.current && video.currentTime >= impactAt.current) {
      logRef.current?.("impact", `${move.label} connects`);
      impacted.current = true;
      const defender: Side = event.side === "ru" ? "us" : "ru";
      const gift = GIFT_BY_ID[event.gift];
      const kind = kindOf(move);
      const profile = HIT_PROFILE[kind];
      koKind.current = kind;
      setImpact({ id: event.id, side: defender, label: move.label });
      // Distinct physical read per hit type: jitter for punches, a step back for
      // kicks, loss of balance for throws and aerials, then a recovery.
      setReaction({
        id: event.id,
        kind,
        dir: defender === "ru" ? -1 : 1,
        force: profile.force,
        stun: profile.stun,
      });
      window.setTimeout(
        () => setReaction((previous) => (previous?.id === event.id ? null : previous)),
        profile.stun,
      );
      cheer(profile.cheer * (move.tier >= 4 ? 1.15 : 1));
      // Dynamic camera: a light push-in on contact, drifting towards the hit.
      setPhase("impact");
      const shot = baseFrame.current;
      // Micro-impulse only: a very short nudge and push-in at the moment of
      // contact, then straight back to the base shot so the blending stays
      // smooth and the picture never wobbles.
      setFrame(
        clampFrame({
          x: shot.x + (defender === "ru" ? -0.5 : 0.5) * profile.force,
          y: shot.y + profile.impactZoom * 3,
          scale: shot.scale + profile.impactZoom * 0.45,
          rotate: shot.rotate + (defender === "ru" ? -0.12 : 0.12),
        }),
      );
      window.setTimeout(() => {
        if (playing.current) setFrame(clampFrame(baseFrame.current));
      }, 190);
      // Sparks live exactly as long as the stun plus the landing/recovery beat.
      const sparkLife = Math.round(profile.stun + profile.recovery * 520);
      const burst = {
        id: event.id,
        side: defender,
        force: profile.force,
        life: sparkLife,
        count: Math.round(8 + profile.force * 10 + move.tier * 2),
      };
      if (!lite) {
        setSparks((previous) => [...previous.slice(-2), burst]);
        window.setTimeout(
          () => setSparks((previous) => previous.filter((item) => item.id !== burst.id)),
          sparkLife,
        );
      }
      setDamages((previous) => [
        ...previous.slice(-1),
        { id: event.id, side: defender, amount: gift?.damage ?? 4 },
      ]);
      window.setTimeout(() => setImpact(null), 600);
      window.setTimeout(
        () => setDamages((previous) => previous.filter((item) => item.id !== event.id)),
        900,
      );
    }


    if (video.currentTime >= stopAt.current) {
      // A lift, slam or throw is never cut in the middle: after the impact the
      // sequence keeps rolling forward — the landing, the struggle on the mat and
      // the recovery — before anything else can start.
      if (!settling.current) {
        const profile = HIT_PROFILE[kindOf(move)];
        const settleRate = Math.max(0.55, move.rate * cfgRef.current.speed * profile.settleRate);
        const limit = Math.min(39.8, move.end + profile.recovery);
        if (limit > video.currentTime + 0.1) {
          settling.current = true;
          stopAt.current = limit;
          lockUntil.current = performance.now() + ((limit - video.currentTime) / settleRate) * 1000;
          // Camera follows the slam down to the mat: tilt down, a touch nearer.
          setPhase("landing");
          const shot = baseFrame.current;
          setFrame(
            clampFrame({
              x: shot.x * 0.6,
              y: shot.y + profile.matY,
              scale: shot.scale + profile.matZoom,
              rotate: shot.rotate * 0.4,
            }),
          );
          // Slightly slower so the landing and the struggle read clearly.
          video.playbackRate = settleRate;
          void video.play();
          return;
        }
      }

      settling.current = false;
      playing.current = false;
      currentEvent.current = null;
      currentMove.current = null;
      // Short breath after the recovery, unless a KO is waiting to be replayed.
      lockUntil.current = pendingKo.current ? 0 : performance.now() + 350;
      // Wake the deferred-KO effect only after the complete landing/recovery.
      if (pendingKo.current) setCompletedSequences((value) => value + 1);
      idleScene.current = drawIdle(idleUsage.current, recentIdle.current, idleScene.current);

      // Between spots the fighters keep circling: drift the framing back.
      // Recovery: the camera eases out of the mat framing first, then drifts on
      // into the next resting shot — no snap between the two.
      const from = baseFrame.current;
      setPhase("recovery");
      setFrame(clampFrame({ x: from.x * 0.5, y: from.y * 0.4, scale: 1 + (from.scale - 1) * 0.35, rotate: from.rotate * 0.3 }));
      const rest = clampFrame({
        x: (Math.random() - 0.5) * 5,
        y: (Math.random() - 0.5) * 1.5,
        scale: 1 + (Math.random() - 0.5) * 0.03,
        rotate: (Math.random() - 0.5) * 0.8,
      });
      baseFrame.current = rest;
      window.setTimeout(() => {
        setPhase("idle");
        setFrame(rest);
      }, 620);
      switchScene(idleScene.current.start, idleScene.current.rate * cfgRef.current.speed, true);

      window.setTimeout(
        () => setFloats((previous) => previous.filter((item) => item.id !== event.id)),
        900,
      );
    }

  };

  const reactionClass =
    !reaction || lite
      ? ""
      : reaction.kind === "punch"
        ? "animate-hit-punch"
        : reaction.kind === "kick"
          ? "animate-hit-kick"
          : reaction.kind === "grapple"
            ? "animate-hit-grapple"
            : "animate-hit-heavy";

  return (
    <div className="absolute inset-0 overflow-hidden bg-background">
      {/* Framing layer: shifts the wide shot around the ring (left/right,
          nearer/further, slight tilt) so the action never stays pinned. */}
      <div
        className="absolute inset-0 transition-transform will-change-transform"
        style={{
          transform: `translate3d(${frame.x}%, ${frame.y}%, 0) scale(${frame.scale}) rotate(${frame.rotate}deg)`,
          transitionDuration: `${PHASE_BLEND[phase].camera}ms`,
          transitionTimingFunction: PHASE_BLEND[phase].ease,
        }}
      >
        {/* Reaction layer: per-hit physical response (jitter, step back, loss of
            balance, recovery). */}
        <div
          className={`absolute inset-0 ${reactionClass}`}
          style={{
            ["--hit-dir" as string]: String(reaction?.dir ?? 1),
            ["--hit-force" as string]: String(reaction?.force ?? 1),
            ...(reaction ? { animationDuration: `${reaction.stun}ms` } : {}),
          }}
        >
          {[0, 1].map((layer) => (
            <video
              key={layer}
              ref={(element) => {
                videoRefs.current[layer] = element;
                if (layer === 0 && element && !activeVideoRef.current) {
                  activeVideoRef.current = element;
                }
              }}
              src={FIGHT_VIDEO}
              muted
              autoPlay={layer === 0}
              loop
              playsInline
              preload="auto"
              aria-label={layer === activeLayer ? `${names.ru} versus ${names.us}` : undefined}
              aria-hidden={layer !== activeLayer}
              onLoadedData={(event) => {
                if (layer !== 0) return;
                event.currentTarget.currentTime = IDLE_SCENES[0]!.start;
                event.currentTarget.playbackRate = IDLE_SCENES[0]!.rate * cfgRef.current.speed;
                void event.currentTarget.play();
              }}
              onTimeUpdate={(event) => handleTimeUpdate(event.currentTarget)}
              disablePictureInPicture
              style={{
                filter: lite
                  ? "brightness(1.1) contrast(1.12) saturate(1.08)"
                  : `brightness(${1.08 + crowd * 0.07}) contrast(${1.1 + crowd * 0.06}) saturate(${1.05 + crowd * 0.08})`,
                contain: "paint",
                willChange: lite ? undefined : "filter, opacity",
                opacity: layer === activeLayer ? 1 : 0,
                zIndex: layer === activeLayer ? 1 : 0,
                // Blend between the two decoded layers with the current phase's
                // easing: quick inside a spot, longer between spots.
                transitionDuration: `${PHASE_BLEND[phase].fade}ms`,
                transitionTimingFunction: PHASE_BLEND[phase].ease,
              }}
              className="arena-video absolute inset-0 size-full object-contain object-center transition-[filter,opacity]"
            />
          ))}

          {/* Impact sparks — density and spread follow the force of the hit. */}
          {sparks.map((burst) => (
            <div
              key={burst.id}
              className="spark-burst"
              style={{
                left: burst.side === "ru" ? "38%" : "62%",
                ["--spark-life" as string]: `${burst.life}ms`,
              }}
            >
              {Array.from({ length: burst.count }).map((_, index) => (
                <span
                  key={index}
                  className="spark"
                  style={{
                    ["--a" as string]: `${(index / burst.count) * 360 + Math.random() * 24}deg`,
                    ["--d" as string]: `${(24 + Math.random() * 46) * burst.force}px`,
                    ["--s" as string]: `${(2 + Math.random() * 2.4) * burst.force}px`,
                    animationDelay: `${Math.random() * 90}ms`,
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>


      {/* Impact state remains synchronized for commentary and logs, but visual
          labels and gift particles stay off the ring so both fighters remain
          unobstructed on small screens. */}

      {/* Knockout: nothing covers the ring. The loser stays down on the mat, the
          referee counts to ten, and a small "KNOCKDOWN" tag sits on the side
          opposite the fighter who is down. */}
      {ko && (
        <div
          className={`pointer-events-none absolute top-[26%] z-20 flex max-w-[36vw] flex-col gap-0.5 ${
            ko === "ru"
              ? "left-[3%] items-start text-left"
              : "right-[3%] items-end text-right"
          }`}
        >
          {replay && (
            <div className="display animate-fade-in text-[10px] tracking-widest text-outline opacity-80 sm:text-xs">
              ● REPLAY
            </div>
          )}
          <div className="display animate-fade-in text-base tracking-widest text-gold text-outline sm:text-2xl">
            {t.knockdown.toUpperCase()}
          </div>
          <div className="display text-[10px] text-outline opacity-90 sm:text-sm">
            {ko === "ru" ? names.us : names.ru} — {t.knockedDown}
          </div>
          {champion && koConfirmed && (
            <div className="display animate-fade-in text-xs text-gold text-outline sm:text-lg">
              🏆 {ko === "ru" ? names.ru : names.us}
            </div>
          )}
        </div>
      )}


      {/* Instant replay controls — same camera, no cut away from the ring. */}
      {ko && koConfirmed && showReplayPanel && (
        <div className="absolute inset-x-0 bottom-[12%] z-30 flex animate-fade-in justify-center gap-3">
          <button
            type="button"
            onClick={() => koReplayRef.current?.()}
            className="display rounded-full bg-foreground/10 px-5 py-2 text-sm tracking-widest text-outline backdrop-blur transition hover:bg-foreground/20 sm:text-base"
          >
            ⟲ REPLAY
          </button>
          <button
            type="button"
            onClick={() => {
              setShowReplayPanel(false);
              setReplay(false);
              switchScene(CHAMPION_POSE.start, CHAMPION_POSE.rate, true);
            }}
            className="display rounded-full bg-gold/20 px-5 py-2 text-sm tracking-widest text-gold text-outline backdrop-blur transition hover:bg-gold/30 sm:text-base"
          >
            ▶ LIVE
          </button>
        </div>
      )}
    </div>
  );
}
