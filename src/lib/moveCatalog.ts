/**
 * The full professional-wrestling move catalog.
 *
 * Every technique the fighters can execute in the ring is declared here by
 * name, grouped by how it reads on screen. Each group carries its own tier
 * (how heavy the blow is), its own kind (punch / kick / aerial / throw /
 * grapple) and its own on-screen length, so the arena scheduler, the
 * commentary engine and the admin panel all speak the same vocabulary.
 *
 * The windows on the master reel are assigned by `scenes.ts` through the same
 * layout pass used for the historic scenes — this file only describes *what*
 * the move is, never *where* on the reel it plays.
 */

import type { HitKind } from "@/lib/hitConfig";

export type CatalogGroup = {
  kind: HitKind;
  tier: number;
  /** How long the spot takes on screen, in seconds. */
  seconds: number;
  rate: number;
  /** Played on the mat while the opponent is already down. */
  mat?: boolean;
  names: string[];
};

export const MOVE_CATALOG: CatalogGroup[] = [
  // ---- Running strikes and charges -----------------------------------
  {
    kind: "punch",
    tier: 3,
    seconds: 2.0,
    rate: 0.98,
    names: [
      "Clothesline",
      "Lariat",
      "Running Clothesline",
      "Corner Clothesline",
      "Double Clothesline",
      "Flying Clothesline",
      "Shoulder Block",
      "Running Shoulder Block",
      "Spear",
      "Gore",
      "Superman Punch",
    ],
  },

  // ---- Hand strikes ---------------------------------------------------
  {
    kind: "punch",
    tier: 1,
    seconds: 1.2,
    rate: 1.12,
    names: [
      "European Uppercut",
      "Forearm Smash",
      "Elbow Smash",
      "Back Elbow",
      "Rolling Elbow",
      "Discus Elbow",
      "Knife-Edge Chop",
      "Chest Chop",
      "Mongolian Chop",
      "Open-Hand Chop",
      "Headbutt",
    ],
  },

  // ---- Kicks ----------------------------------------------------------
  {
    kind: "kick",
    tier: 2,
    seconds: 1.8,
    rate: 1.04,
    names: [
      "Big Boot",
      "Bicycle Kick",
      "Superkick",
      "Savate Kick",
      "Roundhouse Kick",
      "Spinning Heel Kick",
      "Enzuigiri",
      "Dropkick",
      "Missile Dropkick",
      "Basement Dropkick",
      "Shotgun Dropkick",
    ],
  },

  // ---- Knees ----------------------------------------------------------
  {
    kind: "kick",
    tier: 3,
    seconds: 1.9,
    rate: 1.0,
    names: [
      "Running Knee Strike",
      "Bicycle Knee Strike",
      "Jumping Knee Strike",
      "Knee Lift",
      "Shining Wizard",
    ],
  },

  // ---- Ground attacks on a downed opponent ----------------------------
  {
    kind: "aerial",
    tier: 3,
    seconds: 2.1,
    rate: 0.94,
    mat: true,
    names: [
      "Stomp",
      "Double Foot Stomp",
      "Diving Double Foot Stomp",
      "Leg Drop",
      "Running Leg Drop",
      "Diving Leg Drop",
      "Elbow Drop",
      "Diving Elbow Drop",
      "Fist Drop",
      "Knee Drop",
    ],
  },

  // ---- Splashes and high-flying ---------------------------------------
  {
    kind: "aerial",
    tier: 4,
    seconds: 2.8,
    rate: 0.88,
    names: [
      "Splash",
      "Running Splash",
      "Corner Splash",
      "Body Splash",
      "Diving Splash",
      "Frog Splash",
      "450 Splash",
      "Shooting Star Press",
      "Moonsault",
      "Springboard Moonsault",
      "Standing Moonsault",
      "Corkscrew Moonsault",
      "Senton",
      "Running Senton",
      "Diving Senton",
      "Swanton Bomb",
      "Cannonball Senton",
    ],
  },

  // ---- Dives out of the ring ------------------------------------------
  {
    kind: "aerial",
    tier: 4,
    seconds: 3.0,
    rate: 0.86,
    names: [
      "Suicide Dive",
      "Tope Suicida",
      "Tope Con Hilo",
      "Plancha",
      "Crossbody",
      "Diving Crossbody",
      "Springboard Crossbody",
    ],
  },

  // ---- Lucha takedowns -------------------------------------------------
  {
    kind: "throw",
    tier: 3,
    seconds: 2.2,
    rate: 0.94,
    names: [
      "Hurricanrana",
      "Frankensteiner",
      "Headscissors Takedown",
      "Arm Drag",
      "Hip Toss",
      "Monkey Flip",
      "Snapmare",
      "Biel Throw",
    ],
  },

  // ---- Slams ------------------------------------------------------------
  {
    kind: "throw",
    tier: 4,
    seconds: 2.6,
    rate: 0.9,
    names: [
      "Body Slam",
      "Scoop Slam",
      "Powerslam",
      "Running Powerslam",
      "Scoop Powerslam",
      "Side Slam",
      "Spinebuster",
      "Double-A Spinebuster",
      "Alabama Slam",
      "Fallaway Slam",
      "Military Press Slam",
      "Gorilla Press Slam",
      "Chokeslam",
      "Uranage",
      "Rock Bottom",
      "Book End",
      "Sidewalk Slam",
    ],
  },

  // ---- Backbreakers and neckbreakers ------------------------------------
  {
    kind: "throw",
    tier: 3,
    seconds: 2.3,
    rate: 0.92,
    names: [
      "Backbreaker",
      "Pendulum Backbreaker",
      "Tilt-a-Whirl Backbreaker",
      "Argentine Backbreaker",
      "Neckbreaker",
      "Swinging Neckbreaker",
      "Snap Neckbreaker",
      "Hangman's Neckbreaker",
      "Reverse Neckbreaker",
    ],
  },

  // ---- DDTs --------------------------------------------------------------
  {
    kind: "throw",
    tier: 4,
    seconds: 2.4,
    rate: 0.9,
    names: [
      "DDT",
      "Snap DDT",
      "Implant DDT",
      "Tornado DDT",
      "Jumping DDT",
      "Double-Arm DDT",
      "Hammerlock DDT",
      "Reverse DDT",
      "Even Flow DDT",
      "Brainbuster",
    ],
  },

  // ---- Suplexes ----------------------------------------------------------
  {
    kind: "throw",
    tier: 4,
    seconds: 2.7,
    rate: 0.9,
    names: [
      "Suplex",
      "Vertical Suplex",
      "Snap Suplex",
      "Delayed Vertical Suplex",
      "Superplex",
      "German Suplex",
      "Release German Suplex",
      "Belly-to-Belly Suplex",
      "Overhead Belly-to-Belly Suplex",
      "Belly-to-Back Suplex",
      "Exploder Suplex",
      "Northern Lights Suplex",
      "Dragon Suplex",
      "Tiger Suplex",
      "Half-Nelson Suplex",
      "Saito Suplex",
      "Fisherman Suplex",
      "Butterfly Suplex",
      "Gutwrench Suplex",
      "Deadlift Suplex",
      "Falcon Arrow",
      "Jackhammer",
    ],
  },

  // ---- Piledrivers and powerbombs ----------------------------------------
  {
    kind: "throw",
    tier: 5,
    seconds: 3.2,
    rate: 0.86,
    names: [
      "Piledriver",
      "Tombstone Piledriver",
      "Sit-Out Piledriver",
      "Package Piledriver",
      "Powerbomb",
      "Sit-Out Powerbomb",
      "Running Powerbomb",
      "Crucifix Powerbomb",
      "Last Ride Powerbomb",
      "Pop-Up Powerbomb",
      "Buckle Bomb",
      "Batista Bomb",
      "Jackknife Powerbomb",
      "Tiger Driver",
    ],
  },

  // ---- Cutters, drivers and signature finishers ---------------------------
  {
    kind: "throw",
    tier: 5,
    seconds: 3.0,
    rate: 0.86,
    names: [
      "Pedigree",
      "Styles Clash",
      "Canadian Destroyer",
      "Codebreaker",
      "Backstabber",
      "Lungblower",
      "Flatliner",
      "Complete Shot",
      "Skull Crushing Finale",
      "Zig Zag",
      "RKO",
      "Diamond Cutter",
      "Stunner",
      "Stone Cold Stunner",
      "Twist of Fate",
      "Sister Abigail",
      "End of Days",
      "Attitude Adjustment",
      "F-5",
      "Coup de Grace",
      "Curb Stomp",
      "Cross Rhodes",
      "One-Winged Angel",
      "GTS",
      "Rainmaker",
      "Burning Hammer",
      "Muscle Buster",
      "Samoan Drop",
      "Death Valley Driver",
      "Fireman's Carry Slam",
      "Michinoku Driver",
      "Blue Thunder Bomb",
      "Olympic Slam",
      "Angle Slam",
      "Cobra Clutch Slam",
      "Full Nelson Slam",
      "Gutbuster",
      "Facebuster",
      "X-Factor",
      "Glam Slam",
      "Vertebreaker",
      "Electric Chair Drop",
    ],
  },

  // ---- Striking finishers --------------------------------------------------
  {
    kind: "kick",
    tier: 5,
    seconds: 2.4,
    rate: 0.9,
    names: [
      "Claymore Kick",
      "Sweet Chin Music",
      "Kinshasa",
      "Phenomenal Forearm",
      "Buckshot Lariat",
      "Hidden Blade",
    ],
  },

  // ---- Double-team spots ----------------------------------------------------
  {
    kind: "throw",
    tier: 5,
    seconds: 3.2,
    rate: 0.86,
    names: [
      "Doomsday Device",
      "3D",
      "Shatter Machine",
      "Magic Killer",
      "Hart Attack",
      "Double Chokeslam",
      "Double Suplex",
      "Double Powerbomb",
    ],
  },

  // ---- Submissions — leg -----------------------------------------------------
  {
    kind: "grapple",
    tier: 3,
    seconds: 2.6,
    rate: 0.9,
    mat: true,
    names: [
      "Sharpshooter",
      "Figure-Four Leglock",
      "Figure-Eight Leglock",
      "Boston Crab",
      "Single-Leg Boston Crab",
      "Walls of Jericho",
      "Texas Cloverleaf",
      "Ankle Lock",
      "Heel Hook",
      "Knee Bar",
    ],
  },

  // ---- Submissions — arm ------------------------------------------------------
  {
    kind: "grapple",
    tier: 3,
    seconds: 2.4,
    rate: 0.9,
    mat: true,
    names: [
      "Armbar",
      "Cross Armbar",
      "Fujiwara Armbar",
      "Kimura Lock",
      "Hammerlock",
      "Wrist Lock",
      "Chickenwing",
      "Crossface",
      "Crippler Crossface",
      "STF",
      "STS",
    ],
  },

  // ---- Submissions — chokes and holds -------------------------------------------
  {
    kind: "grapple",
    tier: 3,
    seconds: 2.6,
    rate: 0.9,
    mat: true,
    names: [
      "Sleeper Hold",
      "Rear Naked Choke",
      "Guillotine Choke",
      "Dragon Sleeper",
      "Cobra Clutch",
      "Million Dollar Dream",
      "Bear Hug",
      "Full Nelson",
      "Half Nelson",
      "Abdominal Stretch",
      "Octopus Hold",
      "Camel Clutch",
      "Mandible Claw",
      "Iron Claw",
    ],
  },

  // ---- Chain wrestling ------------------------------------------------------------
  {
    kind: "grapple",
    tier: 2,
    seconds: 2.0,
    rate: 0.98,
    names: [
      "Headlock",
      "Side Headlock",
      "Front Facelock",
      "Waist Lock",
      "Collar-and-Elbow Tie-Up",
      "Test of Strength",
    ],
  },

  // ---- Pinning combinations ---------------------------------------------------------
  {
    kind: "grapple",
    tier: 2,
    seconds: 2.2,
    rate: 0.94,
    mat: true,
    names: [
      "Schoolboy Pin",
      "Small Package",
      "Inside Cradle",
      "Backslide Pin",
      "Sunset Flip",
      "Victory Roll",
      "Jackknife Pin",
      "La Magistral",
      "Roll-Up",
      "Bridge Pin",
      "Crucifix Pin",
    ],
  },
];

/** Slug used as the scene id, e.g. "Tope Con Hilo" → "wm-tope-con-hilo". */
export function moveSlug(name: string): string {
  return (
    "wm-" +
    name
      .toLowerCase()
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
  );
}

export type CatalogEntry = {
  id: string;
  label: string;
  kind: HitKind;
  tier: number;
  seconds: number;
  rate: number;
  mat: boolean;
};

/** Flat list of every technique, ready to be laid out on the reel. */
export const CATALOG_ENTRIES: CatalogEntry[] = MOVE_CATALOG.flatMap((group) =>
  group.names.map((name) => ({
    id: moveSlug(name),
    label: name.toUpperCase(),
    kind: group.kind,
    tier: group.tier,
    seconds: group.seconds,
    rate: group.rate,
    mat: group.mat === true,
  })),
);
