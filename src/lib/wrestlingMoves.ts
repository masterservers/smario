/**
 * The full pro-wrestling move vocabulary requested for the show: strikes,
 * aerials, slams, drivers, suplexes, finishers, submissions and pin spots.
 *
 * Every entry is mapped onto a window of the master reel through the pools
 * below, grouped by how the move reads on screen, so each name plays a
 * plausible slice of footage instead of a random cut. Submissions, mat spots
 * and pins become follow-ups (played while the opponent is already down);
 * everything else joins the standing move rotation.
 */

import type { Move } from "@/lib/scenes";

/** p = punch/strike, k = kick, a = aerial/rope, t = throw/slam, m = mat, s = submission/pin */
type Kind = "p" | "k" | "a" | "t" | "m" | "s";

type Window = [start: number, end: number, rate: number];

/** Reel windows per kind — cycled so consecutive moves use different footage. */
const POOLS: Record<Kind, Window[]> = {
  p: [
    [0.2, 1.3, 1.16],
    [2.4, 3.5, 1.14],
    [3.5, 4.6, 1.12],
    [4.6, 5.7, 1.08],
    [5.7, 6.8, 1.12],
    [6.8, 7.9, 1.08],
    [7.9, 9.0, 1.1],
    [1.3, 2.4, 1.06],
    [8.8, 10.0, 1.08],
    [30.4, 31.5, 1.08],
  ],
  k: [
    [10.2, 11.4, 1.1],
    [11.4, 12.5, 1.18],
    [12.4, 13.8, 1.06],
    [14.3, 16.4, 1.02],
    [15.2, 17.0, 1.0],
    [16.4, 18.3, 1.04],
    [17.2, 19.0, 1.0],
    [31.5, 33.4, 1.0],
    [33.4, 35.6, 0.96],
    [10.8, 12.0, 1.1],
  ],
  a: [
    [20.2, 22.8, 0.9],
    [21.0, 23.9, 0.88],
    [21.6, 24.4, 0.88],
    [22.2, 25.2, 0.88],
    [23.0, 25.8, 0.88],
    [24.0, 26.8, 0.86],
    [24.4, 27.0, 0.88],
    [25.6, 28.2, 0.88],
    [20.8, 24.0, 0.84],
    [21.4, 25.2, 0.84],
  ],
  t: [
    [28.2, 30.4, 0.92],
    [29.6, 32.4, 0.88],
    [30.4, 33.3, 0.9],
    [31.6, 35.4, 0.84],
    [32.6, 35.6, 0.88],
    [33.0, 35.2, 0.92],
    [34.2, 37.8, 0.86],
    [35.0, 38.2, 0.86],
    [36.4, 39.4, 0.88],
    [37.2, 39.8, 0.86],
  ],
  m: [
    [24.2, 27.2, 0.88],
    [25.4, 29.2, 0.84],
    [25.8, 28.0, 0.92],
    [26.4, 29.4, 0.88],
    [27.0, 29.8, 0.9],
    [22.8, 25.8, 0.88],
  ],
  s: [
    [2.3, 4.5, 0.94],
    [7.6, 9.9, 0.92],
    [17.6, 20.0, 0.94],
    [19.6, 21.6, 0.96],
    [26.0, 28.4, 0.92],
    [24.2, 27.2, 0.9],
  ],
};

