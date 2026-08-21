import { z } from "zod";
import { ALL_SCENES } from "@/lib/scenes";
import { GIFTS, type GiftId } from "@/lib/battle";
import {
  defaultSceneConfig,
  getSceneConfig,
  saveSceneConfig,
  type SceneConfig,
} from "@/lib/sceneConfig";
import {
  HIT_KINDS,
  defaultHitConfig,
  getHitConfig,
  saveHitConfig,
  type HitConfig,
} from "@/lib/hitConfig";

/**
 * One JSON file that carries the whole fight configuration: the scene
 * rotation, the transition rules and the gift → hit mapping (force, stun and
 * referee counts). It is validated field by field before anything is applied,
 * previewed as a diff, and can be stored as a version in the backend.
 */

const giftIds = GIFTS.map((gift) => gift.id) as [GiftId, ...GiftId[]];
const knownScenes = new Set(ALL_SCENES.map((scene) => scene.id));

const transitionsSchema = z
  .object({
    minSceneMs: z.number({ invalid_type_error: "must be a number (ms)" }).min(0).max(4000),
    allowGiftInterrupt: z.boolean({ invalid_type_error: "must be true or false" }),
    lockIdle: z.boolean({ invalid_type_error: "must be true or false" }),
    tailMs: z.number({ invalid_type_error: "must be a number (ms)" }).min(0).max(800),
    debug: z.boolean({ invalid_type_error: "must be true or false" }),
  })
  .partial();

const sceneEntrySchema = z.object({
  id: z.string({ required_error: "the scene id is required" }).min(1),
  label: z.string().optional(),
  group: z.string().optional(),
  active: z.boolean({ invalid_type_error: "must be true or false" }).optional(),
  weight: z
    .number({ invalid_type_error: "must be a number between 0.25 and 4" })
    .min(0.25, "minimum weight is 0.25")
    .max(4, "maximum weight is 4")
    .optional(),
});

const hitRuleSchema = z
  .object({
    kinds: z
      .array(z.enum(HIT_KINDS as [string, ...string[]], { errorMap: () => ({ message: `allowed: ${HIT_KINDS.join(", ")}` }) }))
      .min(1, "at least one kind of blow"),
    tier: z.number().min(1, "minimum tier is 1").max(5, "maximum tier is 5"),
    force: z.number().min(0.4, "minimum force is 0.4").max(2, "maximum force is 2"),
    stun: z.number().min(0.4, "minimum stun is 0.4").max(2, "maximum stun is 2"),
  })
  .partial();

const hitsSchema = z
  .object({
    gifts: z.record(z.enum(giftIds), hitRuleSchema).optional(),
    referee: z
      .object({
        knockdownCount: z.number().min(3).max(12),
        finalCount: z.number().min(5).max(20),
        countMs: z.number().min(400).max(2000),
        resumeDelayMs: z.number().min(0).max(5000),
      })
      .partial()
      .optional(),
  })
  .partial();

export const bundleSchema = z
  .object({
    version: z.number().optional(),
    exportedAt: z.string().optional(),
    transitions: transitionsSchema.optional(),
    scenes: z.array(sceneEntrySchema).optional(),
    disabled: z.array(z.string()).optional(),
    weights: z.record(z.string(), z.number().min(0.25).max(4)).optional(),
    hits: hitsSchema.optional(),
  })
  .refine((value) => value.scenes || value.disabled || value.weights || value.hits || value.transitions, {
    message: "nothing to import: expected \"scenes\", \"weights\", \"transitions\" or \"hits\"",
  });

export type ConfigBundle = z.infer<typeof bundleSchema>;

export type FieldError = { field: string; message: string };

export type ValidationResult =
  | { ok: true; bundle: ConfigBundle; warnings: FieldError[] }
  | { ok: false; errors: FieldError[] };

/** Full snapshot of the current settings, ready to be saved to a file. */
export function exportBundle(): string {
  const scenes = getSceneConfig();
  const hits = getHitConfig();
  return JSON.stringify(
    {
      version: 2,
      exportedAt: new Date().toISOString(),
      transitions: scenes.transitions,
      scenes: ALL_SCENES.map((scene) => ({
        id: scene.id,
        label: scene.label,
        group: scene.group,
        active: !scenes.disabled.includes(scene.id),
        weight: scenes.weights[scene.id] ?? 1,
      })),
      hits,
    },
    null,
    2,
  );
}

/** Parses and validates a JSON text, returning one message per faulty field. */
export function validateBundle(text: string): ValidationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return {
      ok: false,
      errors: [{ field: "file", message: `invalid JSON — ${(error as Error).message}` }],
    };
  }
  const result = bundleSchema.safeParse(parsed);
  if (!result.success) {
    return {
      ok: false,
      errors: result.error.issues.map((issue) => ({
        field: issue.path.length ? issue.path.join(".") : "file",
        message: issue.message,
      })),
    };
  }
  const warnings: FieldError[] = [];
  result.data.scenes?.forEach((scene, index) => {
    if (!knownScenes.has(scene.id)) {
      warnings.push({ field: `scenes[${index}].id`, message: `unknown scene "${scene.id}" — ignored` });
    }
  });
  result.data.disabled?.forEach((id, index) => {
    if (!knownScenes.has(id)) {
      warnings.push({ field: `disabled[${index}]`, message: `unknown scene "${id}" — ignored` });
    }
  });
  return { ok: true, bundle: result.data, warnings };
}

