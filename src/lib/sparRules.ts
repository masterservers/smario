/**
 * When does the ring spar on its own, and when does it switch back to
 * gift-driven action? The rules are explicit so the behaviour is predictable
 * and readable in the scheduler debug panel:
 *
 * 1. A waiting gift always wins: sparring never starts while the queue holds a
 *    gift, and the current sparring spot hands over as soon as it has played
 *    out (a sparring spot is never cut in the middle).
 * 2. Sparring only starts after `QUIET_MS` without a new gift, so the ring does
 *    not jump into a free spot between two gifts of the same burst.
 * 3. Momentum: the more gifts arrive inside the rolling window, the rarer the
 *    free sparring becomes — a hot crowd drives the fight, a quiet one keeps
 *    the fighters working by themselves.
 */

/** Silence needed before the fighters start a free spot. */
export const QUIET_MS = 2500;
/** Rolling window used to measure how hot the gift flow is. */
export const MOMENTUM_WINDOW_MS = 20000;
/** Gifts inside the window that count as full momentum (1.0). */
export const MOMENTUM_FULL = 8;
/** Sparring probability with a cold crowd… */
export const SPAR_CHANCE_MAX = 0.72;
/** …and with the crowd at full momentum. */
export const SPAR_CHANCE_MIN = 0.18;

/** 0 = no gifts in the window, 1 = crowd at full throttle. */
export function momentumOf(giftTimes: number[], now: number): number {
  const recent = giftTimes.filter((time) => now - time <= MOMENTUM_WINDOW_MS).length;
  return Math.min(1, recent / MOMENTUM_FULL);
}

/** Sparring probability for the current momentum. */
export function sparChanceFor(momentum: number): number {
  return SPAR_CHANCE_MAX - (SPAR_CHANCE_MAX - SPAR_CHANCE_MIN) * momentum;
}

export type SparDecision = {
  spar: boolean;
  chance: number;
  momentum: number;
  quietMs: number;
  reason: string;
};

/** The single place that decides sparring vs. gift action for the next scene. */
export function decideSpar(input: {
  giftWaiting: boolean;
  paused: boolean;
  lastGiftAt: number;
  giftTimes: number[];
  now: number;
  roll?: number;
}): SparDecision {
  const { giftWaiting, paused, lastGiftAt, giftTimes, now } = input;
  const momentum = momentumOf(giftTimes, now);
  const chance = sparChanceFor(momentum);
  const quietMs = lastGiftAt > 0 ? now - lastGiftAt : Number.POSITIVE_INFINITY;

  if (giftWaiting) return { spar: false, chance, momentum, quietMs, reason: "gift waiting" };
  if (paused) return { spar: false, chance, momentum, quietMs, reason: "referee count" };
  if (quietMs < QUIET_MS)
    return { spar: false, chance, momentum, quietMs, reason: `gift flow (${Math.round(quietMs)}ms quiet)` };

  const roll = input.roll ?? Math.random();
  return roll < chance
    ? { spar: true, chance, momentum, quietMs, reason: "quiet ring — free sparring" }
    : { spar: false, chance, momentum, quietMs, reason: "feeling-out window" };
}