/** name, kind, tier (1 = light strike … 5 = finisher) */
const CATALOG: Array<[string, Kind, number]> = [
  ["Clothesline", "p", 2], ["Lariat", "p", 3], ["Running Clothesline", "p", 3],
  ["Corner Clothesline", "p", 2], ["Double Clothesline", "p", 3], ["Flying Clothesline", "a", 3],
  ["Shoulder Block", "p", 2], ["Running Shoulder Block", "p", 2], ["Spear", "t", 4],
  ["Gore", "t", 4], ["Superman Punch", "p", 3], ["European Uppercut", "p", 1],
  ["Forearm Smash", "p", 1], ["Elbow Smash", "p", 1], ["Back Elbow", "p", 1],
  ["Rolling Elbow", "p", 3], ["Discus Elbow", "p", 3], ["Knife-Edge Chop", "p", 1],
  ["Chest Chop", "p", 1], ["Mongolian Chop", "p", 1], ["Open-Hand Chop", "p", 1],
  ["Headbutt", "p", 2], ["Big Boot", "k", 3], ["Bicycle Kick", "k", 3],
  ["Superkick", "k", 3], ["Savate Kick", "k", 2], ["Roundhouse Kick", "k", 2],
  ["Spinning Heel Kick", "k", 3], ["Enzuigiri", "k", 3], ["Dropkick", "k", 2],
  ["Missile Dropkick", "a", 3], ["Basement Dropkick", "k", 2], ["Shotgun Dropkick", "k", 3],
  ["Running Knee Strike", "k", 3], ["Bicycle Knee Strike", "k", 3], ["Jumping Knee Strike", "k", 3],
  ["Knee Lift", "k", 2], ["Shining Wizard", "k", 3], ["Stomp", "m", 2],
  ["Double Foot Stomp", "m", 3], ["Diving Double Foot Stomp", "a", 4], ["Leg Drop", "m", 2],
  ["Running Leg Drop", "m", 3], ["Diving Leg Drop", "a", 4], ["Elbow Drop", "m", 2],
  ["Diving Elbow Drop", "a", 4], ["Fist Drop", "m", 2], ["Knee Drop", "m", 2],
  ["Splash", "a", 3], ["Running Splash", "a", 3], ["Corner Splash", "a", 3],
  ["Body Splash", "a", 3], ["Diving Splash", "a", 4], ["Frog Splash", "a", 4],
  ["450 Splash", "a", 5], ["Shooting Star Press", "a", 5], ["Moonsault", "a", 4],
  ["Springboard Moonsault", "a", 4], ["Standing Moonsault", "a", 4], ["Corkscrew Moonsault", "a", 5],
  ["Senton", "a", 3], ["Running Senton", "a", 3], ["Diving Senton", "a", 4],
  ["Swanton Bomb", "a", 5], ["Cannonball Senton", "a", 3], ["Suicide Dive", "a", 4],
  ["Tope Suicida", "a", 4], ["Tope Con Hilo", "a", 4], ["Plancha", "a", 4],
  ["Crossbody", "a", 3], ["Diving Crossbody", "a", 4], ["Springboard Crossbody", "a", 4],
  ["Hurricanrana", "t", 3], ["Frankensteiner", "t", 4], ["Headscissors Takedown", "t", 3],
  ["Arm Drag", "t", 2], ["Hip Toss", "t", 2], ["Monkey Flip", "t", 2],
  ["Snapmare", "t", 2], ["Biel Throw", "t", 3], ["Body Slam", "t", 3],
  ["Scoop Slam", "t", 3], ["Powerslam", "t", 4], ["Running Powerslam", "t", 4],
  ["Scoop Powerslam", "t", 4], ["Side Slam", "t", 3], ["Spinebuster", "t", 4],
  ["Double-A Spinebuster", "t", 4], ["Alabama Slam", "t", 4], ["Fallaway Slam", "t", 4],
  ["Military Press Slam", "t", 4], ["Gorilla Press Slam", "t", 4], ["Chokeslam", "t", 5],
  ["Uranage", "t", 4], ["Rock Bottom", "t", 5], ["Book End", "t", 4],
  ["Sidewalk Slam", "t", 3], ["Backbreaker", "t", 3], ["Pendulum Backbreaker", "t", 3],
  ["Tilt-a-Whirl Backbreaker", "t", 4], ["Argentine Backbreaker", "t", 4], ["Neckbreaker", "t", 3],
  ["Swinging Neckbreaker", "t", 3], ["Snap Neckbreaker", "t", 3], ["Hangman's Neckbreaker", "t", 3],
  ["Reverse Neckbreaker", "t", 3], ["DDT", "t", 4], ["Snap DDT", "t", 4],
  ["Implant DDT", "t", 4], ["Tornado DDT", "t", 4], ["Jumping DDT", "t", 4],
  ["Double-Arm DDT", "t", 4], ["Hammerlock DDT", "t", 4], ["Reverse DDT", "t", 4],
  ["Even Flow DDT", "t", 5], ["Brainbuster", "t", 5], ["Suplex", "t", 3],
  ["Vertical Suplex", "t", 3], ["Snap Suplex", "t", 3], ["Delayed Vertical Suplex", "t", 4],
  ["Superplex", "a", 5], ["German Suplex", "t", 4], ["Release German Suplex", "t", 4],
  ["Belly-to-Belly Suplex", "t", 3], ["Overhead Belly-to-Belly Suplex", "t", 4],
  ["Belly-to-Back Suplex", "t", 3], ["Exploder Suplex", "t", 4], ["Northern Lights Suplex", "t", 4],
  ["Dragon Suplex", "t", 5], ["Tiger Suplex", "t", 5], ["Half-Nelson Suplex", "t", 4],
  ["Saito Suplex", "t", 4], ["Fisherman Suplex", "t", 4], ["Butterfly Suplex", "t", 4],
  ["Gutwrench Suplex", "t", 4], ["Deadlift Suplex", "t", 4], ["Falcon Arrow", "t", 5],
  ["Jackhammer", "t", 5], ["Piledriver", "t", 5], ["Tombstone Piledriver", "t", 5],
  ["Sit-Out Piledriver", "t", 5], ["Package Piledriver", "t", 5], ["Powerbomb", "t", 5],
  ["Sit-Out Powerbomb", "t", 5], ["Running Powerbomb", "t", 5], ["Crucifix Powerbomb", "t", 5],
  ["Last Ride Powerbomb", "t", 5], ["Pop-Up Powerbomb", "t", 5], ["Buckle Bomb", "t", 5],
  ["Batista Bomb", "t", 5], ["Jackknife Powerbomb", "t", 5], ["Tiger Driver", "t", 5],
  ["Pedigree", "t", 5], ["Styles Clash", "t", 5], ["Canadian Destroyer", "t", 5],
  ["Codebreaker", "t", 4], ["Backstabber", "t", 4], ["Lungblower", "t", 4],
  ["Flatliner", "t", 4], ["Complete Shot", "t", 4], ["Skull Crushing Finale", "t", 5],
  ["Zig Zag", "t", 4], ["RKO", "t", 5], ["Diamond Cutter", "t", 5],
  ["Stunner", "t", 5], ["Stone Cold Stunner", "t", 5], ["Twist of Fate", "t", 5],
  ["Sister Abigail", "t", 5], ["End of Days", "t", 5], ["Attitude Adjustment", "t", 5],
  ["F-5", "t", 5], ["Claymore Kick", "k", 5], ["Sweet Chin Music", "k", 5],
  ["Kinshasa", "k", 5], ["Coup de Grace", "a", 5], ["Phenomenal Forearm", "a", 5],
  ["Curb Stomp", "m", 5], ["Cross Rhodes", "t", 5], ["One-Winged Angel", "t", 5],
  ["GTS", "t", 5], ["Buckshot Lariat", "a", 5], ["Rainmaker", "p", 5],
  ["Hidden Blade", "p", 5], ["Burning Hammer", "t", 5], ["Muscle Buster", "t", 5],
  ["Samoan Drop", "t", 4], ["Death Valley Driver", "t", 5], ["Fireman's Carry Slam", "t", 4],
  ["Michinoku Driver", "t", 4], ["Blue Thunder Bomb", "t", 5], ["Olympic Slam", "t", 5],
  ["Angle Slam", "t", 5], ["Cobra Clutch Slam", "t", 4], ["Full Nelson Slam", "t", 4],
  ["Gutbuster", "t", 3], ["Facebuster", "t", 3], ["X-Factor", "t", 4],
  ["Glam Slam", "t", 4], ["Vertebreaker", "t", 5], ["Electric Chair Drop", "t", 4],
  ["Doomsday Device", "a", 5], ["3D", "t", 5], ["Shatter Machine", "t", 5],
  ["Magic Killer", "t", 5], ["Hart Attack", "t", 4], ["Double Chokeslam", "t", 5],
  ["Double Suplex", "t", 4], ["Double Powerbomb", "t", 5],
  ["Sharpshooter", "s", 4], ["Figure-Four Leglock", "s", 4], ["Figure-Eight Leglock", "s", 4],
  ["Boston Crab", "s", 3], ["Single-Leg Boston Crab", "s", 3], ["Walls of Jericho", "s", 4],
  ["Texas Cloverleaf", "s", 4], ["Ankle Lock", "s", 3], ["Heel Hook", "s", 3],
  ["Knee Bar", "s", 3], ["Armbar", "s", 3], ["Cross Armbar", "s", 3],
  ["Fujiwara Armbar", "s", 4], ["Kimura Lock", "s", 4], ["Hammerlock", "s", 2],
  ["Wrist Lock", "s", 2], ["Chickenwing", "s", 3], ["Crossface", "s", 4],
  ["Crippler Crossface", "s", 4], ["STF", "s", 4], ["STS", "s", 4],
  ["Sleeper Hold", "s", 3], ["Rear Naked Choke", "s", 4], ["Guillotine Choke", "s", 4],
  ["Dragon Sleeper", "s", 4], ["Cobra Clutch", "s", 3], ["Million Dollar Dream", "s", 4],
  ["Bear Hug", "s", 2], ["Full Nelson", "s", 3], ["Half Nelson", "s", 2],
  ["Abdominal Stretch", "s", 3], ["Octopus Hold", "s", 3], ["Camel Clutch", "s", 4],
  ["Mandible Claw", "s", 3], ["Iron Claw", "s", 3], ["Headlock", "s", 2],
  ["Side Headlock", "s", 2], ["Front Facelock", "s", 2], ["Waist Lock", "s", 2],
  ["Collar-and-Elbow Tie-Up", "s", 1], ["Test of Strength", "s", 1],
  ["Schoolboy Pin", "m", 2], ["Small Package", "m", 2], ["Inside Cradle", "m", 2],
  ["Backslide Pin", "m", 2], ["Sunset Flip", "m", 3], ["Victory Roll", "m", 3],
  ["Jackknife Pin", "m", 2], ["La Magistral", "m", 3], ["Roll-Up", "m", 2],
  ["Bridge Pin", "m", 2], ["Crucifix Pin", "m", 2],
];

function slug(name: string): string {
  return `w-${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`;
}

const counters: Record<Kind, number> = { p: 0, k: 0, a: 0, t: 0, m: 0, s: 0 };

function build(entry: [string, Kind, number]): Move {
  const [name, kind, tier] = entry;
  const pool = POOLS[kind];
  const win = pool[counters[kind]++ % pool.length]!;
  const [start, end, rate] = win;
  return {
    id: slug(name),
    start,
    end,
    impact: Number((start + (end - start) * 0.85).toFixed(2)),
    label: name.toUpperCase(),
    rate,
    tier,
  };
}

/** Standing moves: strikes, kicks, aerials and throws. */
export const WRESTLING_MOVES: Move[] = CATALOG.filter(
  ([, kind]) => kind !== "s" && kind !== "m",
).map(build);

/** Spots played on a downed opponent: submissions, mat attacks and pins. */
export const WRESTLING_FOLLOW_UPS: Move[] = CATALOG.filter(
  ([, kind]) => kind === "s" || kind === "m",
).map(build);
