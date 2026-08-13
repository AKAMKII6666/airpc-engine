/**
 * 模块名称：ContextComposer（promptScenes → RenderedPrompt）
 */
import type {
  BeginCallContext,
  ComposeScene,
  RenderedPrompt,
} from "../host/types.js";
import type { CallCardDefinition } from "../schema/callCard.js";
import type { CharacterDef } from "../schema/character.js";
import { validatePromptScenePatches } from "../schema/promptScene.js";
import type { EngineError } from "../host/errors.js";
import {
  createPromptProviderRegistry,
  type PromptProviderRegistry,
} from "./promptProviderRegistry.js";
import { DEFAULT_PROMPT_PROVIDERS } from "./defaultPromptProviders.js";

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

export interface DraftPrompt {
  objective?: string;
  forbidden: string[];
  speakable: string;
  private: string;
  emotion?: string;
  toneHint?: string;
  openingSpeakable?: string;
  openingPrivate?: string;
  openingPolicy?: RenderedPrompt["openingPolicy"];
  openingFirstTurn?: RenderedPrompt["openingFirstTurn"];
  matchedLayerIds: string[];
  notes: string[];
  providerIds: string[];
}

export interface PromptProviderContext {
  input: ComposeInput;
  cardContext: CardContextView;
  draft: DraftPrompt;
  systemHard: string[];
  softContext: string[];
}

export type PromptProvider = {
  providerId: string;
  apply(ctx: PromptProviderContext): void;
};

const DEFAULT_PROMPT_PROVIDER_REGISTRY =
  createPromptProviderRegistry(DEFAULT_PROMPT_PROVIDERS);

export function createDefaultPromptProviderRegistry(
  extraProviders: readonly PromptProvider[] = [],
): PromptProviderRegistry {
  return createPromptProviderRegistry([
    ...DEFAULT_PROMPT_PROVIDERS,
    ...extraProviders,
  ]);
}

export function listPromptProviderIds(
  registry: PromptProviderRegistry = DEFAULT_PROMPT_PROVIDER_REGISTRY,
): string[] {
  return registry.getProviderIds();
}

export interface ComposeInput {
  card: CallCardDefinition;
  characterDef?: CharacterDef | null;
  scene: ComposeScene;
  beginContext?: BeginCallContext;
  allowCharacterOpeningFallback?: boolean;
  /** P5 再接；P4 可空 */
  softExtras?: string[];
  /** 外部可替换的 provider registry；未传时使用引擎内置默认链。 */
  promptProviderRegistry?: PromptProviderRegistry;
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
    forbidden: [],
    speakable: "",
    private: "",
    matchedLayerIds: [],
    notes: [],
    providerIds: [],
  };

  const systemHard: string[] = [];
  const softContext: string[] = [];
  const providerCtx: PromptProviderContext = {
    input,
    cardContext: ctx,
    draft,
    systemHard,
    softContext,
  };
  const registry = input.promptProviderRegistry ?? DEFAULT_PROMPT_PROVIDER_REGISTRY;
  for (const provider of registry.providers) {
    draft.providerIds.push(provider.providerId);
    provider.apply(providerCtx);
  }

  return {
    systemHard,
    openingSpeakable: draft.openingSpeakable,
    openingPrivate: draft.openingPrivate,
    openingPolicy: draft.openingPolicy,
    openingFirstTurn: draft.openingFirstTurn,
    speakable: draft.speakable,
    private: draft.private,
    softContext,
    matchedLayerIds: draft.matchedLayerIds,
    debug: {
      providerIds: draft.providerIds,
      ...(draft.notes.length > 0 ? { notes: draft.notes } : {}),
    },
  };
}
