/**
 * 模块名称：validatePackage（08 error／warning 主路径；E3 含 ASSET_URI_MISSING）
 */
import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { FREE_PACKAGE_ID, SCHEDULE_PACKAGE_ID } from "../constants.js";
import {
  CallCardDefinitionSchema,
  StoryPackageConfSchema,
  type CallCardDefinition,
} from "../schema/callCard.js";
import {
  AssetMetaSchema,
  PLAYBACK_ASSET_KINDS,
  type AssetMeta,
} from "../schema/asset.js";
import type { CharacterDef } from "../schema/character.js";
import {
  promptSceneValidationRuleId,
  validatePromptScenePatches,
} from "../schema/promptScene.js";
import { getBuiltinTool } from "../tools/builtinRegistry.js";
import type { ValidationIssue, ValidationReport } from "./types.js";
import { KNOWN_EFFECT_NAMES } from "../schema/outcome.js";
export { VALIDATE_PACKAGE_ERROR_COVERAGE } from "./errorCoverage.js";

const SUPPORTED_SCHEMA = 1;

const KNOWN_EFFECTS = new Set<string>(KNOWN_EFFECT_NAMES);

/** 引荐类工具：allowlist 时检查 owner 社交 canIntroduce */
const INTRODUCE_TOOL_IDS = new Set([
  "refer_to_expert",
  "share_expert_number",
]);

function push(list: ValidationIssue[], issue: ValidationIssue): void {
  list.push(issue);
}

export interface ValidatePackageInput {
  rootDir: string;
  packageId: string;
  characters: Map<string, CharacterDef>;
}