export type DiffRow = { field: string; from: string; to: string };

export type BundleDiff = {
  scenes: DiffRow[];
  transitions: DiffRow[];
  hits: DiffRow[];
  total: number;
};

function label(id: string) {
  return ALL_SCENES.find((scene) => scene.id === id)?.label ?? id;
}

/** Resolves what the bundle would produce, without saving anything. */
export function resolveBundle(bundle: ConfigBundle): { scenes: SceneConfig; hits: HitConfig } {
  const currentScenes = getSceneConfig();
  const currentHits = getHitConfig();

  const disabled = new Set(currentScenes.disabled);
  const weights: Record<string, number> = { ...currentScenes.weights };

  if (bundle.disabled) {
    disabled.clear();
    for (const id of bundle.disabled) if (knownScenes.has(id)) disabled.add(id);
  }
  if (bundle.weights) {
    for (const [id, weight] of Object.entries(bundle.weights)) {
      if (knownScenes.has(id)) weights[id] = weight;
    }
  }
  for (const scene of bundle.scenes ?? []) {
    if (!knownScenes.has(scene.id)) continue;
    if (scene.active === false) disabled.add(scene.id);
    else if (scene.active === true) disabled.delete(scene.id);
    if (scene.weight !== undefined) weights[scene.id] = scene.weight;
  }

  const scenes: SceneConfig = {
    ...defaultSceneConfig(),
    disabled: Array.from(disabled),
    weights,
    transitions: { ...currentScenes.transitions, ...(bundle.transitions ?? {}) },
  };

  const hits: HitConfig = {
    gifts: { ...currentHits.gifts },
    referee: { ...currentHits.referee, ...(bundle.hits?.referee ?? {}) },
  };
  for (const gift of GIFTS) {
    const patch = bundle.hits?.gifts?.[gift.id];
    if (!patch) continue;
    hits.gifts[gift.id] = {
      ...currentHits.gifts[gift.id],
      ...patch,
      kinds: (patch.kinds as HitConfig["gifts"][GiftId]["kinds"] | undefined) ??
        currentHits.gifts[gift.id].kinds,
    };
  }
  return { scenes, hits };
}

/** Human readable diff between what is live now and what would be applied. */
export function diffBundle(bundle: ConfigBundle): BundleDiff {
  const next = resolveBundle(bundle);
  const currentScenes = getSceneConfig();
  const currentHits = getHitConfig();

  const scenes: DiffRow[] = [];
  for (const scene of ALL_SCENES) {
    const wasOn = !currentScenes.disabled.includes(scene.id);
    const isOn = !next.scenes.disabled.includes(scene.id);
    const wasWeight = currentScenes.weights[scene.id] ?? 1;
    const isWeight = next.scenes.weights[scene.id] ?? 1;
    if (wasOn !== isOn) {
      scenes.push({ field: label(scene.id), from: wasOn ? "active" : "off", to: isOn ? "active" : "off" });
    }
    if (wasWeight !== isWeight) {
      scenes.push({ field: `${label(scene.id)} — weight`, from: String(wasWeight), to: String(isWeight) });
    }
  }

  const transitions: DiffRow[] = [];
  for (const key of Object.keys(currentScenes.transitions) as (keyof SceneConfig["transitions"])[]) {
    const from = currentScenes.transitions[key];
    const to = next.scenes.transitions[key];
    if (from !== to) transitions.push({ field: key, from: String(from), to: String(to) });
  }

  const hits: DiffRow[] = [];
  for (const gift of GIFTS) {
    const from = currentHits.gifts[gift.id];
    const to = next.hits.gifts[gift.id];
    if (from.kinds.join(",") !== to.kinds.join(",")) {
      hits.push({ field: `${gift.id} — kinds`, from: from.kinds.join(", "), to: to.kinds.join(", ") });
    }
    for (const key of ["tier", "force", "stun"] as const) {
      if (from[key] !== to[key]) {
        hits.push({ field: `${gift.id} — ${key}`, from: String(from[key]), to: String(to[key]) });
      }
    }
  }
  for (const key of Object.keys(currentHits.referee) as (keyof HitConfig["referee"])[]) {
    if (currentHits.referee[key] !== next.hits.referee[key]) {
      hits.push({
        field: `referee — ${key}`,
        from: String(currentHits.referee[key]),
        to: String(next.hits.referee[key]),
      });
    }
  }

  return { scenes, transitions, hits, total: scenes.length + transitions.length + hits.length };
}

/** Saves the resolved bundle locally (scene rotation + gift/hit mapping). */
export function applyBundle(bundle: ConfigBundle) {
  const next = resolveBundle(bundle);
  saveSceneConfig(next.scenes);
  saveHitConfig(next.hits);
  return next;
}

/** Applies a stored version coming from the backend (already validated once). */
export function applyStoredBundle(raw: unknown): boolean {
  const result = bundleSchema.safeParse(raw);
  if (!result.success) return false;
  applyBundle(result.data);
  return true;
}

export function resetBundle() {
  saveSceneConfig(defaultSceneConfig());
  saveHitConfig(defaultHitConfig());
}
