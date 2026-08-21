/**
 * The scene catalog of the fight: every window of the 40s master reel that the
 * arena can play, split into gift moves, follow-up spots on the mat and
 * feeling-out (idle) scenarios. Kept in one place so the scheduler, the LRU
 * rotation and the admin panel all work from the same list.
 */

export type Move = {
  id: string;
  start: number;
  end: number;
  impact: number;
  label: string;
  rate: number;
  /** 1 = light strike, 5 = finisher */
  tier: number;
};

export type IdleScene = { id: string; start: number; end: number; rate: number; label: string };

const BASE_MOVES: Move[] = [
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

  // Corner exchanges — the fight is fought in all four corners of the ring,
  // with punches and kicks landing while the opponent is pinned to the pads.
  { id: "corner-nw-jabs", start: 17.8, end: 19.4, impact: 18.8, label: "CORNER JAB BARRAGE", rate: 1.08, tier: 1 },
  { id: "corner-ne-hooks", start: 18.6, end: 20.2, impact: 19.6, label: "CORNER HOOKS", rate: 1.06, tier: 1 },
  { id: "corner-sw-body", start: 19.2, end: 20.9, impact: 20.3, label: "CORNER BODY SHOTS", rate: 1.04, tier: 1 },
  { id: "corner-se-upper", start: 8.2, end: 9.8, impact: 9.3, label: "CORNER UPPERCUT", rate: 1.06, tier: 1 },
  { id: "corner-low-kicks", start: 10.4, end: 12.0, impact: 11.5, label: "CORNER LOW KICK", rate: 1.06, tier: 1 },
  { id: "corner-mid-kick", start: 11.6, end: 13.4, impact: 12.8, label: "CORNER ROUNDHOUSE KICK", rate: 1.02, tier: 2 },
  { id: "corner-high-kick", start: 16.2, end: 18.2, impact: 17.5, label: "CORNER HIGH KICK", rate: 1.02, tier: 2 },
  { id: "corner-side-kick", start: 12.8, end: 14.6, impact: 14.0, label: "CORNER SIDE KICK", rate: 1.04, tier: 2 },
  { id: "corner-flurry", start: 18.0, end: 20.0, impact: 19.3, label: "CORNER PUNCH FLURRY", rate: 1.0, tier: 2 },
  { id: "corner-kick-combo", start: 15.4, end: 17.6, impact: 16.9, label: "CORNER KICK COMBO", rate: 1.0, tier: 2 },
  { id: "corner-pin-knees", start: 19.6, end: 21.6, impact: 20.9, label: "CORNER KNEES", rate: 0.96, tier: 3 },
  { id: "corner-escape-kick", start: 21.2, end: 23.2, impact: 22.5, label: "ESCAPE KICK OUT OF THE CORNER", rate: 0.98, tier: 3 },

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
const BASE_FOLLOW_UPS: Move[] = [
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
export const CHAMPION_POSE = { start: 28.6, end: 30.1, rate: 0.7 };

/**
 * The gift → kind of blow → power mapping is no longer hard-coded: it lives in
 * the admin panel (`/admin`, tab "Lovituri") and is read live through
 * `ruleFor()`, so it can be tuned during a live show without a redeploy.
 */

/**
 * Feeling-out scenarios played when nobody is sending gifts. Deliberately many,
 * so the idle fight keeps travelling across the ring instead of looping the
 * same two or three windows.
 */
const BASE_IDLE: IdleScene[] = [
  { id: "i-b1", start: 0.2, end: 2.4, rate: 0.8, label: "CIRCLING" },
  { id: "i-b2", start: 1.4, end: 3.6, rate: 0.78, label: "FEELING OUT" },
  { id: "i-b3", start: 2.2, end: 4.6, rate: 0.75, label: "JAB RANGE" },
  { id: "i-b4", start: 3.4, end: 5.6, rate: 0.82, label: "SIDE STEP" },
  { id: "i-b5", start: 4.4, end: 6.8, rate: 0.8, label: "GUARD CHECK" },
  { id: "i-b6", start: 5.6, end: 7.8, rate: 0.76, label: "CLINCH BREAK" },
  { id: "i-b7", start: 6.6, end: 9.0, rate: 0.75, label: "PRESSURE" },
  { id: "i-b8", start: 8.0, end: 10.1, rate: 0.8, label: "RING CUT" },
  { id: "i-b9", start: 10.2, end: 12.6, rate: 0.82, label: "FOOTWORK" },
  { id: "i-b10", start: 11.4, end: 13.6, rate: 0.8, label: "SHOULDER FEINT" },
  { id: "i-b11", start: 12.4, end: 14.8, rate: 0.78, label: "ROPE WALK" },
  { id: "i-b12", start: 13.8, end: 16.0, rate: 0.76, label: "CORNER LOOK" },
  { id: "i-b13", start: 15.0, end: 17.4, rate: 0.8, label: "REPOSITION" },
  { id: "i-b14", start: 16.2, end: 18.6, rate: 0.78, label: "BREATH" },
  { id: "i-b15", start: 17.2, end: 19.8, rate: 0.76, label: "MID-RING STARE" },
  { id: "i-b16", start: 18.6, end: 20.6, rate: 0.8, label: "SLIP AND MOVE" },
  { id: "i-b17", start: 20.4, end: 22.6, rate: 0.74, label: "GROUND WATCH" },
  { id: "i-b18", start: 21.6, end: 23.8, rate: 0.76, label: "BACK UP" },
  { id: "i-b19", start: 23.0, end: 25.2, rate: 0.78, label: "RESET CENTRE" },
  { id: "i-b20", start: 24.6, end: 26.8, rate: 0.74, label: "SLOW STALK" },
  { id: "i-b21", start: 26.6, end: 29.4, rate: 0.78, label: "MAT CIRCLE" },
  { id: "i-b22", start: 28.2, end: 30.2, rate: 0.76, label: "POSTURE UP" },
  { id: "i-b23", start: 30.5, end: 32.8, rate: 0.8, label: "POWER STANCE" },
  { id: "i-b24", start: 31.8, end: 34.0, rate: 0.78, label: "SWITCH LEAD" },
  { id: "i-b25", start: 32.6, end: 35.0, rate: 0.76, label: "ROPE LEAN" },
  { id: "i-b26", start: 34.4, end: 36.6, rate: 0.78, label: "SHAKE IT OFF" },
  { id: "i-b27", start: 36.2, end: 38.4, rate: 0.76, label: "LAST LOOK" },
  { id: "i-b28", start: 37.4, end: 39.6, rate: 0.8, label: "REGROUP" },
];

/**
 * Extra vocabulary added on top of the historic list: more travelling around
 * the ring, corner work, rope spots and mat exchanges, so the rotation has
 * enough distinct scenes to never look repetitive.
 */
const EXTRA_MOVES: Move[] = [
  { id: "x-lead-hook", start: 1.0, end: 2.2, impact: 1.9, label: "LEAD HOOK", rate: 1.12, tier: 1 },
  { id: "x-jab-step", start: 2.8, end: 4.0, impact: 3.6, label: "STEP-IN JAB", rate: 1.14, tier: 1 },
  { id: "x-liver", start: 5.0, end: 6.2, impact: 5.9, label: "LIVER SHOT", rate: 1.1, tier: 1 },
  { id: "x-check-hook", start: 7.2, end: 8.4, impact: 8.1, label: "CHECK HOOK", rate: 1.12, tier: 1 },
  { id: "x-backfist", start: 8.4, end: 9.6, impact: 9.2, label: "BACKFIST", rate: 1.08, tier: 1 },
  { id: "x-slap", start: 30.8, end: 31.9, impact: 31.5, label: "OPEN HAND SLAP", rate: 1.12, tier: 1 },
  { id: "x-inside-kick", start: 10.6, end: 11.9, impact: 11.5, label: "INSIDE LOW KICK", rate: 1.1, tier: 1 },
  { id: "x-body-kick", start: 11.9, end: 13.3, impact: 12.9, label: "BODY KICK", rate: 1.04, tier: 2 },
  { id: "x-spin-kick", start: 16.8, end: 18.8, impact: 18.2, label: "SPINNING KICK", rate: 1.0, tier: 2 },
  { id: "x-axe-kick", start: 18.2, end: 19.9, impact: 19.5, label: "AXE KICK", rate: 1.0, tier: 2 },
  { id: "x-knee-clinch", start: 6.0, end: 7.6, impact: 7.2, label: "KNEE IN THE CLINCH", rate: 1.02, tier: 2 },
  { id: "x-corner-trap", start: 13.6, end: 15.4, impact: 14.9, label: "TRAPPED IN THE CORNER", rate: 0.98, tier: 2 },
  { id: "x-collar-tie", start: 9.4, end: 11.0, impact: 10.6, label: "COLLAR TIE", rate: 1.0, tier: 2 },
  { id: "x-push-off", start: 19.6, end: 21.2, impact: 20.8, label: "PUSHED OFF THE ROPES", rate: 1.0, tier: 2 },
  { id: "x-hip-toss", start: 27.2, end: 29.2, impact: 28.6, label: "HIP TOSS", rate: 0.94, tier: 3 },
  { id: "x-arm-drag", start: 22.0, end: 23.8, impact: 23.3, label: "ARM DRAG", rate: 0.96, tier: 3 },
  { id: "x-waist-lock", start: 31.2, end: 33.2, impact: 32.7, label: "WAIST LOCK TAKEDOWN", rate: 0.94, tier: 3 },
  { id: "x-belly-slam", start: 33.6, end: 35.8, impact: 35.2, label: "BELLY-TO-BELLY", rate: 0.92, tier: 3 },
  { id: "x-corner-whip", start: 12.0, end: 14.0, impact: 13.5, label: "CORNER WHIP", rate: 0.96, tier: 3 },
  { id: "x-shoulder-drive", start: 14.6, end: 16.6, impact: 16.1, label: "SHOULDER DRIVE", rate: 0.96, tier: 3 },
  { id: "x-rope-choke", start: 17.6, end: 19.6, impact: 19.1, label: "HELD ON THE ROPES", rate: 0.94, tier: 3 },
  { id: "x-turnbuckle", start: 20.0, end: 22.2, impact: 21.7, label: "TURNBUCKLE SMASH", rate: 0.94, tier: 3 },
  { id: "x-crossbody", start: 23.6, end: 26.0, impact: 25.4, label: "FLYING CROSSBODY", rate: 0.9, tier: 4 },
  { id: "x-rope-dive", start: 25.0, end: 27.4, impact: 26.8, label: "DIVE FROM THE ROPES", rate: 0.88, tier: 4 },
  { id: "x-shoulder-carry", start: 28.8, end: 31.4, impact: 30.7, label: "SHOULDER CARRY", rate: 0.88, tier: 4 },
  { id: "x-spinebuster", start: 32.0, end: 34.4, impact: 33.8, label: "SPINEBUSTER", rate: 0.9, tier: 4 },
  { id: "x-corner-lift", start: 34.8, end: 37.2, impact: 36.5, label: "LIFTED IN THE CORNER", rate: 0.88, tier: 4 },
  { id: "x-ropes-throw", start: 37.0, end: 39.4, impact: 38.8, label: "THROWN OVER THE ROPES", rate: 0.86, tier: 5 },
  { id: "x-mat-slam", start: 26.6, end: 29.6, impact: 29.0, label: "SLAMMED ON THE MAT", rate: 0.86, tier: 5 },
  { id: "x-long-carry", start: 29.0, end: 32.6, impact: 31.9, label: "CARRIED AND DROPPED", rate: 0.84, tier: 5 },
];

const EXTRA_FOLLOW_UPS: Move[] = [
  { id: "fu-knee-drop", start: 24.8, end: 26.9, impact: 26.3, label: "KNEE DROP", rate: 0.9, tier: 3 },
  { id: "fu-mount", start: 25.2, end: 27.6, impact: 27.0, label: "MOUNTED PUNCHES", rate: 0.9, tier: 3 },
  { id: "fu-pickup", start: 28.4, end: 30.8, impact: 30.2, label: "PICKED BACK UP", rate: 0.9, tier: 4 },
  { id: "fu-turnbuckle-dive", start: 20.8, end: 23.6, impact: 23.0, label: "TURNBUCKLE DIVE", rate: 0.86, tier: 4 },
  { id: "fu-double-stomp", start: 23.4, end: 25.6, impact: 25.1, label: "DOUBLE STOMP", rate: 0.9, tier: 4 },
  { id: "fu-drag-center", start: 30.0, end: 32.2, impact: 31.6, label: "DRAGGED TO THE CENTRE", rate: 0.9, tier: 3 },
];

/** Feeling-out windows travel across the whole reel, in overlapping steps. */
const EXTRA_IDLE: IdleScene[] = [
  { id: "i-x1", start: 0.6, end: 3.0, rate: 0.79, label: "CIRCLING" },
  { id: "i-x2", start: 2.8, end: 5.2, rate: 0.77, label: "FEINTS" },
  { id: "i-x3", start: 7.2, end: 9.6, rate: 0.78, label: "GUARD UP" },
  { id: "i-x4", start: 9.2, end: 11.6, rate: 0.8, label: "STALKING" },
  { id: "i-x5", start: 14.2, end: 16.8, rate: 0.76, label: "ALONG THE ROPES" },
  { id: "i-x6", start: 19.4, end: 21.8, rate: 0.75, label: "CORNER PRESSURE" },
  { id: "i-x7", start: 22.4, end: 24.8, rate: 0.77, label: "RESET" },
  { id: "i-x8", start: 25.4, end: 27.8, rate: 0.76, label: "BREATHER" },
  { id: "i-x9", start: 29.2, end: 31.6, rate: 0.79, label: "CENTRE OF THE RING" },
  { id: "i-x10", start: 33.2, end: 35.6, rate: 0.77, label: "SWITCHING SIDES" },
  { id: "i-x11", start: 35.4, end: 37.8, rate: 0.78, label: "SHOULDER TO SHOULDER" },
  { id: "i-x12", start: 38.0, end: 40.0, rate: 0.8, label: "CLOSING SECONDS" },
];

/**
 * Rope and top-rope vocabulary brought back and expanded: climbing the
 * turnbuckle, leaping over the opponent, springboards, and throws that send a
 * fighter over the top rope and out of the ring.
 */
const ROPE_MOVES: Move[] = [
  { id: "r-climb-corner", start: 20.2, end: 22.8, impact: 22.2, label: "CLIMBS THE TURNBUCKLE", rate: 0.9, tier: 4 },
  { id: "r-leap-over", start: 21.6, end: 24.4, impact: 23.6, label: "LEAP OVER THE OPPONENT", rate: 0.88, tier: 4 },
  { id: "r-top-rope-jump", start: 22.2, end: 25.2, impact: 24.4, label: "TOP-ROPE JUMP", rate: 0.88, tier: 4 },
  { id: "r-springboard", start: 23.0, end: 25.8, impact: 25.1, label: "SPRINGBOARD ATTACK", rate: 0.88, tier: 4 },
  { id: "r-flying-elbow", start: 24.4, end: 27.0, impact: 26.3, label: "FLYING ELBOW FROM THE ROPES", rate: 0.88, tier: 4 },
  { id: "r-rope-hurricanrana", start: 25.6, end: 28.2, impact: 27.5, label: "ROPE HURRICANRANA", rate: 0.88, tier: 4 },
  { id: "r-rope-somersault", start: 21.0, end: 23.9, impact: 23.2, label: "SOMERSAULT OFF THE ROPES", rate: 0.86, tier: 4 },
  { id: "r-vault-jump", start: 12.6, end: 15.0, impact: 14.4, label: "VAULTS THE ROPES", rate: 0.9, tier: 3 },
  { id: "r-rope-catapult", start: 13.6, end: 15.8, impact: 15.2, label: "ROPE CATAPULT", rate: 0.92, tier: 3 },
  { id: "r-over-the-top", start: 36.0, end: 38.8, impact: 38.0, label: "THROWN OVER THE TOP ROPE", rate: 0.86, tier: 5 },
  { id: "r-toss-outside", start: 37.2, end: 39.8, impact: 39.0, label: "TOSSED OUT OF THE RING", rate: 0.86, tier: 5 },
  { id: "r-rope-slam-out", start: 34.6, end: 37.4, impact: 36.8, label: "SLAMMED OVER THE ROPES", rate: 0.86, tier: 5 },
  { id: "r-rope-superplex", start: 20.8, end: 24.0, impact: 23.4, label: "SUPERPLEX FROM THE ROPES", rate: 0.84, tier: 5 },
  { id: "r-rope-finish-dive", start: 24.0, end: 27.4, impact: 26.7, label: "DIVING FINISHER", rate: 0.84, tier: 5 },
];

const ROPE_FOLLOW_UPS: Move[] = [
  { id: "fu-rope-leap", start: 21.4, end: 24.2, impact: 23.5, label: "LEAP FROM THE ROPES", rate: 0.86, tier: 4 },
  { id: "fu-rope-somersault", start: 22.6, end: 25.4, impact: 24.7, label: "SOMERSAULT ONTO THE MAT", rate: 0.86, tier: 4 },
  { id: "fu-rope-elbow", start: 25.0, end: 27.8, impact: 27.1, label: "FLYING ELBOW ON THE MAT", rate: 0.86, tier: 4 },
  { id: "fu-over-ropes", start: 36.6, end: 39.6, impact: 38.9, label: "ROLLED OVER THE ROPES", rate: 0.86, tier: 4 },
];

const ROPE_IDLE: IdleScene[] = [
  { id: "i-r1", start: 20.6, end: 22.8, rate: 0.76, label: "CORNER CLIMB LOOK" },
  { id: "i-r2", start: 12.8, end: 15.2, rate: 0.78, label: "BOUNCING OFF THE ROPES" },
  { id: "i-r3", start: 36.6, end: 38.8, rate: 0.76, label: "AT THE ROPES" },
];

/**
 * Round themes: each round leans on a different family of scenes, so a long
 * match never plays the same rhythm twice. The preference is soft — the strict
 * LRU rotation still guarantees no close repetition.
 */
const ROUND_THEMES: RegExp[] = [
  /JAB|HOOK|CROSS|UPPERCUT|SHOT|COMBO|COMBINATION|ELBOW|SLAP|BACKFIST/, // round 1: striking
  /KICK|KNEE|TEEP|SPIN|CLOTHESLINE|SHOULDER/, // round 2: kicks and charges
  /ROPE|TURNBUCKLE|CLIMB|VAULT|SPRINGBOARD|LEAP|JUMP|DIVE|SOMERSAULT|MOONSAULT|SPLASH/, // round 3: rope work
  /SLAM|THROW|TOSS|SUPLEX|POWERBOMB|CARRY|SPINEBUSTER|TAKEDOWN|BOMB/, // round 4: throws
  /MAT|GROUND|STOMP|DROP|MOUNT|PIN|CORNER/, // round 5: mat and corner work
];

let activeRound = 0;

/** Called by the arena when a new round begins. */
export function setSceneRound(round: number) {
  activeRound = Math.max(0, Math.floor(round));
}

/** True when the scene belongs to the family favoured by the current round. */
export function inRoundTheme(item: { label?: string }): boolean {
  const theme = ROUND_THEMES[activeRound % ROUND_THEMES.length]!;
  return typeof item.label === "string" && theme.test(item.label);
}

/* ------------------------------------------------------------------ *
 * Scene families — the unit the anti-repetition guard works on.
 * Two different punches are still "punches": without this, the LRU cycle
 * can happily play six strikes in a row because every id is new. The guard
 * below limits how many scenes of the same family may run back to back and
 * how dense one family may be inside the recent window.
 * ------------------------------------------------------------------ */
export type SceneFamily =
  | "punch"
  | "kick"
  | "rope"
  | "throw"
  | "mat"
  | "clinch"
  | "taunt"
  | "other";

const FAMILY_RULES: Array<[SceneFamily, RegExp]> = [
  ["rope", /ROPE|TURNBUCKLE|CLIMB|VAULT|SPRINGBOARD|LEAP|JUMP|DIVE|SOMERSAULT|MOONSAULT|SPLASH|CORNER CLIMB/],
  ["throw", /SLAM|THROW|TOSS|SUPLEX|POWERBOMB|CARRY|SPINEBUSTER|TAKEDOWN|BOMB|WHIP/],
  ["mat", /MAT|GROUND|STOMP|DROP|MOUNT|PIN|DOWN|CRAWL|RISE|GET UP/],
  ["clinch", /CLINCH|GRAPPLE|KNEE|LOCK|HOLD|COLLAR|PUSH|SHOVE/],
  ["kick", /KICK|TEEP|SPIN|CLOTHESLINE|SHOULDER|CHARGE|RUSH/],
  ["punch", /JAB|HOOK|CROSS|UPPERCUT|SHOT|COMBO|COMBINATION|ELBOW|SLAP|BACKFIST|PUNCH|COUNTER/],
  ["taunt", /LOOK|STARE|CIRCL|BREATH|POSE|TAUNT|WAIT|GUARD|FEEL|WALK|PACE/],
];

const familyCache = new Map<string, SceneFamily>();

/** The physical family a scene belongs to, derived from its label. */
export function familyOf(item: { id?: string; label?: string }): SceneFamily {
  const label = (item.label ?? "").toUpperCase();
  const key = item.id ?? label;
  const cached = familyCache.get(key);
  if (cached) return cached;
  let family: SceneFamily = "other";
  for (const [name, rule] of FAMILY_RULES) {
    if (rule.test(label)) {
      family = name;
      break;
    }
  }
  familyCache.set(key, family);
  return family;
}

/**
 * True when playing `item` now would break the anti-repetition rules:
 * more than `maxStreak` scenes of the same family back to back, or that
 * family filling more than half of the recent window.
 */
export function familyBlocked(
  item: { id?: string; label?: string },
  recentFamilies: SceneFamily[],
  maxStreak: number,
  window = 6,
): boolean {
  if (maxStreak <= 0) return false;
  const family = familyOf(item);
  let streak = 0;
  for (let i = recentFamilies.length - 1; i >= 0 && recentFamilies[i] === family; i--) streak++;
  if (streak >= maxStreak) return true;
  const slice = recentFamilies.slice(-window);
  const share = slice.filter((f) => f === family).length;
  return slice.length >= window && share > Math.ceil(window / 2);
}


export const MOVES: Move[] = [...BASE_MOVES, ...EXTRA_MOVES, ...ROPE_MOVES];

export const FOLLOW_UPS: Move[] = [...BASE_FOLLOW_UPS, ...EXTRA_FOLLOW_UPS, ...ROPE_FOLLOW_UPS];
export const IDLE_SCENES: IdleScene[] = [...BASE_IDLE, ...EXTRA_IDLE, ...ROPE_IDLE];

/** Every scene the scheduler can pick, for the admin list and the debug panel. */
export const ALL_SCENES = [
  ...MOVES.map((m) => ({ id: m.id, label: m.label, group: "move" as const })),
  ...FOLLOW_UPS.map((m) => ({ id: m.id, label: m.label, group: "follow" as const })),
  ...IDLE_SCENES.map((s) => ({ id: s.id, label: s.label, group: "idle" as const })),
];
