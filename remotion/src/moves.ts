import { GROUND, grounded, stance, type Key, type Pose } from "./poses";

/**
 * Choreography of the 10 prototype techniques.
 *
 * Every technique is a full micro-sequence (setup → approach → execution →
 * impact → reaction → recovery) written as joint-angle keyframes, so no two
 * techniques share body motion.
 */

const DOWN = (x: number) => {
  const g = grounded(x);
  const { x: _x, facing: _f, ...rest } = g;
  return { x, ...rest } as Partial<Pose>;
};

export type Technique = {
  id: string;
  label: string;
  family: string;
  /** 0..1 inside the slot where the actual contact happens. */
  impact: number;
  attacker: Key[];
  defender: Key[];
  /** defender starts already on the mat (sharpshooter). */
  defenderStartsGrounded?: boolean;
};

const A0 = 400;
const D0 = 840;

export const ATTACKER_BASE: Pose = stance(A0, 1);
export const DEFENDER_BASE: Pose = stance(D0, -1);
export const DEFENDER_GROUND_BASE: Pose = { ...grounded(D0, -1), facing: -1 };

export const TECHNIQUES: Technique[] = [
  {
    id: "nf-clothesline",
    label: "CLOTHESLINE",
    family: "running_strike",
    impact: 0.46,
    attacker: [
      { t: 0.12, p: { x: 470, rot: -6, sL: -34, sR: 44, hL: 40, kL: -46, hR: -40, kR: -6 } },
      { t: 0.3, p: { x: 620, sL: 40, sR: -40, hL: -40, kL: -6, hR: 44, kR: -50 } },
      { t: 0.46, p: { x: 720, rot: -4, sR: -96, eR: 2, sL: 30, eL: 20, hL: 26, kL: -20, hR: -20 } },
      { t: 0.66, p: { x: 800, rot: 8, sR: -120, eR: 6, sL: 40 } },
      { t: 0.85, p: { x: 820, rot: 0, sR: -22, eR: -40, sL: 26, eL: 38, hL: 8, kL: -6, hR: -10 } },
    ],
    defender: [
      { t: 0.44, p: {} },
      { t: 0.54, p: { rot: -28, head: -18, x: 890, sL: -50, sR: -70 } },
      { t: 0.72, p: { ...DOWN(940) } },
      { t: 1, p: { ...DOWN(945), hL: -70, kL: 40 } },
    ],
  },
  {
    id: "nf-dropkick",
    label: "DROPKICK",
    family: "kick",
    impact: 0.44,
    attacker: [
      { t: 0.14, p: { x: 500, hL: 36, kL: -44, hR: -34, sL: -20, sR: 34 } },
      { t: 0.3, p: { x: 610, y: GROUND - 40, hL: -30, kL: -50, hR: 20, kR: -60, sL: 60, sR: 60 } },
      {
        t: 0.44,
        p: {
          x: 690,
          y: GROUND - 96,
          rot: 62,
          sL: 120,
          eL: 20,
          sR: 130,
          eR: 20,
          hL: -86,
          kL: 6,
          hR: -96,
          kR: 4,
        },
      },
      { t: 0.6, p: { x: 640, y: GROUND + 100, rot: 84, hL: -50, kL: 44, hR: -60, kR: 40 } },
      { t: 0.82, p: { x: 600, y: GROUND + 40, rot: 30, hL: 26, kL: -60, hR: -14, kR: 20 } },
      { t: 1, p: { x: 590, y: GROUND, rot: 0, sL: 26, eL: 38, sR: -22, eR: -40, hL: 8, hR: -10 } },
    ],
    defender: [
      { t: 0.42, p: {} },
      { t: 0.52, p: { x: 900, rot: -34, head: -14 } },
      { t: 0.72, p: { ...DOWN(950) } },
      { t: 1, p: { ...DOWN(955) } },
    ],
  },
  {
    id: "nf-body-slam",
    label: "BODY SLAM",
    family: "slam",
    impact: 0.62,
    attacker: [
      { t: 0.16, p: { x: 700, sL: -50, eL: -20, sR: -60, eR: -16 } },
      { t: 0.36, p: { x: 740, rot: -10, sL: -84, eL: -10, sR: -94, eR: -8, hL: 18, kL: -30 } },
      { t: 0.52, p: { x: 745, rot: 6, sL: -120, eL: 0, sR: -130, eR: 0, hL: 6, kL: -8 } },
      { t: 0.62, p: { x: 745, rot: 22, sL: -70, sR: -80 } },
      { t: 0.78, p: { x: 730, rot: 34, sL: -30, sR: -34, hL: 30, kL: -40 } },
      { t: 1, p: { x: 720, rot: 0, sL: 26, eL: 38, sR: -22, eR: -40, hL: 8, kL: -6 } },
    ],
    defender: [
      { t: 0.3, p: { x: 800 } },
      { t: 0.5, p: { x: 790, y: GROUND - 150, rot: -70, hL: -30, kL: -20, hR: -40 } },
      { t: 0.62, p: { x: 850, y: GROUND + 110, rot: -84, hL: -70, kL: 30, hR: -88, kR: 20 } },
      { t: 0.8, p: { ...DOWN(870), head: 18 } },
      { t: 1, p: { ...DOWN(880) } },
    ],
  },
  {
    id: "nf-vertical-suplex",
    label: "VERTICAL SUPLEX",
    family: "suplex",
    impact: 0.76,
    attacker: [
      { t: 0.18, p: { x: 720, sL: -70, eL: -14, sR: -80, eR: -12 } },
      { t: 0.42, p: { x: 730, rot: -12, sL: -150, eL: -6, sR: -160, eR: -6, hL: 16, kL: -26 } },
      { t: 0.58, p: { x: 730, rot: -6, sL: -168, sR: -172 } },
      { t: 0.76, p: { x: 700, y: GROUND + 60, rot: -60, sL: -150, sR: -156, hL: -40, kL: 30 } },
      { t: 0.9, p: { x: 690, y: GROUND + 100, rot: -80, sL: -80, sR: -90, hL: -70, kL: 40 } },
      { t: 1, p: { x: 690, y: GROUND + 100, rot: -82, sL: -50, sR: -60 } },
    ],
    defender: [
      { t: 0.3, p: { x: 790 } },
      { t: 0.5, p: { x: 760, y: GROUND - 190, rot: 168, hL: -6, kL: 10, hR: 8, kR: -10 } },
      { t: 0.64, p: { x: 758, y: GROUND - 210, rot: 178 } },
      { t: 0.76, p: { x: 770, y: GROUND + 96, rot: 96, hL: 60, kL: -30, hR: 74, kR: -24 } },
      { t: 0.92, p: { ...DOWN(800), rot: -80, head: 20 } },
      { t: 1, p: { ...DOWN(805) } },
    ],
  },
  {
    id: "nf-ddt",
    label: "DDT",
    family: "ddt",
    impact: 0.62,
    attacker: [
      { t: 0.2, p: { x: 730, sL: -100, eL: -30, sR: -110, eR: -26, rot: -8 } },
      { t: 0.4, p: { x: 738, rot: -16, sL: -120, eL: -40 } },
      { t: 0.62, p: { x: 720, y: GROUND + 90, rot: 78, sL: -110, sR: -120, hL: -60, kL: 34 } },
      { t: 0.8, p: { x: 715, y: GROUND + 108, rot: 84, sL: -60, sR: -70, hL: -74, kL: 26 } },
      { t: 1, p: { x: 712, y: GROUND + 100, rot: 80, sL: -40, sR: -46 } },
    ],
    defender: [
      { t: 0.24, p: { x: 800, rot: 34, head: -20 } },
      { t: 0.46, p: { x: 790, y: GROUND - 40, rot: 96, hL: -20, hR: -30 } },
      { t: 0.62, p: { x: 782, y: GROUND + 30, rot: 150, hL: -50, kL: 30, hR: -60, kR: 26 } },
      { t: 0.82, p: { x: 790, y: GROUND + 96, rot: 108, hL: 40, kL: -40, hR: 52, kR: -30 } },
      { t: 1, p: { x: 792, y: GROUND + 100, rot: 100 } },
    ],
  },
  {
    id: "nf-superkick",
    label: "SUPERKICK",
    family: "kick",
    impact: 0.5,
    attacker: [
      { t: 0.16, p: { x: 600, hL: 24, kL: -30, sL: -10, sR: 22 } },
      { t: 0.34, p: { x: 680, hL: -70, kL: 96, hR: 6, sL: 44, sR: -36, rot: 8 } },
      { t: 0.5, p: { x: 700, hL: -136, kL: 6, hR: 12, kR: 6, rot: 20, sL: 70, sR: -70 } },
      { t: 0.66, p: { x: 690, hL: -50, kL: 30, rot: 6, sL: 30, sR: -30 } },
      { t: 1, p: { x: 660, hL: 8, kL: -6, hR: -10, kR: 7, rot: 0, sL: 26, eL: 38, sR: -22, eR: -40 } },
    ],
    defender: [
      { t: 0.48, p: {} },
      { t: 0.58, p: { x: 880, rot: -40, head: -26 } },
      { t: 0.76, p: { ...DOWN(930) } },
      { t: 1, p: { ...DOWN(935), hL: -66, kL: 44 } },
    ],
  },
  {
    id: "nf-spear",
    label: "SPEAR",
    family: "tackle",
    impact: 0.54,
    attacker: [
      { t: 0.1, p: { x: 380, rot: 10, hL: 30, kL: -40, sL: -20, sR: 30 } },
      { t: 0.3, p: { x: 560, rot: 26, hL: -34, kL: -10, hR: 40, kR: -50, sL: 40, sR: -50 } },
      { t: 0.54, p: { x: 730, rot: 58, sL: -30, eL: -20, sR: -40, eR: -18, hL: 40, kL: -50 } },
      { t: 0.72, p: { x: 810, y: GROUND + 70, rot: 74, hL: -20, kL: 20, hR: -30, kR: 16 } },
      { t: 0.88, p: { x: 830, y: GROUND + 96, rot: 80 } },
      { t: 1, p: { x: 828, y: GROUND + 80, rot: 60, sL: -20, sR: -30, hL: -10, kL: 30 } },
    ],
    defender: [
      { t: 0.52, p: {} },
      { t: 0.62, p: { x: 900, rot: -46, y: GROUND - 20, hL: -30, hR: -40 } },
      { t: 0.78, p: { ...DOWN(950), rot: -86 } },
      { t: 1, p: { ...DOWN(955) } },
    ],
  },
  {
    id: "nf-running-knee",
    label: "RUNNING KNEE",
    family: "knee",
    impact: 0.5,
    attacker: [
      { t: 0.12, p: { x: 460, hL: 38, kL: -46, hR: -36, sL: -26, sR: 40 } },
      { t: 0.32, p: { x: 600, hL: -38, kL: -8, hR: 42, kR: -52, sL: 46, sR: -46 } },
      {
        t: 0.5,
        p: { x: 720, y: GROUND - 66, rot: -14, hL: -104, kL: 108, hR: 24, kR: -20, sL: 20, sR: -80 },
      },
      { t: 0.68, p: { x: 740, y: GROUND, rot: 8, hL: -20, kL: 30, hR: 10, sL: 24, sR: -30 } },
      { t: 1, p: { x: 730, rot: 0, hL: 8, kL: -6, hR: -10, kR: 7, sL: 26, eL: 38, sR: -22, eR: -40 } },
    ],
    defender: [
      { t: 0.48, p: {} },
      { t: 0.6, p: { x: 890, rot: -36, head: -22, y: GROUND - 10 } },
      { t: 0.78, p: { ...DOWN(940) } },
      { t: 1, p: { ...DOWN(944) } },
    ],
  },
  {
    id: "nf-powerbomb",
    label: "POWERBOMB",
    family: "powerbomb",
    impact: 0.72,
    attacker: [
      { t: 0.18, p: { x: 730, rot: -18, sL: -60, eL: -30, sR: -70, eR: -26, hL: 20, kL: -34 } },
      { t: 0.4, p: { x: 736, rot: -6, sL: -130, eL: -10, sR: -140, eR: -8, hL: 8, kL: -12 } },
      { t: 0.56, p: { x: 736, rot: 0, sL: -170, eL: 0, sR: -176, eR: 0, hL: 2, kL: -4 } },
      { t: 0.72, p: { x: 736, rot: 26, sL: -110, sR: -118, hL: 26, kL: -34 } },
      { t: 0.86, p: { x: 730, rot: 14, sL: -50, sR: -56, hL: 16, kL: -20 } },
      { t: 1, p: { x: 726, rot: 0, sL: 26, eL: 38, sR: -22, eR: -40, hL: 8, kL: -6 } },
    ],
    defender: [
      { t: 0.28, p: { x: 800 } },
      { t: 0.46, p: { x: 780, y: GROUND - 130, rot: 130, hL: -50, kL: 40, hR: -60, kR: 30 } },
      { t: 0.58, p: { x: 776, y: GROUND - 220, rot: 176, hL: -20, kL: 20, hR: -26, kR: 16 } },
      { t: 0.72, p: { x: 800, y: GROUND + 104, rot: -70, hL: -110, kL: 60, hR: -120, kR: 50 } },
      { t: 0.9, p: { ...DOWN(820), head: 22 } },
      { t: 1, p: { ...DOWN(824) } },
    ],
  },
  {
    id: "nf-sharpshooter",
    label: "SHARPSHOOTER",
    family: "submission",
    impact: 0.64,
    defenderStartsGrounded: true,
    attacker: [
      { t: 0.16, p: { x: 660, rot: 22, sL: -30, eL: -30, sR: -40, eR: -26, hL: 20, kL: -30 } },
      { t: 0.36, p: { x: 720, rot: 30, sL: -60, eL: -40, sR: -70, eR: -34, hL: 30, kL: -40 } },
      { t: 0.52, p: { x: 760, rot: 10, sL: -110, eL: -20, sR: -120, eR: -16, hL: 34, kL: -44 } },
      { t: 0.64, p: { x: 800, facing: -1, rot: -14, sL: -120, eL: -30, sR: -128, eR: -24 } },
      { t: 0.82, p: { x: 812, rot: -26, sL: -104, eL: -40, sR: -112, eR: -34, hL: -6, kL: 8 } },
      { t: 1, p: { x: 814, rot: -22, sL: -100, sR: -108 } },
    ],
    defender: [
      { t: 0.5, p: { hL: -110, kL: 30, hR: -120, kR: 24 } },
      { t: 0.64, p: { rot: -70, head: 26, hL: -140, kL: 60, hR: -150, kR: 54, sL: -20, sR: -30 } },
      { t: 0.84, p: { rot: -56, head: 32, sL: 10, sR: -6 } },
      { t: 1, p: { rot: -58, head: 30 } },
    ],
  },
];

export const SLOT_FRAMES = 90;
export const FPS = 30;
