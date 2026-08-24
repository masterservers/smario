/** Pose vocabulary + keyframe interpolation for the procedural fighters. */

export type Pose = {
  x: number;
  y: number;
  facing: 1 | -1;
  rot: number;
  head: number;
  sL: number;
  eL: number;
  sR: number;
  eR: number;
  hL: number;
  kL: number;
  hR: number;
  kR: number;
};

export const GROUND = 470;

export const stance = (x: number, facing: 1 | -1 = 1): Pose => ({
  x,
  y: GROUND,
  facing,
  rot: 0,
  head: 0,
  sL: 26,
  eL: 38,
  sR: -22,
  eR: -40,
  hL: 8,
  kL: -6,
  hR: -10,
  kR: 7,
});

/** Flat on the mat, head towards the attacker side. */
export const grounded = (x: number, facing: 1 | -1 = 1): Pose => ({
  ...stance(x, facing),
  y: GROUND + 118,
  rot: -84,
  head: 14,
  sL: -40,
  eL: -20,
  sR: -60,
  eR: -14,
  hL: -78,
  kL: 28,
  hR: -96,
  kR: 16,
});

export type Key = { t: number; p: Partial<Pose> };

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Sample a keyframe track at progress p (0..1) on top of a base pose. */
export function sample(base: Pose, keys: Key[], p: number): Pose {
  const track = [{ t: 0, p: {} as Partial<Pose> }, ...keys].sort((a, b) => a.t - b.t);
  let acc: Pose = { ...base, ...track[0]!.p };
  for (let i = 0; i < track.length - 1; i++) {
    const cur = track[i]!;
    const next = track[i + 1]!;
    if (p <= cur.t) break;
    const from: Pose = { ...acc };
    const to: Pose = { ...from, ...next.p };
    if (p >= next.t) {
      acc = to;
      continue;
    }
    const local = ease((p - cur.t) / Math.max(0.0001, next.t - cur.t));
    const out = { ...from } as Pose;
    (Object.keys(from) as (keyof Pose)[]).forEach((k) => {
      if (k === "facing") return;
      (out[k] as number) = lerp(from[k] as number, to[k] as number, local);
    });
    return out;
  }
  return acc;
}
