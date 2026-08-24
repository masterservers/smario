import { describe, expect, it } from "vitest";
import {
  canPlayMove,
  chooseStateAwareMove,
  INITIAL_FIGHT_CONTEXT,
  type FightContext,
} from "@/lib/fightState";
import { moveDefinitionOf, STATE_AWARE_MOVES } from "@/lib/stateAwareMoves";

const def = (id: string) => {
  const definition = STATE_AWARE_MOVES.get(id);
  if (!definition) throw new Error(`missing migrated move: ${id}`);
  return definition;
};

const ctx = (over: Partial<FightContext>): FightContext => ({ ...INITIAL_FIGHT_CONTEXT, ...over });

describe("phase 2 — strikes & kicks migration", () => {
  it("migrates the requested strike/kick catalog", () => {
    for (const id of [
      "w-knife-edge-chop",
      "w-clothesline",
      "w-superkick",
      "w-dropkick",
      "w-stomp",
      "w-shining-wizard",
    ]) {
      expect(STATE_AWARE_MOVES.has(id)).toBe(true);
    }
  });

  it("a close-range punch cannot play from the top rope", () => {
    const chop = def("w-knife-edge-chop");
    expect(canPlayMove(chop, ctx({ relation: "close_range" }))).toBe(true);
    expect(canPlayMove(chop, ctx({ attacker: "top_rope", relation: "close_range" }))).toBe(false);
  });

  it("a stomp cannot play against a standing defender", () => {
    const stomp = def("w-stomp");
    expect(canPlayMove(stomp, ctx({ defender: "standing" }))).toBe(false);
    expect(canPlayMove(stomp, ctx({ defender: "grounded" }))).toBe(true);
  });

  it("a running strike requires a legal standing defender", () => {
    const clothesline = def("w-clothesline");
    expect(canPlayMove(clothesline, ctx({ attacker: "running", defender: "standing" }))).toBe(true);
    expect(canPlayMove(clothesline, ctx({ defender: "grounded" }))).toBe(false);
  });

  it("a heavy strike puts the defender on the mat", () => {
    expect(def("w-big-boot").result.defender).toBe("grounded");
    expect(def("w-spear").result.defender).toBe("grounded");
  });

  it("a light strike keeps both fighters standing", () => {
    const light = def("w-chest-chop");
    expect(light.result.defender).toBe("standing");
    expect(light.result.attacker).toBe("standing");
  });

  it("unmigrated moves stay blocked in strict mode", () => {
    const pool = [{ id: "not-migrated-scene" }];
    const choice = chooseStateAwareMove({
      context: ctx({ relation: "close_range" }),
      pool,
      definitionOf: moveDefinitionOf,
      draw: (items) => items[0]!,
    });
    expect(choice.pick).toBeUndefined();
    expect(choice.source).toBe("state-idle");
  });

  it("falls back to a legal migrated strike from the global pool", () => {
    const choice = chooseStateAwareMove({
      context: ctx({ relation: "close_range" }),
      pool: [{ id: "not-migrated-scene" }],
      globalPool: [{ id: "w-chest-chop" }, { id: "w-stomp" }],
      definitionOf: moveDefinitionOf,
      draw: (items) => items[0]!,
    });
    expect(choice.source).toBe("state-global");
    expect(choice.pick?.id).toBe("w-chest-chop");
  });
});
