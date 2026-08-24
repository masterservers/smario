import { describe, expect, it } from "vitest";
import {
  canPlayMove,
  chooseStateAwareMove,
  INITIAL_FIGHT_CONTEXT,
  type FightContext,
} from "@/lib/fightState";
import {
  ALIAS_IDS,
  MOVE_ALIASES,
  moveDefinitionOf,
  STATE_AWARE_MOVES,
} from "@/lib/stateAwareMoves";

const def = (id: string) => {
  const definition = STATE_AWARE_MOVES.get(id);
  if (!definition) throw new Error(`missing migrated move: ${id}`);
  return definition;
};

const ctx = (over: Partial<FightContext>): FightContext => ({ ...INITIAL_FIGHT_CONTEXT, ...over });

describe("phase 3 — grapples, throws, slams & suplexes", () => {
  it("migrates the requested grapple/throw/slam/suplex catalog", () => {
    for (const id of [
      "w-collar-and-elbow-tie-up",
      "w-hip-toss",
      "w-body-slam",
      "w-chokeslam",
      "w-ddt",
      "w-german-suplex",
      "w-superplex",
    ]) {
      expect(STATE_AWARE_MOVES.has(id)).toBe(true);
    }
  });

  it("a German suplex is illegal from neutral distance", () => {
    const german = def("w-german-suplex");
    expect(canPlayMove(german, ctx({ relation: "distance" }))).toBe(false);
    expect(canPlayMove(german, ctx({ relation: "attacker_behind" }))).toBe(true);
  });

  it("an ordinary suplex is legal from the clinch", () => {
    const suplex = def("w-suplex");
    expect(canPlayMove(suplex, ctx({ relation: "clinch" }))).toBe(true);
    expect(canPlayMove(suplex, ctx({ relation: "distance" }))).toBe(false);
  });

  it("a chokeslam grounds the defender and leaves the attacker standing", () => {
    const chokeslam = def("w-chokeslam");
    expect(chokeslam.result.defender).toBe("grounded");
    expect(chokeslam.result.attacker).toBe("standing");
  });

  it("a basic headlock does not automatically ground the defender", () => {
    const headlock = def("w-side-headlock");
    expect(headlock.result.defender).toBe("standing");
    expect(headlock.result.relation).toBe("clinch");
  });

  it("a superplex is illegal from an ordinary standing clinch", () => {
    const superplex = def("w-superplex");
    expect(canPlayMove(superplex, ctx({ relation: "clinch" }))).toBe(false);
    expect(
      canPlayMove(superplex, ctx({ attacker: "corner", defender: "corner", relation: "clinch" })),
    ).toBe(true);
  });

  it("a DDT cannot start when the fighters are far apart", () => {
    const ddt = def("w-ddt");
    expect(canPlayMove(ddt, ctx({ relation: "distance" }))).toBe(false);
    expect(canPlayMove(ddt, ctx({ relation: "clinch" }))).toBe(true);
  });

  it("power moves stay out of reach until a clinch has been built", () => {
    const tieUp = def("w-collar-and-elbow-tie-up");
    // distance -> close range approach -> clinch -> suplex
    expect(canPlayMove(tieUp, ctx({ relation: "close_range" }))).toBe(true);
    expect(tieUp.result.relation).toBe("clinch");
    expect(canPlayMove(def("w-body-slam"), ctx({ relation: "clinch" }))).toBe(true);
  });

  it("strict mode still blocks unmigrated moves", () => {
    const choice = chooseStateAwareMove({
      context: ctx({ relation: "clinch" }),
      pool: [{ id: "not-migrated-at-all" }],
      definitionOf: moveDefinitionOf,
      draw: (pool) => pool[0]!,
      strict: true,
    });
    expect(choice.pick?.id).not.toBe("not-migrated-at-all");
  });

  it("aliases share footage with a canonical move and cannot be selected", () => {
    expect(ALIAS_IDS.size).toBeGreaterThan(0);
    for (const [canonical, aliases] of Object.entries(MOVE_ALIASES)) {
      expect(STATE_AWARE_MOVES.has(canonical)).toBe(true);
      for (const alias of aliases) {
        // one visual sequence = one selectable move, so the alias is never a
        // second definition and cannot slip past family anti-repetition.
        expect(STATE_AWARE_MOVES.has(alias)).toBe(false);
        const choice = chooseStateAwareMove({
          context: ctx({ relation: "clinch" }),
          pool: [{ id: alias }],
          definitionOf: moveDefinitionOf,
          draw: (pool) => pool[0]!,
          strict: true,
        });
        expect(choice.pick?.id).not.toBe(alias);
      }
    }
  });
});
