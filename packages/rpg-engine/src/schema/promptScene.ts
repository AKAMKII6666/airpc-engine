/**
 * 模块名称：PromptSceneLayer / TimeBucket Zod 与 patch 硬约束
 */
import { z } from "zod";
import { engineError, type EngineError } from "../host/errors.js";

export const TimeBucketSchema = z.enum([
  "late_night",
  "morning",
  "afternoon",
  "evening",
  "night",
]);

export type TimeBucket = z.infer<typeof TimeBucketSchema>;

export const PromptScenePatchSchema = z
  .object({
    openingSpeakable: z.string().optional(),
    openingPrivate: z.string().optional(),
    emotion: z.string().optional(),
    toneHint: z.string().optional(),
    appendSpeakable: z.string().optional(),
    appendPrivate: z.string().optional(),
  })
  .strict();

export const PromptSceneLayerSchema = z.object({
  layerId: z.string(),
  priority: z.number().optional(),
  match: z
    .object({
      callDirection: z.enum(["inbound", "outbound", "either"]).optional(),
      timeBuckets: z.array(TimeBucketSchema).optional(),
      localHourRange: z
        .object({
          from: z.number().int().min(0).max(23),
          to: z.number().int().min(0).max(24),
        })
        .optional(),
    })
    .default({}),
  patch: PromptScenePatchSchema.default({}),
});

export type PromptSceneLayer = z.infer<typeof PromptSceneLayerSchema>;
export type PromptScenePatch = z.infer<typeof PromptScenePatchSchema>;

const HARD_PATCH_KEYS = ["objective", "forbidden"] as const;

/**
 * 校验 promptScenes.patch 不得含 objective / forbidden（PROMPT_SCENE_PATCH_HARD）
 */
export function validatePromptScenePatches(
  layers: unknown,
): EngineError | null {
  if (layers === undefined || layers === null) return null;
  if (!Array.isArray(layers)) {
    return engineError(
      "VALIDATION_FAILED",
      "promptScenes must be an array",
      { rule: "PROMPT_SCENE_PATCH_HARD" },
    );
  }
  for (const raw of layers) {
    if (typeof raw !== "object" || raw === null) continue;
    const patch = (raw as { patch?: unknown }).patch;
    if (typeof patch !== "object" || patch === null) continue;
    for (const key of HARD_PATCH_KEYS) {
      if (Object.prototype.hasOwnProperty.call(patch, key)) {
        const layerId =
          typeof (raw as { layerId?: unknown }).layerId === "string"
            ? (raw as { layerId: string }).layerId
            : "(unknown)";
        return engineError(
          "VALIDATION_FAILED",
          `promptScenes.patch must not contain ${key} (layer ${layerId})`,
          { rule: "PROMPT_SCENE_PATCH_HARD", layerId, key },
        );
      }
    }
  }
  return null;
}

/** 本地小时 → TimeBucket（与需求 01 对齐） */
export function hourToTimeBucket(localHour: number): TimeBucket {
  const h = ((localHour % 24) + 24) % 24;
  if (h >= 0 && h < 5) return "late_night";
  if (h >= 5 && h < 11) return "morning";
  if (h >= 11 && h < 17) return "afternoon";
  if (h >= 17 && h < 22) return "evening";
  return "night";
}
