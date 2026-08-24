import { DIFFICULTY_CONFIG, type Difficulty } from "@/lib/difficulty";
import { VARIETY_DEFAULT, type VarietyConfig } from "@/lib/variety";
import { useEffect, useRef, useState } from "react";
import { PRIMARY_REEL, REELS, reelIndexOf } from "@/lib/reels";
import { GIFT_BY_ID, type GiftEvent, type Side } from "@/lib/battle";
import { ruleFor, ruleForEvent, type HitKind } from "@/lib/hitConfig";
import { SIDE_NAME, UI_TEXT, type Lang } from "@/lib/i18n";
import { getGiftConfig } from "@/lib/giftConfig";
import { giftName } from "@/lib/giftCatalog";
import {
  CHAMPION_POSE,
  FOLLOW_UPS,
  IDLE_SCENES,
  MOVES,
  inRoundTheme,
  advanceSceneBeat,
  setSceneRound,
  familyOf,
  familyBlocked,
  type SceneFamily,
  type IdleScene,
  type Move,
} from "@/lib/scenes";
import { moveKind } from "@/lib/moveKind";
import {
  isVisualSequenceRecent,
  lastVisualSequence,
  noteVisualSequence,
  visualSequenceIdOf,
} from "@/lib/visualSequences";

import {
  completionEndOf,
  contactPointOf,
  followThroughOf,
  impactTimeOf,
} from "@/lib/collision";
import { commitPendingConfig } from "@/lib/pendingConfig";
import { usePerfMode } from "@/lib/perfMode";

import { getSceneConfig, weightOf } from "@/lib/sceneConfig";
import { fightStateTrace, sceneBlocked, sceneStarted } from "@/lib/sceneDebug";
import {
  
  chooseStateAwareMove,
  applyMoveResult,
  INITIAL_FIGHT_CONTEXT,
  type FightContext,
} from "@/lib/fightState";
import {
  moveDefinitionOf,
  moveFamilyBlocked,
  noteMoveFamily,
  STATE_AWARE_RECOVERY_SCENES,
  STATE_AWARE_SCENES,
} from "@/lib/stateAwareMoves";


const FIGHT_VIDEO = PRIMARY_REEL;
/** Two decode slots per master reel, so any reel can be cut to instantly. */
const SLOTS = REELS.length * 2;


/** How a hit reads physically on screen (kinds are configurable in /admin). */

const kindOf = (move: Move): HitKind => moveKind(move);

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
  { x: -2.2, y: 0.3, scale: 1, rotate: -0.5 },
  { x: 2.2, y: 0.3, scale: 1, rotate: 0.5 },
  { x: -3, y: -0.6, scale: 0.99, rotate: 0.6 },
  { x: 3, y: -0.6, scale: 0.99, rotate: -0.6 },
  { x: 0, y: 0.8, scale: 0.97, rotate: 0 },
  { x: -1.4, y: -0.8, scale: 1, rotate: 0.35 },
  { x: 1.4, y: -0.8, scale: 1, rotate: -0.35 },
];