export async function validatePackage(
  input: ValidatePackageInput,
): Promise<ValidationReport> {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const { packageId } = input;

  if (packageId === FREE_PACKAGE_ID) {
    push(errors, {
      ruleId: "FREE_PACKAGE_SENTINEL",
      level: "error",
      path: `storis-packages/${packageId}`,
      message: "cannot validate __free__ sentinel as story package",
    });
    return { packageId, errors, warnings };
  }

  const pkgDir = path.join(input.rootDir, "storis-packages", packageId);
  const confPath = path.join(pkgDir, "story.conf.json");
  let confRaw: unknown;
  try {
    confRaw = JSON.parse(await readFile(confPath, "utf8"));
  } catch {
    push(errors, {
      ruleId: "SCHEMA_UNSUPPORTED",
      level: "error",
      path: confPath,
      message: "story.conf.json missing or unreadable",
    });
    return { packageId, errors, warnings };
  }

  if (
    typeof confRaw === "object" &&
    confRaw !== null &&
    Array.isArray((confRaw as { assets?: unknown }).assets)
  ) {
    push(warnings, {
      ruleId: "ASSET_PACKAGE_INLINE",
      level: "warning",
      path: `${confPath}#assets`,
      message: "package inline assets[] is deprecated; use global data/assets/",
    });
  }

  const confParsed = StoryPackageConfSchema.safeParse(confRaw);
  if (!confParsed.success) {
    push(errors, {
      ruleId: "SCHEMA_UNSUPPORTED",
      level: "error",
      path: confPath,
      message: "story.conf.json schema invalid",
    });
    return { packageId, errors, warnings };
  }
  const conf = confParsed.data;
  if (conf.schemaVersion !== SUPPORTED_SCHEMA) {
    push(errors, {
      ruleId: "SCHEMA_UNSUPPORTED",
      level: "error",
      path: confPath,
      message: `schemaVersion ${conf.schemaVersion} unsupported`,
    });
  }

  if (conf.entryCardId) {
    const inIndex = conf.cards.some((c) => c.cardId === conf.entryCardId);
    if (!inIndex) {
      push(errors, {
        ruleId: "ENTRY_CARD_UNKNOWN",
        level: "error",
        path: `${confPath}#entryCardId`,
        message: `entryCardId ${conf.entryCardId} not in cards[]`,
      });
    }
  }

  for (const agentId of conf.participants) {
    if (!input.characters.has(agentId)) {
      push(errors, {
        ruleId: "PARTICIPANT_UNKNOWN",
        level: "error",
        path: `${confPath}#participants`,
        message: `unknown agentId: ${agentId}`,
      });
    }
  }

  if (Array.isArray(conf.assetRefs)) {
    for (const assetId of conf.assetRefs) {
      await validateAssetRef(
        input.rootDir,
        assetId,
        `${confPath}#assetRefs`,
        errors,
        warnings,
        { checkKindForPlayback: false },
      );
    }
  }

  const cardsDir = path.join(pkgDir, "cards");
  let diskFiles: string[] = [];
  try {
    diskFiles = await readdir(cardsDir);
  } catch {
    diskFiles = [];
  }
  const diskCardIds = new Set(
    diskFiles
      .filter((f) => f.endsWith(".s-card.json"))
      .map((f) => f.replace(/\.s-card\.json$/, "")),
  );
  const indexedIds = new Set(conf.cards.map((c) => c.cardId));

  for (const cardRef of conf.cards) {
    if (!diskCardIds.has(cardRef.cardId)) {
      push(errors, {
        ruleId: "CONF_CARD_FILE_MISSING",
        level: "error",
        path: `cards/${cardRef.cardId}.s-card.json`,
        message: `card file missing for ${cardRef.cardId}`,
      });
    }
  }

  for (const diskId of diskCardIds) {
    if (!indexedIds.has(diskId)) {
      push(warnings, {
        ruleId: "CARD_FILE_ORPHAN",
        level: "warning",
        path: `cards/${diskId}.s-card.json`,
        message: `orphan card file not in conf.cards[]`,
      });
    }
  }

  const effectIds = new Set<string>();

  for (const cardRef of conf.cards) {
    const cardPath = path.join(cardsDir, `${cardRef.cardId}.s-card.json`);
    let cardRaw: unknown;
    try {
      cardRaw = JSON.parse(await readFile(cardPath, "utf8"));
    } catch {
      continue;
    }

    if (typeof cardRaw === "object" && cardRaw !== null) {
      const rawCtx = (cardRaw as { context?: { promptScenes?: unknown } })
        .context;
      const patchErr = validatePromptScenePatches(rawCtx?.promptScenes);
      if (patchErr) {
        push(errors, {
          ruleId: promptSceneValidationRuleId(patchErr),
          level: "error",
          path: `${cardPath}#context.promptScenes`,
          message: patchErr.message,
        });
      }
      const rawPolicy = (cardRaw as { toolPolicy?: Record<string, unknown> })
        .toolPolicy;
      if (
        rawPolicy &&
        (rawPolicy.applyEffectsDuringCall === true ||
          rawPolicy.directEffects != null)
      ) {
        push(errors, {
          ruleId: "TOOL_DIRECT_EFFECT",
          level: "error",
          path: `${cardPath}#toolPolicy`,
          message:
            "in-call direct effects are forbidden; use RuntimeExitCandidate",
        });
      }
    }

    const cardParsed = CallCardDefinitionSchema.safeParse(cardRaw);
    if (!cardParsed.success) {
      push(errors, {
        ruleId: "SCHEMA_UNSUPPORTED",
        level: "error",
        path: cardPath,
        message: `card ${cardRef.cardId} schema invalid`,
      });
      continue;
    }
    const card = cardParsed.data;

    if (card.cardKind === "story" && card.exits.length === 0) {
      push(warnings, {
        ruleId: "EXIT_EMPTY_STORY",
        level: "warning",
        path: `${cardPath}#exits`,
        message: "story card has no exits",
      });
    } else if (card.cardKind === "story" && card.exits.length > 0) {
      const kinds = new Set(
        card.exits
          .map((e) => e.exitKind)
          .filter((k): k is NonNullable<typeof k> => Boolean(k)),
      );
      if (!kinds.has("failure")) {
        push(warnings, {
          ruleId: "EXIT_NO_FAILURE",
          level: "warning",
          path: `${cardPath}#exits`,
          message: "story card has no failure exit",
        });
      }
      if (!kinds.has("recovery")) {
        push(warnings, {
          ruleId: "EXIT_NO_RECOVERY",
          level: "warning",
          path: `${cardPath}#exits`,
          message: "story card has no recovery exit",
        });
      }
    }

    const isPlayback =
      card.interactionMode === "playback_only" ||
      card.entryMode === "playback";
    if (isPlayback) {
      const ctx = card.context as { playbackClipId?: string } | undefined;
      if (!ctx?.playbackClipId) {
        push(errors, {
          ruleId: "PLAYBACK_NO_ASSET",
          level: "error",
          path: `${cardPath}#context`,
          message: "playback card missing playbackClipId",
        });
      }
    }

    validateToolPolicy(
      card,
      cardPath,
      errors,
      warnings,
      isPlayback,
      input.characters,
    );

    const playbackClipId = (
      card.context as { playbackClipId?: string } | undefined
    )?.playbackClipId;
    if (playbackClipId) {
      await validateAssetRef(
        input.rootDir,
        playbackClipId,
        `${cardPath}#context.playbackClipId`,
        errors,
        warnings,
        { checkKindForPlayback: true },
      );
    }

    for (const exit of card.exits) {
      for (const effect of exit.effects) {
        if (!KNOWN_EFFECTS.has(effect.effect)) {
          push(errors, {
            ruleId: "EFFECT_UNKNOWN",
            level: "error",
            path: `${cardPath}#exits.${exit.exitId}.effects.${effect.id}`,
            message: `unknown effect: ${effect.effect}`,
          });
        }
        if (effectIds.has(effect.id)) {
          push(errors, {
            ruleId: "EFFECT_ID_DUP",
            level: "error",
            path: `${cardPath}#exits.${exit.exitId}.effects.${effect.id}`,
            message: `duplicate effect id: ${effect.id}`,
          });
        }
        effectIds.add(effect.id);

        if (effect.effect === "play_system_prompt") {
          const clipId = (effect as { clipId?: unknown }).clipId;
          if (typeof clipId === "string" && clipId) {
            await validateAssetRef(
              input.rootDir,
              clipId,
              `${cardPath}#exits.${exit.exitId}.effects.${effect.id}.clipId`,
              errors,
              warnings,
              { checkKindForPlayback: true },
            );
          }
        }

        if (effect.effect === "schedule_call_card") {
          validateScheduleOnceEffect(
            effect,
            `${cardPath}#exits.${exit.exitId}.effects.${effect.id}`,
            errors,
          );
        }

        if (effect.effect === "schedule_recurring_call") {
          await validateScheduleRecurringEffect(
            effect,
            card,
            `${cardPath}#exits.${exit.exitId}.effects.${effect.id}`,
            input.rootDir,
            errors,
          );
        }
      }
    }
  }

  await validateParticipantsCharacters(
    conf.participants,
    input.characters,
    input.rootDir,
    errors,
    warnings,
  );

  return { packageId, errors, warnings };
}

