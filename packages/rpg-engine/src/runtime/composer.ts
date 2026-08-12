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
import {
  PromptSceneLayerSchema,
  validatePromptScenePatches,
  type PromptSceneLayer,
} from "../schema/promptScene.js";
import type { EngineError } from "../host/errors.js";
import {
  appendPersonaHardBlocks,
  buildPersonaStyleHardBlock,
} from "./personalityPrompt.js";

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
  openingPolicy?: RenderedPrompt["openingPolicy"];
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

function createOpeningPolicy(
  beginContext?: BeginCallContext,
): NonNullable<RenderedPrompt["openingPolicy"]> {
  const forbidden = [
    "小作文式环境描写",
    "括号动作描写",
    "预设已经听到用户声音",
    "客服式长自我介绍",
    "未识别用户前直呼姓名",
  ];
  if (
    beginContext?.source === "free" ||
    beginContext?.source === "schedule_reminder" ||
    beginContext?.source === "expert_referral" ||
    beginContext?.source === "story_scheduled_call" ||
    beginContext?.source === "recurring_schedule" ||
    beginContext?.source === "scheduled_call"
  ) {
    forbidden.push("打错电话剧情开场");
  }
  return {
    mode: "phone_short",
    reason: "电话接通首句只承担接通行为；话题与记忆从第二句或后续自然展开。",
    maxSentences: 2,
    forbidden,
  };
}

function buildPhoneStylePolicyBlock(scene: ComposeScene): string {
  const direction =
    scene.callDirection === "outbound"
      ? "本通是你主动打给用户。"
      : "本通是用户拨入，你刚接起电话。";
  return [
    "[style.phone]",
    "全局电话口语策略；与 [objective] / [forbidden] 冲突时，objective / forbidden 优先。",
    `- ${direction}`,
    "- 像真人打电话：短句、口语、留呼吸感；不要写成散文、独白或客服话术。",
    "- 禁止小作文式环境描写；除非卡明确要求，不要主动描写阳光、茶、窗台等氛围道具。",
    "- 禁止用括号朗读动作或表情，如「（轻轻笑了笑）」；可直接用自然语气表达。",
    "- 不要预设已经听见用户声音；用户尚未开口或未识别前，不要说「听见你的声音」「是你呀」。",
    "- 不要每轮都用开放问题收尾；优先用短回应、轻选择、陈述式话口或自然停顿。",
    "- 预约、提醒、引荐、研究等任务要说清，但仍保持一句一意，不要一次塞完整说明书。",
  ].join("\n");
}

function buildCallSourceBlock(beginContext: BeginCallContext): string {
  const lines = [
    "[call.source]",
    `- 来源：${beginContext.source}`,
  ];
  if (beginContext.actualEntry === "outbound_auto") {
    lines.push("- 本通是你主动打给用户，不是被动接陌生来电。");
  } else if (beginContext.actualEntry === "inbound_user_dial") {
    lines.push("- 本通是用户主动拨入，你刚接起电话。");
  }
  if (beginContext.isEarlyUserDial) {
    lines.push("- 用户抢在预约/计划回电前先打进来了，不要装作完全不知道。");
  }
  if (beginContext.scheduledIntentId) {
    lines.push(`- scheduleIntentId=${beginContext.scheduledIntentId}`);
  }
  return lines.join("\n");
}

function buildMissedOutboundBlock(beginContext: BeginCallContext): string {
  if (!beginContext.isMissedOutbound && !beginContext.missedOutbound) {
    return "";
  }
  const lines = ["[call.missed_outbound]"];
  lines.push("- 用户这次是在接回/回拨一通刚才没接上的外呼。");
  if (beginContext.actualEntry === "inbound_user_dial") {
    lines.push("- 不要装作第一次随机接通；可以自然承接「刚才没接上，我再接起来」。");
  }
  if (beginContext.missedOutbound?.at) {
    lines.push(`- missedOutboundAt=${beginContext.missedOutbound.at}`);
  }
  if (beginContext.missedOutbound?.reason) {
    lines.push(`- missedReason=${beginContext.missedOutbound.reason}`);
  }
  lines.push("- 语气轻松、守约、无责备；不要说「你拒接我」或审问用户为什么没接。");
  lines.push("- 如果同时有预约/计划回电话题，优先接续那个话题，不要重走通用开场。");
  return lines.join("\n");
}

function buildConversationInertiaBlock(beginContext: BeginCallContext): string {
  const inertia = beginContext.conversationInertia;
  if (!inertia || inertia.recentTurns.length === 0) {
    return "";
  }
  const lines = ["[conversation.inertia]"];
  lines.push("- 这不是完全重启的一通；同一角色和用户最近已经聊过。");
  lines.push("- 开场要有连续感：短短接上近况/刚才话题，不要重新完整自我介绍。");
  lines.push("- 不要逐字复述上一通内容；只保留自然电话里的记忆感和承接感。");
  lines.push("- 如果当前卡片 objective 与上一通不同，先服从当前 objective，再轻轻接住上一通余温。");
  lines.push(`- previousSessionId=${inertia.previousSessionId}`);
  if (inertia.previousEndedAt) {
    lines.push(`- previousEndedAt=${inertia.previousEndedAt}`);
  }
  lines.push(`- previousCardId=${inertia.previousCardId}`);
  return lines.join("\n");
}

