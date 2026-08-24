import { describe, expect, it } from "vitest";
import {
  chooseStateAwareMove,
  defineMove,
  type FightContext,
  type MoveDefinition,
} from "@/lib/fightState";

const scene = (id: string) => ({
  id,
  label: id,
  tier: 1,
  start: 0,
  end: 1,
  impact: 0.5,
  rate: 1,
});

const define = (id: string, spec: Parameters<typeof defineMove>[1]): MoveDefinition =>
  defineMove(scene(id) as never, spec);

const jab = define("jab", {
  family: "punch",
  requires: { attacker: ["standing"], defender: ["standing"] },
  result: { relation: "close_range" },
});
const splash = define("splash", {
  family: "aerial",
  requires: { attacker: ["top_rope"], defender: ["grounded"] },
  result: { attacker: "grounded" },
});
const recovery = define("back-up", {
  family: "recovery",
  requires: { defender: ["grounded", "kneeling", "recovering"] },
  result: { attacker: "standing", defender: "standing", relation: "distance" },
});

const definitions = new Map<string, MoveDefinition>([
  ["jab", jab],
  ["splash", splash],
  ["back-up", recovery],
]);
const definitionOf = (item: { id: string }) => definitions.get(item.id);
const draw = <T,>(pool: T[]) => pool[0] as T;

const neutral: FightContext = { attacker: "standing", defender: "standing", relation: "distance" };
const downed: FightContext = {
  attacker: "standing",
  defender: "grounded",
  relation: "close_range",
};

describe("chooseStateAwareMove in strict mode", () => {
  it("never selects an unmigrated move", () => {
    const result = chooseStateAwareMove({
      context: neutral,
      pool: [scene("legacy-1"), scene("legacy-2")],
      definitionOf,
      draw,
      strict: true,
    });
    expect(result.pick).toBeUndefined();
    expect(result.source).toBe("state-idle");
  });

  it("prefers a legal migrated move from the local pool", () => {
    const result = chooseStateAwareMove({
      context: neutral,
      pool: [scene("legacy-1"), scene("jab")],
      definitionOf,
      draw,
      strict: true,
    });
    expect(result.pick?.id).toBe("jab");
    expect(result.source).toBe("state");
  });

  it("falls back to the global migrated pool", () => {
    const result = chooseStateAwareMove({
      context: neutral,
      pool: [scene("splash")],
      globalPool: [scene("jab")],
      definitionOf,
      draw,
      strict: true,
    });
    expect(result.pick?.id).toBe("jab");
    expect(result.source).toBe("state-global");
  });

  it("falls back to recovery when nothing else is legal", () => {
    const result = chooseStateAwareMove({
      context: downed,
      pool: [scene("splash")],
      globalPool: [scene("splash")],
      recoveryPool: [scene("back-up")],
      definitionOf,
      draw,
      strict: true,
    });
    expect(result.pick?.id).toBe("back-up");
    expect(result.source).toBe("state-recovery");
  });

  it("idles instead of using legacy fallback", () => {
    const result = chooseStateAwareMove({
      context: neutral,
      pool: [scene("legacy-1")],
      globalPool: [scene("splash")],
      recoveryPool: [scene("back-up")],
      definitionOf,
      draw,
      strict: true,
    });
    expect(result.source).toBe("state-idle");
    expect(result.source).not.toBe("legacy-fallback");
    expect(result.pick).toBeUndefined();
  });

  it("keeps legacy fallback available when strict is off", () => {
    const result = chooseStateAwareMove({
      context: neutral,
      pool: [scene("legacy-1")],
      definitionOf,
      draw,
      strict: false,
    });
    expect(result.pick?.id).toBe("legacy-1");
    expect(result.source).toBe("state");
  });
});