/** SCHEDULE_ONCE_CARD_REQUIRED：延迟外呼必须 agentId+packageId+cardId */
function validateScheduleOnceEffect(
  effect: { id: string; effect: string; [key: string]: unknown },
  issuePath: string,
  errors: ValidationIssue[],
): void {
  const agentId = typeof effect.agentId === "string" ? effect.agentId : "";
  const cardId = typeof effect.cardId === "string" ? effect.cardId : "";
  const packageId =
    typeof effect.packageId === "string" ? effect.packageId : "";
  if (!agentId || !cardId || !packageId) {
    push(errors, {
      ruleId: "SCHEDULE_ONCE_CARD_REQUIRED",
      level: "error",
      path: issuePath,
      message:
        "schedule_call_card requires agentId + packageId + cardId（禁止仅 topicHint）",
    });
  }
}

/**
 * SCHEDULE_RECURRING_*：裸 recurring error；Story 上 recurring error；
 * 目标必须可解析为 schedule（或 __free__ 下的 free/schedule fallback）。
 * cardId+packageId 指向故事包 StoryCard / 未知包 → SCHEDULE_CARD_KIND。
 */
async function validateScheduleRecurringEffect(
  effect: { id: string; effect: string; [key: string]: unknown },
  card: CallCardDefinition,
  issuePath: string,
  rootDir: string,
  errors: ValidationIssue[],
): Promise<void> {
  if (card.cardKind === "story") {
    push(errors, {
      ruleId: "SCHEDULE_RECURRING_IN_STORY",
      level: "error",
      path: issuePath,
      message:
        "schedule_recurring_call is not allowed on StoryCard（周期性外呼归 ScheduleCard）",
    });
  }

  const scheduleCardId =
    typeof effect.scheduleCardId === "string" ? effect.scheduleCardId : "";
  const cardId = typeof effect.cardId === "string" ? effect.cardId : "";
  const packageId =
    typeof effect.packageId === "string" ? effect.packageId : "";

  if (!scheduleCardId && !(cardId && packageId)) {
    push(errors, {
      ruleId: "SCHEDULE_RECURRING_CARD_REQUIRED",
      level: "error",
      path: issuePath,
      message:
        "schedule_recurring_call requires scheduleCardId or cardId+packageId",
    });
    return;
  }

  if (scheduleCardId) {
    await assertScheduleCardFile(
      rootDir,
      scheduleCardId,
      issuePath,
      errors,
      `scheduleCardId ${scheduleCardId}`,
    );
    return;
  }

  if (packageId === SCHEDULE_PACKAGE_ID) {
    await assertScheduleCardFile(
      rootDir,
      cardId,
      issuePath,
      errors,
      `cardId ${cardId} (packageId=__schedule__)`,
    );
    return;
  }

  if (packageId === FREE_PACKAGE_ID) {
    const freePath = path.join(
      rootDir,
      "characters",
      "free-cards",
      `${cardId}.s-card.json`,
    );
    const schedulePath = path.join(
      rootDir,
      "characters",
      "schedule-cards",
      `${cardId}.s-card.json`,
    );
    let raw: unknown | null = null;
    try {
      raw = JSON.parse(await readFile(freePath, "utf8"));
    } catch {
      try {
        raw = JSON.parse(await readFile(schedulePath, "utf8"));
      } catch {
        raw = null;
      }
    }
    if (!raw) {
      push(errors, {
        ruleId: "SCHEDULE_CARD_KIND",
        level: "error",
        path: issuePath,
        message: `recurring free/schedule card not found: ${cardId}`,
      });
      return;
    }
    const parsed = CallCardDefinitionSchema.safeParse(raw);
    if (
      !parsed.success ||
      (parsed.data.cardKind !== "free" && parsed.data.cardKind !== "schedule")
    ) {
      push(errors, {
        ruleId: "SCHEDULE_CARD_KIND",
        level: "error",
        path: issuePath,
        message: `recurring target ${cardId} must be free or schedule card`,
      });
    }
    return;
  }

  // 故事包或其它 packageId：不允许当 recurring 目标（禁止 StoryCard 循环）
  const storyCardPath = path.join(
    rootDir,
    "storis-packages",
    packageId,
    "cards",
    `${cardId}.s-card.json`,
  );
  let storyRaw: unknown | null = null;
  try {
    storyRaw = JSON.parse(await readFile(storyCardPath, "utf8"));
  } catch {
    storyRaw = null;
  }
  const parsed = storyRaw
    ? CallCardDefinitionSchema.safeParse(storyRaw)
    : null;
  const kind = parsed?.success ? parsed.data.cardKind : null;
  push(errors, {
    ruleId: "SCHEDULE_CARD_KIND",
    level: "error",
    path: issuePath,
    message:
      kind === "story"
        ? `recurring target ${packageId}/${cardId} is a StoryCard; must be schedule (or __free__ free/schedule)`
        : `recurring target ${packageId}/${cardId} is not an allowed schedule/free fallback`,
  });
}