function buildConversationInertiaSoftContext(
  beginContext: BeginCallContext,
): string {
  const inertia = beginContext.conversationInertia;
  if (!inertia || inertia.recentTurns.length === 0) {
    return "";
  }
  const lines = [
    "[conversation.inertia.recent_turns]",
    `previousSource=${inertia.previousSource}`,
  ];
  for (const turn of inertia.recentTurns) {
    lines.push(`- ${turn.role}@${turn.at}: ${turn.text}`);
  }
  return lines.join("\n");
}

function appendCallbackTopicLines(
  lines: string[],
  beginContext: BeginCallContext,
): void {
  if (beginContext.topicHint) {
    lines.push(`- 回电话题：${beginContext.topicHint}`);
    lines.push("- 首句只做接通/自报；从第二句或后续自然带出这个话题。");
  } else {
    lines.push("- 首句只做接通/自报；随后自然说明来意。");
  }
}

function buildScheduledCallbackBlock(beginContext: BeginCallContext): string {
  if (beginContext.source === "schedule_reminder") {
    const lines = ["[scheduled.callback.user_reminder]"];
    lines.push("- 这是用户口头预约的提醒/回电；你是按用户要求到点打回来。");
    appendCallbackTopicLines(lines, beginContext);
    lines.push("- 语气要像守约回来：简单确认到点了，不要演成剧情任务。");
    lines.push("- 不要把预约回电说成误拨、打错、随机遇见或别人介绍。");
    return lines.join("\n");
  }
  if (beginContext.source === "expert_referral") {
    const lines = ["[scheduled.callback.expert_referral]"];
    lines.push("- 这是上一通里被介绍/转接后的专家回电；你是被请来接这个话题的人。");
    appendCallbackTopicLines(lines, beginContext);
    lines.push("- 首轮要轻轻接上来意：可以说是澜星/上一位朋友让你来聊这个，不要说成用户自己预约提醒。");
    lines.push("- 不要打错电话，不要装作随机认识用户。");
    return lines.join("\n");
  }
  if (beginContext.source === "recurring_schedule") {
    const lines = ["[scheduled.callback.recurring]"];
    lines.push("- 这是固定重复计划触发的回电；你按固定安排来提醒/问候。");
    appendCallbackTopicLines(lines, beginContext);
    lines.push("- 语气保持稳定守时，不要每次都重新解释完整背景。");
    lines.push("- 不要打错电话，不要说成临时随机来电。");
    return lines.join("\n");
  }
  if (
    beginContext.source === "story_scheduled_call" ||
    beginContext.source === "scheduled_call"
  ) {
    const lines = ["[scheduled.callback.story_plan]"];
    lines.push("- 这是剧情/计划安排的外呼；你按卡片 objective 和当前剧情来推进。");
    appendCallbackTopicLines(lines, beginContext);
    lines.push("- 开场要贴合当前剧情卡，不要说成用户口头预约提醒。");
    lines.push("- 不要把计划外呼说成误拨、打错或随机遇见。");
    return lines.join("\n");
  }
  return "";
}

function buildWrongNumberGuardBlock(beginContext?: BeginCallContext): string {
  if (
    beginContext?.source !== "free" &&
    beginContext?.source !== "schedule_reminder" &&
    beginContext?.source !== "expert_referral" &&
    beginContext?.source !== "story_scheduled_call" &&
    beginContext?.source !== "recurring_schedule" &&
    beginContext?.source !== "scheduled_call"
  ) {
    return "";
  }
  return [
    "[opening.guard]",
    "- 本通不能使用打错电话/误拨/随机接通剧情开场。",
    "- FreeCard 自由通话只按当前 FreeCard 的开场与角色身份接通，不继承故事包剧情开场。",
    "- 若卡片确实是打错电话剧情，必须由当前卡的 objective/promptScenes 明确要求。",
  ].join("\n");
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
    if (draft.objective) {
      ctx.systemHard.push(`[objective]\n${draft.objective}`);
    }
    if (draft.forbidden.length > 0) {
      ctx.systemHard.push(`[forbidden]\n${draft.forbidden.join("\n")}`);
    }
    if (draft.emotion) {
      ctx.systemHard.push(`[emotion]\n${draft.emotion}`);
    }
    if (draft.toneHint) {
      ctx.systemHard.push(`[toneHint]\n${draft.toneHint}`);
    }
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

const PROMPT_PROVIDERS: PromptProvider[] = [
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

export function listPromptProviderIds(): string[] {
  return PROMPT_PROVIDERS.map(function (provider) {
    return provider.providerId;
  });
}

export interface ComposeInput {
  card: CallCardDefinition;
  characterDef?: CharacterDef | null;
  scene: ComposeScene;
  beginContext?: BeginCallContext;
  allowCharacterOpeningFallback?: boolean;
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
  for (const provider of PROMPT_PROVIDERS) {
    draft.providerIds.push(provider.providerId);
    provider.apply(providerCtx);
  }

  return {
    systemHard,
    openingSpeakable: draft.openingSpeakable,
    openingPrivate: draft.openingPrivate,
    openingPolicy: draft.openingPolicy,
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
