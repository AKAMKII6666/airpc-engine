/**
 * 引擎内置 Prompt Provider 链。
 */
import type { ComposeScene } from "../host/types.js";
import {
  PromptSceneLayerSchema,
  type PromptSceneLayer,
} from "../schema/promptScene.js";
import {
  appendPersonaHardBlocks,
  buildPersonaStyleHardBlock,
} from "./personalityPrompt.js";
import type { PromptProvider, PromptProviderContext } from "./composer.js";
import {
  buildCallSourceBlock,
  buildConversationInertiaBlock,
  buildConversationInertiaSoftContext,
  buildMissedOutboundBlock,
  buildPhoneStylePolicyBlock,
  buildScheduledCallbackBlock,
  buildTimeHardBlock,
  buildWrongNumberGuardBlock,
  createOpeningPolicy,
} from "./promptPhoneBlocks.js";

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

function applyLayers(
  draft: PromptProviderContext["draft"],
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

function hasOpening(draft: PromptProviderContext["draft"]): boolean {
  return (
    draft.openingSpeakable !== undefined ||
    draft.openingPrivate !== undefined
  );
}

const baseContextProvider: PromptProvider = {
  providerId: "base.card_context",
  apply(ctx) {
    const cardCtx = ctx.cardContext;
    ctx.draft.objective =
      typeof cardCtx.objective === "string" ? cardCtx.objective : undefined;
    ctx.draft.forbidden = Array.isArray(cardCtx.forbidden)
      ? cardCtx.forbidden.filter((x): x is string => typeof x === "string")
      : [];
    ctx.draft.speakable =
      typeof cardCtx.speakableBrief === "string" ? cardCtx.speakableBrief : "";
    ctx.draft.private =
      typeof cardCtx.privateBrief === "string" ? cardCtx.privateBrief : "";
    ctx.draft.emotion =
      typeof cardCtx.emotion === "string" ? cardCtx.emotion : undefined;
  },
};

const promptSceneProvider: PromptProvider = {
  providerId: "scene.card_promptScenes",
  apply(ctx) {
    applyLayers(
      ctx.draft,
      parseLayers(ctx.cardContext.promptScenes),
      ctx.input.scene,
    );
  },
};

const characterOpeningProvider: PromptProvider = {
  providerId: "opening.character_default",
  apply(ctx) {
    const allowCharacterOpeningFallback =
      ctx.input.allowCharacterOpeningFallback !== false;
    if (
      !hasOpening(ctx.draft) &&
      ctx.input.characterDef &&
      allowCharacterOpeningFallback
    ) {
      ctx.draft.notes.push("fallback: CharacterDef.defaultPromptScenes");
      applyLayers(
        ctx.draft,
        parseLayers(ctx.input.characterDef.defaultPromptScenes),
        ctx.input.scene,
      );
    } else if (!hasOpening(ctx.draft) && ctx.input.characterDef) {
      ctx.draft.notes.push("skip: CharacterDef.defaultPromptScenes");
    }
  },
};

const openingPolicyProvider: PromptProvider = {
  providerId: "opening.phone_short_policy",
  apply(ctx) {
    ctx.draft.openingPolicy = createOpeningPolicy(ctx.input.beginContext);
  },
};

const hardBlocksProvider: PromptProvider = {
  providerId: "hard.card_objective",
  apply(ctx) {
    const draft = ctx.draft;
    if (draft.objective) ctx.systemHard.push(`[objective]\n${draft.objective}`);
    if (draft.forbidden.length > 0) {
      ctx.systemHard.push(`[forbidden]\n${draft.forbidden.join("\n")}`);
    }
    if (draft.emotion) ctx.systemHard.push(`[emotion]\n${draft.emotion}`);
    if (draft.toneHint) ctx.systemHard.push(`[toneHint]\n${draft.toneHint}`);
  },
};

const phoneStyleProvider: PromptProvider = {
  providerId: "style.phone_global",
  apply(ctx) {
    ctx.systemHard.push(buildPhoneStylePolicyBlock(ctx.input.scene));
  },
};

const callSourceProvider: PromptProvider = {
  providerId: "call.source",
  apply(ctx) {
    if (ctx.input.beginContext) {
      ctx.systemHard.push(buildCallSourceBlock(ctx.input.beginContext));
    }
  },
};

const missedOutboundProvider: PromptProvider = {
  providerId: "call.missed_outbound",
  apply(ctx) {
    const block = ctx.input.beginContext
      ? buildMissedOutboundBlock(ctx.input.beginContext)
      : "";
    if (block) ctx.systemHard.push(block);
  },
};

const conversationInertiaProvider: PromptProvider = {
  providerId: "conversation.inertia",
  apply(ctx) {
    if (!ctx.input.beginContext) return;
    const hardBlock = buildConversationInertiaBlock(ctx.input.beginContext);
    if (hardBlock) ctx.systemHard.push(hardBlock);
    const softBlock = buildConversationInertiaSoftContext(ctx.input.beginContext);
    if (softBlock) ctx.softContext.push(softBlock);
  },
};

const scheduledCallbackProvider: PromptProvider = {
  providerId: "call.scheduled_callback",
  apply(ctx) {
    const block = ctx.input.beginContext
      ? buildScheduledCallbackBlock(ctx.input.beginContext)
      : "";
    if (block) ctx.systemHard.push(block);
  },
};

const wrongNumberGuardProvider: PromptProvider = {
  providerId: "opening.wrong_number_guard",
  apply(ctx) {
    const block = buildWrongNumberGuardBlock(ctx.input.beginContext);
    if (block) ctx.systemHard.push(block);
  },
};

const personaProvider: PromptProvider = {
  providerId: "persona.character",
  apply(ctx) {
    appendPersonaHardBlocks(ctx.systemHard, ctx.input.characterDef?.persona);
  },
};

const personaStyleProvider: PromptProvider = {
  providerId: "persona.style",
  apply(ctx) {
    const block = buildPersonaStyleHardBlock(ctx.input.characterDef?.persona);
    if (block) ctx.systemHard.push(block);
  },
};

const identityProvider: PromptProvider = {
  providerId: "identity.character",
  apply(ctx) {
    const identity = ctx.input.characterDef?.identity;
    if (identity && typeof identity === "object") {
      ctx.softContext.push(`[identity]\n${JSON.stringify(identity)}`);
    }
  },
};

const timeProvider: PromptProvider = {
  providerId: "time.local",
  apply(ctx) {
    ctx.systemHard.push(buildTimeHardBlock(ctx.input.scene));
  },
};

const softExtrasProvider: PromptProvider = {
  providerId: "soft.extras",
  apply(ctx) {
    if (ctx.input.softExtras) {
      for (const extra of ctx.input.softExtras) ctx.softContext.push(extra);
    }
  },
};

export const DEFAULT_PROMPT_PROVIDERS: readonly PromptProvider[] = [
  baseContextProvider,
  promptSceneProvider,
  characterOpeningProvider,
  openingPolicyProvider,
  hardBlocksProvider,
  phoneStyleProvider,
  callSourceProvider,
  missedOutboundProvider,
  conversationInertiaProvider,
  scheduledCallbackProvider,
  wrongNumberGuardProvider,
  personaProvider,
  personaStyleProvider,
  identityProvider,
  timeProvider,
  softExtrasProvider,
];