/** characters/schedule-cards/{id} 必须存在且 cardKind=schedule */
async function assertScheduleCardFile(
  rootDir: string,
  scheduleCardId: string,
  issuePath: string,
  errors: ValidationIssue[],
  label: string,
): Promise<void> {
  const schedulePath = path.join(
    rootDir,
    "characters",
    "schedule-cards",
    `${scheduleCardId}.s-card.json`,
  );
  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(schedulePath, "utf8"));
  } catch {
    push(errors, {
      ruleId: "SCHEDULE_CARD_KIND",
      level: "error",
      path: issuePath,
      message: `${label} not found in characters/schedule-cards`,
    });
    return;
  }
  const parsed = CallCardDefinitionSchema.safeParse(raw);
  if (!parsed.success || parsed.data.cardKind !== "schedule") {
    push(errors, {
      ruleId: "SCHEDULE_CARD_KIND",
      level: "error",
      path: issuePath,
      message: `${label} must have cardKind "schedule"`,
    });
  }
}

function validateToolPolicy(
  card: CallCardDefinition,
  cardPath: string,
  errors: ValidationIssue[],
  warnings: ValidationIssue[],
  isPlayback: boolean,
  characters: Map<string, CharacterDef>,
): void {
  const policy = card.toolPolicy;
  if (!policy || typeof policy !== "object") return;
  const p = policy as {
    mode?: string;
    allowedToolIds?: string[];
  };

  if (isPlayback && p.mode !== "deny_all") {
    const ids = p.allowedToolIds ?? [];
    if (ids.length > 0 || p.mode === "allowlist") {
      push(errors, {
        ruleId: "TOOL_PLAYBACK",
        level: "error",
        path: `${cardPath}#toolPolicy`,
        message: "playback_only card must use deny_all tools",
      });
    }
  }

  if (p.mode === "allowlist" && Array.isArray(p.allowedToolIds)) {
    let needsIntroduceGuard = false;
    for (const toolId of p.allowedToolIds) {
      const def = getBuiltinTool(toolId);
      if (!def) {
        push(errors, {
          ruleId: "TOOL_UNKNOWN",
          level: "error",
          path: `${cardPath}#toolPolicy.allowedToolIds`,
          message: `unknown toolId: ${toolId}`,
        });
        continue;
      }
      if (
        !(def.allowedCardKinds as string[]).includes(card.cardKind)
      ) {
        push(errors, {
          ruleId: "TOOL_KIND_MISMATCH",
          level: "error",
          path: `${cardPath}#toolPolicy`,
          message: `tool ${toolId} not allowed for cardKind ${card.cardKind}`,
        });
      }
      if (INTRODUCE_TOOL_IDS.has(toolId)) {
        needsIntroduceGuard = true;
      }
    }

    if (needsIntroduceGuard) {
      const owner = characters.get(card.ownerAgentId);
      const social = owner?.social ?? [];
      const canIntro = social.some(
        (edge) => edge && edge.canIntroduce === true,
      );
      if (!canIntro) {
        push(warnings, {
          ruleId: "TOOL_INTRODUCE_GUARD",
          level: "warning",
          path: `${cardPath}#toolPolicy.allowedToolIds`,
          message: `introduce tools allowed but owner ${card.ownerAgentId} has no canIntroduce social edge`,
        });
      }
    }
  }
}

