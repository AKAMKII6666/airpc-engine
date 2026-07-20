/**
 * 模块名称：ContextComposer（promptScenes → RenderedPrompt）
 */
import type { ComposeScene, RenderedPrompt } from "../host/types.js";
import type { CallCardDefinition } from "../schema/callCard.js";
import type { CharacterDef } from "../schema/character.js";
import {
  PromptSceneLayerSchema,
  validatePromptScenePatches,
  type PromptSceneLayer,
} from "../schema/promptScene.js";
import { engineError, type EngineError } from "../host/errors.js";

interface CardContextView {
  objective?: string;
  forbidden?: string[];
  privateBrief?: string;
  speakableBrief?: string;
  emotion?: string;
  premise?: string;
  background?: string;
  promptScenes?: unknown;
}

function readContext(card: CallCardDefinition): CardContextView {
  const ctx = card.context;
  if (typeof ctx !== "object" || ctx === null) return {};
  return ctx as CardContextView;
}

function parseLayers(raw: unknown): PromptSceneLayer[] {
  if (!Array.isArray(raw)) return [];
  const out: PromptSceneLayer[] = [];
  for (const item of raw) {
    const parsed = PromptSceneLayerSchema.safeParse(item);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}

function layerMatches(
  layer: PromptSceneLayer,
  scene: ComposeScene,
): boolean {
  const m = layer.match;
  if (
    m.callDirection &&
    m.callDirection !== "either" &&
    m.callDirection !== scene.callDirection
  ) {
    return false;
  }
  // 半开区间：h >= from && h < to（与需求 01 / 细化修改1 对齐）
  if (m.localHourRange) {
    const { from, to } = m.localHourRange;
    const h = scene.localTime.localHour;
    if (!(h >= from && h < to)) return false;
  }
  return true;
}

function sortMatched(layers: PromptSceneLayer[]): PromptSceneLayer[] {
  return [...layers].sort(function (a, b) {
    return (a.priority ?? 0) - (b.priority ?? 0);
  });
}

interface DraftPrompt {
  objective?: string;
  forbidden: string[];
  speakable: string;
  private: string;
  emotion?: string;
  toneHint?: string;
  openingSpeakable?: string;
  openingPrivate?: string;
  matchedLayerIds: string[];
  notes: string[];
}

function applyLayers(
  draft: DraftPrompt,
  layers: PromptSceneLayer[],
  scene: ComposeScene,
): void {
  const matched = sortMatched(layers.filter((l) => layerMatches(l, scene)));
  for (const layer of matched) {
    draft.matchedLayerIds.push(layer.layerId);
    const p = layer.patch;
    if (p.openingSpeakable !== undefined) {
      draft.openingSpeakable = p.openingSpeakable;
    }
    if (p.openingPrivate !== undefined) {
      draft.openingPrivate = p.openingPrivate;
    }
    if (p.emotion !== undefined) draft.emotion = p.emotion;
    if (p.toneHint !== undefined) draft.toneHint = p.toneHint;
    if (p.appendSpeakable) {
      draft.speakable = draft.speakable
        ? `${draft.speakable}\n${p.appendSpeakable}`
        : p.appendSpeakable;
    }
    if (p.appendPrivate) {
      draft.private = draft.private
        ? `${draft.private}\n${p.appendPrivate}`
        : p.appendPrivate;
    }
  }
}

function hasOpening(draft: DraftPrompt): boolean {
  return (
    draft.openingSpeakable !== undefined ||
    draft.openingPrivate !== undefined
  );
}

function buildTimeHardBlock(scene: ComposeScene): string {
  const policyNote =
    scene.timeMentionPolicy === "allow_casual"
      ? "可自然提及时段与问候。"
      : "仅校正用语；勿主动闲聊时间。";
  return [
    "[用户本地时间]",
    `- 现在：${scene.localTime.isoWithOffset}，本地小时=${scene.localTime.localHour}`,
    "- 问候与节奏应符合当前本地时间；勿说错「早上好」等。",
    "- 与剧情冲突时：objective / forbidden 优先，时间事实仍保留。",
    `- 政策：${policyNote}`,
  ].join("\n");
}

export interface ComposeInput {
  card: CallCardDefinition;
  characterDef?: CharacterDef | null;
  scene: ComposeScene;
  /** P5 再接；P4 可空 */
  softExtras?: string[];
}

/**
 * 固定管道：base → 本通 promptScenes → 角色 default（无 opening 时）→ persona → 时间 → soft
 */
export function composeRenderedPrompt(
  input: ComposeInput,
): RenderedPrompt | EngineError {
  const ctx = readContext(input.card);
  const hardFail =
    validatePromptScenePatches(ctx.promptScenes) ??
    validatePromptScenePatches(input.characterDef?.defaultPromptScenes);
  if (hardFail) return hardFail;

  const draft: DraftPrompt = {
    objective:
      typeof ctx.objective === "string" ? ctx.objective : undefined,
    forbidden: Array.isArray(ctx.forbidden)
      ? ctx.forbidden.filter((x): x is string => typeof x === "string")
      : [],
    speakable:
      typeof ctx.speakableBrief === "string" ? ctx.speakableBrief : "",
    private: typeof ctx.privateBrief === "string" ? ctx.privateBrief : "",
    emotion: typeof ctx.emotion === "string" ? ctx.emotion : undefined,
    matchedLayerIds: [],
    notes: [],
  };

  applyLayers(draft, parseLayers(ctx.promptScenes), input.scene);

  if (!hasOpening(draft) && input.characterDef) {
    draft.notes.push("fallback: CharacterDef.defaultPromptScenes");
    applyLayers(
      draft,
      parseLayers(input.characterDef.defaultPromptScenes),
      input.scene,
    );
  }

  const systemHard: string[] = [];
  if (draft.objective) {
    systemHard.push(`[objective]\n${draft.objective}`);
  }
  if (draft.forbidden.length > 0) {
    systemHard.push(`[forbidden]\n${draft.forbidden.join("\n")}`);
  }
  if (draft.emotion) {
    systemHard.push(`[emotion]\n${draft.emotion}`);
  }
  if (draft.toneHint) {
    systemHard.push(`[toneHint]\n${draft.toneHint}`);
  }

  const softContext: string[] = [];
  const persona = input.characterDef?.persona;
  if (persona && typeof persona === "object") {
    const systemPrompt = (persona as { systemPrompt?: unknown }).systemPrompt;
    if (typeof systemPrompt === "string" && systemPrompt.length > 0) {
      systemHard.push(`[persona.systemPrompt]\n${systemPrompt}`);
    }
  }
  const identity = input.characterDef?.identity;
  if (identity && typeof identity === "object") {
    softContext.push(`[identity]\n${JSON.stringify(identity)}`);
  }

  systemHard.push(buildTimeHardBlock(input.scene));

  if (input.softExtras) {
    for (const extra of input.softExtras) softContext.push(extra);
  }

  return {
    systemHard,
    openingSpeakable: draft.openingSpeakable,
    openingPrivate: draft.openingPrivate,
    speakable: draft.speakable,
    private: draft.private,
    softContext,
    matchedLayerIds: draft.matchedLayerIds,
    debug: draft.notes.length > 0 ? { notes: draft.notes } : undefined,
  };
}
