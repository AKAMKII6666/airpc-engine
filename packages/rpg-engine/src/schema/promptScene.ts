/**
 * 模块名称：PromptSceneLayer Zod 与 patch / 已移除字段硬约束
 *
 * match 仅 localHourRange（半开区间）；旧 timeBuckets 拒载，不做兼容剥离。
 */
import { z } from "zod";
import { engineError, type EngineError } from "../host/errors.js";

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
      localHourRange: z
        .object({
          from: z.number().int().min(0).max(23),
          to: z.number().int().min(0).max(24),
        })
        .optional(),
    })
    .strict()
    .default({}),
  patch: PromptScenePatchSchema.default({}),
});

export type PromptSceneLayer = z.infer<typeof PromptSceneLayerSchema>;
export type PromptScenePatch = z.infer<typeof PromptScenePatchSchema>;

const HARD_PATCH_KEYS = ["objective", "forbidden"] as const;

/**
 * 从 validatePromptScenePatches 错误取出 ruleId，供 validatePackage 映射 issue。
 * 默认 PROMPT_SCENE_PATCH_HARD，避免校验入口再写 ?? 抬高复杂度。
 */
export function promptSceneValidationRuleId(err: EngineError): string {
  const details = err.details;
  if (
    typeof details === "object" &&
    details !== null &&
    "rule" in details &&
    typeof (details as { rule: unknown }).rule === "string"
  ) {
    return (details as { rule: string }).rule;
  }
  return "PROMPT_SCENE_PATCH_HARD";
}

/**
 * 校验 promptScenes：patch 禁 objective/forbidden；match 禁已删除的 timeBuckets。
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
    const layerId =
      typeof (raw as { layerId?: unknown }).layerId === "string"
        ? (raw as { layerId: string }).layerId
        : "(unknown)";
    const match = (raw as { match?: unknown }).match;
    if (typeof match === "object" && match !== null) {
      if (Object.prototype.hasOwnProperty.call(match, "timeBuckets")) {
        return engineError(
          "VALIDATION_FAILED",
          `promptScenes.match must not contain timeBuckets (layer ${layerId})`,
          { rule: "PROMPT_SCENE_TIME_BUCKETS_REMOVED", layerId },
        );
      }
    }
    const patch = (raw as { patch?: unknown }).patch;
    if (typeof patch !== "object" || patch === null) continue;
    for (const key of HARD_PATCH_KEYS) {
      if (Object.prototype.hasOwnProperty.call(patch, key)) {
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