/** Each block of the reel gets its own corner of the ring, plus a little drift. */
function frameFor(move: Move): Frame {
  const block = Math.floor(move.start / 10); // 0..3
  const base = FRAMES[(block * 2 + (move.tier % 2) + 1) % FRAMES.length]!;
  const drift = (Math.random() - 0.5) * 1.2;
  return {
    x: Math.max(-3.5, Math.min(3.5, base.x + drift)),
    y: base.y + (Math.random() - 0.5) * 0.6,
    scale: base.scale,
    rotate: base.rotate + (Math.random() - 0.5) * 0.3,
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
    x: Math.max(-3.5, Math.min(3.5, frame.x)),
    y: Math.max(-2, Math.min(2, frame.y)),
    // Never zoom past 1: the whole ring must stay inside the screen.
    scale: Math.max(0.92, Math.min(1, frame.scale)),
    rotate: Math.max(-0.9, Math.min(0.9, frame.rotate)),
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




/**
 * Enabled scenes only: the admin panel can take any scene out of the rotation
 * live, and a weight of 0 has the same effect.
 */
function enabled<T extends { id: string }>(list: T[]): T[] {
  const open = list.filter((item) => weightOf(item.id) > 0);
  return open.length > 0 ? open : list;
}

/**
 * Strict least-recently-used draw with weights. A scene can only come back once
 * every other enabled scene in the pool has been played: the pick is always
 * made among the entries with the lowest weighted usage, so one full cycle runs
 * before any repetition. A weight above 1 simply lets a scene come round sooner
 * inside the next cycles.
 */
/**
 * Anti-repetition on the *type* of scene, not just the id: the last families
 * played (punch, kick, rope, throw, mat, clinch, taunt). Two different punches
 * still read as "another punch", so the scheduler refuses to chain more than
 * `maxFamilyStreak` of them, even inside one round.
 */
const recentFamilies: SceneFamily[] = [];
let maxFamilyStreak = VARIETY_DEFAULT.familyStreak;

export function setFamilyStreak(value: number) {
  maxFamilyStreak = Math.max(1, Math.round(value));
}

/** Live snapshot for the debug panel. */
export function familyTrace(): SceneFamily[] {
  return recentFamilies.slice(-8);
}

function drawLRU<T extends { id: string }>(
  pool: T[],
  usage: Map<string, number>,
  recent: string[],
  cooldowns?: Map<string, number>,
  cooldownMs = 0,
  prefer?: (item: T) => boolean,
): T {
  advanceSceneBeat();
  const unique = enabled(Array.from(new Map(pool.map((item) => [item.id, item])).values()));
  // Everything with the lowest weighted usage is still "unplayed" in this cycle.
  const cost = (id: string) => (usage.get(id) ?? 0);
  let lowest = Infinity;
  for (const item of unique) lowest = Math.min(lowest, cost(item.id));
  let list = unique.filter((item) => cost(item.id) <= lowest + 1e-6);
  const now = performance.now();
  // Highest priority: the *footage*. Many move names share one video window, so
  // a different label is not a different animation. Never play the same visual
  // sequence twice in a row, and strongly avoid it for the next few scenes.
  const seqOf = (item: T) => visualSequenceIdOf(item as unknown as { id: string });
  const freshVisual = list.filter((item) => !isVisualSequenceRecent(seqOf(item)));
  if (freshVisual.length > 0) list = freshVisual;
  else {
    const last = lastVisualSequence();
    const notLast = list.filter((item) => seqOf(item) !== last);
    if (notLast.length > 0) list = notLast;
    else sceneBlocked("visual sequence pool exhausted");
  }
  // Inside the cycle, avoid what was just seen and what is still cooling down.
  const blocked = new Set(recent.slice(-Math.max(1, Math.floor(unique.length / 2))));
  const notRecent = list.filter((item) => !blocked.has(item.id));
  if (notRecent.length > 0) list = notRecent;
  if (cooldowns && cooldownMs > 0) {
    const cool = list.filter((item) => now - (cooldowns.get(item.id) ?? -Infinity) >= cooldownMs);
    if (cool.length > 0) list = cool;
  }
  // Type-level anti-repetition: drop the families that already ran too often
  // in a row (or that dominate the recent window). Applied before the softer
  // continuity/round filters so those can never bring a tired family back.
  const varied = list.filter(
    (item) => !familyBlocked(item as { label?: string }, recentFamilies, maxFamilyStreak),
  );
  if (varied.length > 0) list = varied;

  // Continuity: among the eligible scenes, favour the ones that carry on from
  // where the picture is right now, so the cut reads as one continuous action.
  if (prefer) {
    const smooth = list.filter(prefer);
    if (smooth.length > 0) list = smooth;
  }
  // Round colour: each round leans towards a different family of scenes
  // (striking, kicks, rope work, throws, mat work) so the match never repeats
  // the same rhythm. Soft filter — the LRU cycle stays in charge.
  if (Math.random() < 0.7) {
    const themed = list.filter((item) => inRoundTheme(item as { label?: string }));
    if (themed.length > 0) list = themed;
  }
  const chosen = list[Math.floor(Math.random() * list.length)]!;
  // Weighted cost: a heavier scene "ages" more slowly and returns sooner.
  usage.set(chosen.id, cost(chosen.id) + 1 / Math.max(0.25, weightOf(chosen.id)));
  cooldowns?.set(chosen.id, now);
  recent.push(chosen.id);
  if (recent.length > unique.length) recent.shift();
  recentFamilies.push(familyOf(chosen as { id: string; label?: string }));
  if (recentFamilies.length > 12) recentFamilies.shift();
  noteVisualSequence(seqOf(chosen));

  return chosen;
}


function drawIdle(
  usage: Map<string, number>,
  recent: string[],
  from?: number,
): IdleScene {
  return drawLRU(
    IDLE_SCENES,
    usage,
    recent,
    undefined,
    0,
    from === undefined ? undefined : (scene) => Math.abs(scene.start - from) < 2.5,
  );
}

/**
 * Pool for a gift: the moves whose physical kind matches the gift (rose = a
 * strike, rocket = a throw) at that power tier, widened to the neighbouring
 * tiers so a stream of the same gift still produces different scenes.
 */
function movesForGift(giftId: string, tier: number): Move[] {
  const kinds = ruleFor(giftId).kinds;
  const exact = MOVES.filter((move) => move.tier === tier);
  const near = MOVES.filter((move) => Math.abs(move.tier - tier) <= 1);
  const matching = near.filter((move) => kinds.includes(kindOf(move)));
  // Weight: the gift's own kind first, then the exact tier, then the neighbours.
  const pool = [...matching, ...matching, ...exact, ...near];
  return pool.length > 0 ? pool : MOVES;
}


/** Moves use the same strict LRU cycle, with the arguments kept in the old order. */
function drawMove(
  pool: Move[],
  recent: string[],
  usage: Map<string, number>,
  cooldowns?: Map<string, number>,
  cooldownMs = 0,
): Move {
  return drawLRU(pool, usage, recent, cooldowns, cooldownMs);
}


/**
 * Varied entry: start a touch before the scripted window when there is room, so
 * the same move does not always open on the identical frame.
 */
function entryOf(move: Move, jitter = 1): number {
  const room = Math.min(0.32, Math.max(0, move.start - 0.15)) * Math.max(0, Math.min(1, jitter));
  return move.start - Math.random() * room;
}


type FloatItem = {
  id: string;
  emoji: string;
  side: Side;
  left: number;
  /** Localized gift name shown next to the symbol. */
  name: string;
  /** Point value of the gift, so heavy gifts read bigger on the ring. */
  value: number;
};
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
  /**
   * Confirmation that a gift produced exactly one landed hit. Fired at the
   * frame of contact, so voice and subtitles are in sync with the impact.
   */
  onHit?: (hit: {
    eventId: string;
    side: Side;
    gift: string;
    kind: HitKind;
    label: string;
    force: number;
  }) => void;
  /** A scene started without a gift (feeling-out, rope work, mat scramble). */
  onScene?: (scene: { id: string; label: string }) => void;
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
  onHit,
  onScene,
}: Props) {
  const logRef = useRef(onLog);
  logRef.current = onLog;
  const hitRef = useRef(onHit);
  hitRef.current = onHit;
  const sceneRef = useRef(onScene);
  sceneRef.current = onScene;
  const videoRefs = useRef<Array<HTMLVideoElement | null>>(Array(SLOTS).fill(null));
  const activeLayerRef = useRef(0);
  const activeVideoRef = useRef<HTMLVideoElement | null>(null);
  const switchingRef = useRef(false);
  const switchTokenRef = useRef(0);
  const seen = useRef<Set<string>>(new Set());
  /** Gift ids whose hit has already landed — the exactly-once guarantee. */
  const delivered = useRef<Set<string>>(new Set());
  /** When each gift entered the queue, used by the reconciliation pass. */
  const queuedAt = useRef<Map<string, number>>(new Map());
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
  /** When the scene on screen started — the minimum-duration rule uses it. */
  const sceneStartedAt = useRef(0);
  /** Physical position of the two fighters, for the state-aware selector. */
  const fightState = useRef<FightContext>(INITIAL_FIGHT_CONTEXT);
  /** LRU memory of the feeling-out scenes, so none of them repeats early. */
  const idleUsage = useRef<Map<string, number>>(new Map());
  const recentIdle = useRef<string[]>([]);

  const follow = useRef<{ event: GiftEvent; move: Move } | null>(null);
  const primed = useRef(false);
  /** A KO may be scored during a move, but its replay must never cut that move. */
  const handledKo = useRef<Side | null>(null);
  const pendingKo = useRef<Side | null>(null);
  const roundNo = useRef(0);

  const varietyRef = useRef(variety);
  varietyRef.current = variety;
  // Keep the type-level anti-repetition guard in sync with the referee slider.
  setFamilyStreak(variety.familyStreak);
  /** Last time each move was played — drives the referee cooldown control. */
  const moveCooldowns = useRef<Map<string, number>>(new Map());
  const followCooldowns = useRef<Map<string, number>>(new Map());

  const cfg = DIFFICULTY_CONFIG[difficulty];
  const cfgRef = useRef(cfg);
  cfgRef.current = cfg;

  // Low-power phones: skip the per-hit colour grading repaint and thin out the
  // particle overlays. Detection is shared (device heuristics + live FPS).
  const lite = usePerfMode();


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
    {
      id: string;
      side: Side;
      force: number;
      life: number;
      count: number;
      /** Contact point in the ring frame (%), so sparks sit on the bodies. */
      left: number;
      top: number;
    }[]
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
  const switchScene = (time: number, rate: number, force = false, src?: string) => {
    if (!force && isLocked()) return false;
    const previous = activeVideoRef.current;
    const reel = reelIndexOf(src);
    // Pick the free decode slot of the target reel (never the visible one).
    const first = reel * 2;
    const nextLayer = activeLayerRef.current === first ? first + 1 : first;
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
    if (next.readyState < 1) {
      next.addEventListener(
        "loadedmetadata",
        () => {
          next.addEventListener("seeked", reveal, { once: true });
          seek(next, time);
        },
        { once: true },
      );
      next.load();
      return true;
    }
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

  // Gift intake: every gift enters an ordered queue, exactly once. The `seen`
  // set is the de-duplication guard (realtime can deliver the same row twice,
  // and a reload re-reads the history), `queued` tracks what is still waiting.
  useEffect(() => {
    if (!primed.current) {
      if (events.length === 0) return;
      for (const event of events) {
        seen.current.add(event.id);
        delivered.current.add(event.id);
      }
      primed.current = true;
      return;
    }
    for (const event of events) {
      if (seen.current.has(event.id)) continue;
      seen.current.add(event.id);
      queuedAt.current.set(event.id, performance.now());
      queue.current.push(event);
    }
    // Burst protection: keep the queue bounded, always dropping the oldest.
    if (queue.current.length > 24) {
      const dropped = queue.current.splice(0, queue.current.length - 24);
      for (const item of dropped) {
        queuedAt.current.delete(item.id);
        delivered.current.add(item.id); // consciously skipped, never retried
        logRef.current?.("impact", `queue overflow · ${item.gift} (${item.side}) skipped`);
      }
    }
  }, [events]);

  // Reconciliation: a gift must trigger exactly one hit. Anything that was
  // accepted but never landed (a lost scene switch, a tab going to sleep) is
  // pushed back into the queue; anything already landed can never fire twice.
  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = performance.now();
      const waiting = new Set(queue.current.map((item) => item.id));
      for (const event of events) {
        if (!seen.current.has(event.id)) continue;
        if (delivered.current.has(event.id) || waiting.has(event.id)) continue;
        if (currentEvent.current?.id === event.id || follow.current?.event.id === event.id) continue;
        const since = queuedAt.current.get(event.id) ?? 0;
        if (now - since < 12000) continue;
        queuedAt.current.set(event.id, now);
        queue.current.push(event);
        logRef.current?.("impact", `reconcile · re-queued ${event.gift} (${event.side})`);
      }
    }, 4000);
    return () => window.clearInterval(timer);
  }, [events]);


  // Knockout: finish the active move first, then replay the finish in slow motion.
  // This prevents a gift that reaches zero HP from cutting a lift, throw or fall.
  useEffect(() => {
    if (!ko) {
      handledKo.current = null;
      pendingKo.current = null;
      setShowReplayPanel(false);
      koReplayRef.current = null;
      // A new round starts here: staged configuration imports go live now.
      commitPendingConfig("round");
      // Next round leans on a different family of scenes.
      roundNo.current += 1;
      setSceneRound(roundNo.current);
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
    setFrame(clampFrame({ x: 0, y: 0.5, scale: 1, rotate: 0 }));
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
    switchScene(Math.max(0, finisher.impact - 1.2), 0.45, true, finisher.src);

    // Instant replay of the finish, re-runnable from the panel below.
    const runReplay = () => {
      setShowReplayPanel(false);
      setReplay(true);
      logRef.current?.("replay", "instant replay");
      switchScene(Math.max(0, finisher.impact - 1.2), 0.4, true, finisher.src);
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
      switchScene(finisher.impact, 0.35, true, finisher.src);
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
      const rules = getSceneConfig().transitions;
      // Animation lock: no new command while a sequence is still running.
      if (isLocked()) {
        sceneBlocked("animation lock — scene still running");
        return;
      }
      // Minimum duration: even a short window is protected, so nothing can cut
      // a scene a few frames after it started.
      if (performance.now() - sceneStartedAt.current < rules.minSceneMs + rules.tailMs) {
        sceneBlocked(`min duration ${rules.minSceneMs}ms + tail ${rules.tailMs}ms`);
        return;
      }
      // Lock released and a KO is waiting: hand control to the replay sequence.
      if (pendingKo.current) {
        setCompletedSequences((value) => value + 1);
        return;
      }

      // Feeling-out phase: rotate through different idle scenarios.
      const scene = idleScene.current;
      const idleOver = video.currentTime < scene.start || video.currentTime > scene.end;
      const giftWaiting = queue.current.length > 0 || follow.current !== null;
      // An idle scenario is played to its end as well, unless the admin allows
      // a gift to cut in.
      if (!idleOver && giftWaiting && rules.lockIdle && !rules.allowGiftInterrupt) {
        if (video.paused && !paused) {
          video.playbackRate = scene.rate * cfgRef.current.speed;
          void video.play();
        }
        sceneBlocked("idle scene protected until its end");
        return;
      }
      if (video.paused || idleOver) {
        if (idleOver) {
          // Safe boundary: the previous scene finished, so a staged
          // configuration import can be applied without cutting the action.
          commitPendingConfig("scene");
          const next = drawIdle(idleUsage.current, recentIdle.current, video.currentTime);
          idleScene.current = next;
          const rate = next.rate * cfgRef.current.speed;
          switchScene(next.start, rate, false, next.src);
          sceneStartedAt.current = performance.now();
          // Hold the scene for its full window: nothing may cut into it.
          if (rules.lockIdle && !rules.allowGiftInterrupt) {
            lockUntil.current =
              performance.now() + Math.max(0, ((next.end - next.start) / rate) * 1000 - 120);
          }
          sceneRef.current?.({ id: next.id, label: next.label });
          sceneStarted({
            id: next.id,
            label: next.label,
            group: "idle",
            plannedMs: ((next.end - next.start) / rate) * 1000,
            reason: "previous scene finished",
          });
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



      const tier = ruleForEvent(event.id, event.gift).tier;
      // State-aware selection: illegal positions are removed FIRST, the existing
      // LRU / anti-repetition draw then runs on the legal subset. Scenes that are
      // not migrated to the state layer stay unconstrained.
      const stateBefore = fightState.current;
      const choice = pendingFollow
        ? {
            pick: pendingFollow.move,
            definition: moveDefinitionOf(pendingFollow.move),
            source: "state" as const,
            filtered: false,
          }
        : chooseStateAwareMove({
            context: stateBefore,
            pool: movesForGift(event.gift, tier),
            globalPool: STATE_AWARE_SCENES,
            recoveryPool: STATE_AWARE_RECOVERY_SCENES,
            definitionOf: moveDefinitionOf,
            draw: (pool) =>
              drawMove(
                pool,
                recentMoves.current,
                moveUsage.current,
                moveCooldowns.current,
                varietyRef.current.cooldownMs,
              ),
          });
      const move = choice.pick;
      if (!move) {
        // Strict mode found nothing legal: wait instead of playing an
        // unmigrated move. The event is kept for the next tick.
        queue.current.unshift(event);
        fightStateTrace({
          from: stateBefore,
          move: "—",
          to: stateBefore,
          source: choice.source,
          filtered: choice.filtered,
        });
        sceneBlocked("no legal move (state engine)");
        return;
      }
      if (choice.definition) fightState.current = applyMoveResult(stateBefore, choice.definition);
      fightStateTrace({
        from: stateBefore,
        move: move.label,
        to: fightState.current,
        source: choice.source,
        filtered: choice.filtered,
      });



      recentMoves.current = [...recentMoves.current, move.id].slice(
        -Math.max(cfgRef.current.moveMemory, varietyRef.current.rotation),
      );

      // Chance of a follow-up: high after a big spot, still possible after a
      // chained one so we get 2-3 spot sequences without visible repetition.
      const base = pendingFollow ? 0.4 : tier >= 4 ? 0.85 : tier === 3 ? 0.55 : 0.15;
      const chance = Math.min(0.95, base * cfgRef.current.followChance);
      if (Math.random() < chance) {
        // Follow-ups are chosen from the position the main move leaves behind,
        // so pins/submissions can only be queued on a downed opponent.
        const next = chooseStateAwareMove({
          context: fightState.current,
          pool: FOLLOW_UPS,
          globalPool: STATE_AWARE_SCENES,
          recoveryPool: STATE_AWARE_RECOVERY_SCENES,
          definitionOf: moveDefinitionOf,
          draw: (pool) =>
            drawMove(
              pool,
              recentFollows.current,
              followUsage.current,
              followCooldowns.current,
              varietyRef.current.cooldownMs * 0.5,
            ),
        }).pick;
        if (next) {
          recentFollows.current = [...recentFollows.current, next.id].slice(
            -cfgRef.current.followMemory,
          );

          follow.current = {
            event: { ...event, id: `${event.id}-fu${Math.random().toString(36).slice(2, 6)}` },
            move: next,
          };
        }
      }


      const gift = GIFT_BY_ID[event.gift];
      const giftSetting = getGiftConfig()[event.gift];

      currentEvent.current = event;
      currentMove.current = move;
      playing.current = true;
      impacted.current = false;
      settling.current = false;
      // Collisions: contact is clamped inside the window and the end of the
      // scene is stretched when needed, so the blow always plays through its
      // follow-through instead of being cut on the frame of impact.
      const moveKindNow = kindOf(move);
      stopAt.current = completionEndOf(move, moveKindNow);
      const entry = entryOf(move, varietyRef.current.entryJitter);
      // Hold the lock for at least the length of this move at its playback rate,
      // so nothing can cut the scene before it has played out.
      lockUntil.current =
        performance.now() + ((stopAt.current - entry) / (move.rate * cfgRef.current.speed)) * 1000;

      impactAt.current = impactTimeOf(move, moveKindNow);
      setAttacker(event.side);
      setFloats((previous) => [
        ...previous.slice(-3),
        {
          id: event.id,
          emoji: giftSetting?.emoji ?? gift?.emoji ?? "🌹",
          side: event.side,
          left: event.side === "ru" ? 8 + Math.random() * 22 : 70 + Math.random() * 20,
          name: giftSetting?.phrases[lang] ?? giftName(event.gift, lang),
          value: gift?.value ?? 1,
        },
      ]);

      logRef.current?.("move", `${event.side.toUpperCase()} · ${move.label}`);
      // Move the wide shot to this block's corner of the ring.
      const shot = frameFor(move);
      baseFrame.current = shot;
      setPhase("windup");
      setFrame(clampFrame(shot));
      switchScene(entry, move.rate * cfgRef.current.speed, true, move.src);
      sceneStartedAt.current = performance.now();
      sceneStarted({
        id: move.id,
        label: move.label,
        group: pendingFollow ? "follow" : "move",
        plannedMs: lockUntil.current - performance.now(),
        reason: pendingFollow ? "follow-up spot" : `gift ${event.gift} (${event.side})`,
      });


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
      const base = HIT_PROFILE[kind];
      // Admin tuning: the gift decides how hard this blow reads and how long
      // the defender stays shaken.
      const rule = ruleForEvent(event.id, event.gift);
      const profile = {
        ...base,
        force: base.force * rule.force,
        stun: base.stun * rule.stun,
      };
      koKind.current = kind;
      // Exactly-once confirmation: one gift id, one landed hit, one voice line.
      const rootId = event.id.split("-fu")[0]!;
      if (!delivered.current.has(rootId)) {
        delivered.current.add(rootId);
        queuedAt.current.delete(rootId);
        hitRef.current?.({
          eventId: rootId,
          side: event.side,
          gift: event.gift,
          kind,
          label: move.label,
          force: profile.force,
        });
      }
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
      // Sparks live exactly as long as the stun plus the landing/recovery beat,
      // and they are drawn on the real contact point between the two bodies.
      const sparkLife = Math.round(profile.stun + profile.recovery * 520);
      const point = contactPointOf(move, kind, event.side, kind === "throw" || kind === "aerial");
      const burst = {
        id: event.id,
        side: defender,
        force: profile.force,
        life: lite ? Math.min(sparkLife, 420) : sparkLife,
        // Weak devices still get a spark hit, just with far fewer nodes.
        count: lite ? 5 : Math.round(8 + profile.force * 10 + move.tier * 2),
        left: point.left,
        top: point.top,
      };
      {
        // One burst at a time on lite devices, up to three otherwise.
        setSparks((previous) => (lite ? [burst] : [...previous.slice(-2), burst]));
        window.setTimeout(
          () => setSparks((previous) => previous.filter((item) => item.id !== burst.id)),
          burst.life,

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
      // Guarantee the follow-through: from the frame of contact the scene keeps
      // rolling long enough for the blow to finish on screen, and the lock is
      // extended with it so nothing can cut in.
      const throughTo = Math.min(39.8, video.currentTime + followThroughOf(kind));
      if (throughTo > stopAt.current) {
        stopAt.current = throughTo;
        const rate = Math.max(0.55, move.rate * cfgRef.current.speed);
        lockUntil.current = Math.max(
          lockUntil.current,
          performance.now() + ((throughTo - video.currentTime) / rate) * 1000,
        );
      }
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
      idleScene.current = drawIdle(idleUsage.current, recentIdle.current, video.currentTime);
      sceneStartedAt.current = performance.now();
      sceneStarted({
        id: idleScene.current.id,
        label: idleScene.current.label,
        group: "idle",
        plannedMs:
          ((idleScene.current.end - idleScene.current.start) /
            (idleScene.current.rate * cfgRef.current.speed)) *
          1000,
        reason: "move played to the end",
      });

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
      switchScene(
        idleScene.current.start,
        idleScene.current.rate * cfgRef.current.speed,
        true,
        idleScene.current.src,
      );

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
          {Array.from({ length: SLOTS }, (_, i) => i).map((layer) => (
            <video
              key={layer}
              ref={(element) => {
                videoRefs.current[layer] = element;
                if (layer === 0 && element && !activeVideoRef.current) {
                  activeVideoRef.current = element;
                }
              }}
              src={REELS[Math.floor(layer / 2)] ?? FIGHT_VIDEO}
              muted
              autoPlay={layer === 0}
              loop
              playsInline
              preload={layer < 2 ? "auto" : "metadata"}
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
              data-active={layer === activeLayer ? "true" : undefined}
              className="arena-video absolute inset-0 size-full object-contain object-center transition-[filter,opacity]"
            />
          ))}

          {/* Impact sparks — density and spread follow the force of the hit. */}
          {sparks.map((burst) => (
            <div
              key={burst.id}
              className="spark-burst"
              style={{
                left: `${burst.left}%`,
                top: `${burst.top}%`,
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

      {/* Gift effects live on the ring itself: symbol, name and value rise out
          of the fighter's corner. No widgets, no chat, nothing under the mat. */}
      <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
        {floats.map((item) => (
          <div
            key={item.id}
            className="gift-float absolute bottom-[26%] flex flex-col items-center"
            style={{
              left: `${item.left}%`,
              ["--gift-scale" as string]: String(Math.min(1.9, 0.85 + item.value / 24)),
            }}
          >
            <span className="text-3xl drop-shadow-[0_2px_10px_rgba(0,0,0,0.7)] sm:text-5xl">
              {item.emoji}
            </span>
            <span
              className="display text-[10px] tracking-widest text-outline sm:text-xs"
              style={{ color: item.side === "ru" ? "var(--ru)" : "var(--us)" }}
            >
              {item.name} +{item.value}
            </span>
          </div>
        ))}
      </div>

      {/* Name of the technique currently executed in the ring — small tag on the
          side of the attacker, so the wrestling vocabulary is visible without
          covering the fighters. */}
      {impact && !ko && (
        <div
          className={`pointer-events-none absolute top-[16%] z-20 max-w-[40vw] ${
            impact.side === "ru" ? "right-[3%] text-right" : "left-[3%] text-left"
          }`}
        >
          <div className="display animate-fade-in text-xs tracking-widest text-gold text-outline sm:text-lg">
            {impact.label}
          </div>
        </div>
      )}


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