async function readAssetMeta(
  rootDir: string,
  assetId: string,
): Promise<AssetMeta | null> {
  const metaPath = path.join(rootDir, "assets", "meta", `${assetId}.json`);
  try {
    const raw = JSON.parse(await readFile(metaPath, "utf8")) as unknown;
    const parsed = AssetMetaSchema.safeParse(raw);
    if (!parsed.success) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

async function validateAssetRef(
  rootDir: string,
  assetId: string,
  issuePath: string,
  errors: ValidationIssue[],
  warnings: ValidationIssue[],
  opts: { checkKindForPlayback: boolean },
): Promise<void> {
  const metaPath = path.join(rootDir, "assets", "meta", `${assetId}.json`);
  let meta: AssetMeta | null;
  try {
    await access(metaPath);
    meta = await readAssetMeta(rootDir, assetId);
  } catch {
    push(errors, {
      ruleId: "ASSET_UNKNOWN",
      level: "error",
      path: issuePath,
      message: `unknown assetId: ${assetId}`,
    });
    return;
  }

  if (!meta) {
    push(errors, {
      ruleId: "ASSET_UNKNOWN",
      level: "error",
      path: issuePath,
      message: `invalid AssetMeta for assetId: ${assetId}`,
    });
    return;
  }

  const uriRel = meta.uri.replace(/^\.?\//, "");
  if (
    uriRel.includes("..") ||
    path.isAbsolute(uriRel) ||
    uriRel.startsWith("~")
  ) {
    push(errors, {
      ruleId: "ASSET_URI_MISSING",
      level: "error",
      path: `${metaPath}#uri`,
      message: `asset uri escapes assets root: ${meta.uri}`,
    });
    return;
  }

  const filePath = path.join(rootDir, "assets", uriRel);
  try {
    await access(filePath);
  } catch {
    push(errors, {
      ruleId: "ASSET_URI_MISSING",
      level: "error",
      path: issuePath,
      message: `asset file missing for ${assetId}: ${meta.uri}`,
    });
  }

  if (opts.checkKindForPlayback && !PLAYBACK_ASSET_KINDS.has(meta.kind)) {
    push(warnings, {
      ruleId: "ASSET_KIND_MISMATCH",
      level: "warning",
      path: issuePath,
      message: `playback/system clip ${assetId} has kind ${meta.kind}`,
    });
  }
}

async function validateParticipantsCharacters(
  participants: string[],
  characters: Map<string, CharacterDef>,
  rootDir: string,
  errors: ValidationIssue[],
  warnings: ValidationIssue[],
): Promise<void> {
  for (const agentId of participants) {
    const def = characters.get(agentId);
    if (!def) continue;
    if (def.isNarrativeOnly === true && def.dialable === true) {
      push(errors, {
        ruleId: "NARRATIVE_DIALABLE",
        level: "error",
        path: `characters/${agentId}.json`,
        message: "isNarrativeOnly cannot be dialable",
      });
    }
    if (def.isNarrativeOnly === true && def.freeCardId) {
      push(warnings, {
        ruleId: "NARRATIVE_NEEDS_NO_FREE",
        level: "warning",
        path: `characters/${agentId}.json`,
        message: "narrative-only character has freeCardId",
      });
    }

    if (def.isNarrativeOnly !== true) {
      if (!def.freeCardId) {
        push(errors, {
          ruleId: "FREE_CARD_MISSING",
          level: "error",
          path: `characters/${agentId}.json#freeCardId`,
          message: `non-narrative character missing freeCardId`,
        });
      } else {
        const freePath = path.join(
          rootDir,
          "characters",
          "free-cards",
          `${def.freeCardId}.s-card.json`,
        );
        let freeRaw: unknown;
        try {
          freeRaw = JSON.parse(await readFile(freePath, "utf8"));
        } catch {
          push(errors, {
            ruleId: "FREE_CARD_MISSING",
            level: "error",
            path: freePath,
            message: `free card file missing for ${def.freeCardId}`,
          });
          continue;
        }
        const freeParsed = CallCardDefinitionSchema.safeParse(freeRaw);
        if (!freeParsed.success || freeParsed.data.cardKind !== "free") {
          push(errors, {
            ruleId: "FREE_CARD_KIND",
            level: "error",
            path: freePath,
            message: `free card must have cardKind "free"`,
          });
        }
      }
    }

    if (Array.isArray(def.social)) {
      for (const [i, edge] of def.social.entries()) {
        if (!edge || typeof edge !== "object") continue;
        const target = (edge as { targetAgentId?: unknown }).targetAgentId;
        if (typeof target !== "string") continue;
        if (!characters.has(target)) {
          push(errors, {
            ruleId: "SOCIAL_TARGET_UNKNOWN",
            level: "error",
            path: `characters/${agentId}.json#social[${i}]`,
            message: `social.targetAgentId unknown: ${target}`,
          });
        }
      }
    }
  }
}
