/**
 * Automated sync test: simulates every move family (punch, kick, ropes, throw,
 * mat, clinch) plus gift-driven hits and checks that the commentator's voice
 * line lands inside the correct window around the impact frame.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { announceHit, announceSpar, stopCommentary, useCommentary, type CommentaryLine } from "./useCommentary";
import { FAMILY_LINES } from "@/lib/familyLines";
import { familyOf } from "@/lib/scenes";
import { sideVoiceNames } from "@/lib/adminConfig";
import type { BattleState, GiftEvent } from "@/lib/battle";

/** Voice must start no later than this after the impact frame. */
const MAX_LAG_MS = 700;

type Spoken = { text: string; at: number };
const spoken: Spoken[] = [];

function installSpeechMock() {
  class Utterance {
    text: string;
    lang = "";
    rate = 1;
    pitch = 1;
    volume = 1;
    voice: unknown = null;
    onend: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor(text: string) {
      this.text = text;
    }
  }
  (globalThis as Record<string, unknown>)["SpeechSynthesisUtterance"] = Utterance;
  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: {
      speak: (u: Utterance) => {
        spoken.push({ text: u.text, at: Date.now() });
        window.setTimeout(() => u.onend?.(), 20);
      },
      cancel: () => {},
      getVoices: () => [],
      addEventListener: () => {},
      removeEventListener: () => {},
    },
  });
}

const STATE: BattleState = {
  scoreRu: 0,
  scoreUs: 0,
  hpRu: 100,
  hpUs: 100,
  comboSide: null,
  combo: 0,
  ko: null,
};

/** All lines ever emitted (the hook itself keeps only the last few). */
let captured: CommentaryLine[] = [];
const seenIds = new Set<string>();

function Probe({ events }: { events: GiftEvent[] }) {
  const lines = useCommentary("en", events, STATE, false);
  for (const line of lines) {
    if (seenIds.has(line.id)) continue;
    seenIds.add(line.id);
    captured.push(line);
  }
  return null;
}

function lastLine() {
  return captured[captured.length - 1];
}

/** Every line the pack can produce for a family, with our two fighters. */
function actionLinesFor(label: string) {
  const family = familyOf({ label });
  const names = sideVoiceNames("en");
  return FAMILY_LINES.en[family].action
    .map((fn) => fn(names.ru, names.us))
    .concat(FAMILY_LINES.en[family].action.map((fn) => fn(names.us, names.ru)));
}

/** Let the speech queue drain and the per-tone cooldown expire. */
async function settle(ms = 2400) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

beforeEach(() => {
  spoken.length = 0;
  captured = [];
  seenIds.clear();
  vi.useFakeTimers();
  installSpeechMock();
  stopCommentary(); // reset the shared voice lane between tests
});

afterEach(() => {
  vi.useRealTimers();
});

const SEED: GiftEvent = {
  id: "seed",
  side: "ru",
  gift: "rose",
  value: 1,
  sender: "seed",
  created_at: new Date(0).toISOString(),
};

const MOVES: Array<{ label: string; family: string }> = [
  { label: "RIGHT HOOK", family: "punch" },
  { label: "HIGH KICK", family: "kick" },
  { label: "ROPE DIVE", family: "rope" },
  { label: "GERMAN SUPLEX THROW", family: "throw" },
  { label: "GROUND AND POUND ON THE MAT", family: "mat" },
  { label: "CLINCH IN THE CORNER", family: "clinch" },
];

describe("commentary / impact synchronisation", () => {
  it("calls each sparring move family at the impact frame", async () => {
    render(<Probe events={[]} />);
    await settle();

    for (const move of MOVES) {
      expect(familyOf({ label: move.label })).toBe(move.family);
      const before = spoken.length;
      const linesBefore = captured.length;
      const impactAt = Date.now();

      act(() => announceSpar({ side: "ru", label: move.label, tier: 3 }));

      // The caption is published on the impact frame itself.
      expect(captured.length).toBe(linesBefore + 1);
      expect(actionLinesFor(move.label)).toContain(lastLine().text);

      await settle();
      const text = captured[linesBefore].text;
      const call = spoken.slice(before).find((s) => s.text === text);
      expect(call, `no voice for ${move.label}`).toBeTruthy();
      expect(call!.at - impactAt).toBeGreaterThanOrEqual(0);
      expect(call!.at - impactAt).toBeLessThanOrEqual(MAX_LAG_MS);
    }
  });

  it("waits for the arena impact before calling a gift hit", async () => {
    const event: GiftEvent = {
      id: "g1",
      side: "ru",
      gift: "rose",
      value: 1,
      sender: "tester",
      created_at: new Date().toISOString(),
    };
    const view = render(<Probe events={[SEED]} />);
    await settle();

    act(() => {
      view.rerender(<Probe events={[SEED, event]} />);
    });
    const linesBefore = captured.length;
    const spokenBefore = spoken.length;

    // Nothing may be said while the blow is still travelling.
    await settle(400);
    expect(captured.length).toBe(linesBefore);
    expect(spoken.length).toBe(spokenBefore);

    const impactAt = Date.now();
    act(() => announceHit({ eventId: "g1", side: "ru", gift: "rose", kind: "hit", label: "LEFT JAB" }));

    expect(captured.length).toBe(linesBefore + 1);
    expect(actionLinesFor("LEFT JAB")).toContain(lastLine().text);

    await settle();
    const text = captured[linesBefore].text;
    const call = spoken.slice(spokenBefore).find((s) => s.text === text);
    expect(call, "the gift hit was never voiced").toBeTruthy();
    expect(call!.at - impactAt).toBeGreaterThanOrEqual(0);
    expect(call!.at - impactAt).toBeLessThanOrEqual(MAX_LAG_MS);
  });

  it("falls back after the impact window and never doubles the call", async () => {
    const event: GiftEvent = {
      id: "g2",
      side: "us",
      gift: "rose",
      value: 1,
      sender: "tester",
      created_at: new Date().toISOString(),
    };
    const view = render(<Probe events={[SEED]} />);
    await settle();

    act(() => {
      view.rerender(<Probe events={[SEED, event]} />);
    });
    const linesBefore = captured.length;

    await settle(1000);
    expect(captured.length).toBe(linesBefore);

    // Fallback fires once the confirmation clearly failed to arrive.
    await settle(4000);
    expect(captured.length).toBe(linesBefore + 1);

    const afterFallback = captured.length;
    act(() => announceHit({ eventId: "g2", side: "us", gift: "rose", kind: "hit", label: "RIGHT HOOK" }));
    await settle();
    expect(captured.length).toBe(afterFallback);
  });
});
