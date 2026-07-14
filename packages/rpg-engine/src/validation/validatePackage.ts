/**
 * 模块名称：validatePackage（08 error 级主规则）
 */
import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { FREE_PACKAGE_ID } from "../constants.js";
import {
  CallCardDefinitionSchema,
  StoryPackageConfSchema,
  type CallCardDefinition,
} from "../schema/callCard.js";
import type { CharacterDef } from "../schema/character.js";
import { validatePromptScenePatches } from "../schema/promptScene.js";
import { getBuiltinTool } from "../tools/builtinRegistry.js";
import type { ValidationIssue, ValidationReport } from "./types.js";
import { KNOWN_EFFECT_NAMES } from "../schema/outcome.js";

const SUPPORTED_SCHEMA = 1;

const KNOWN_EFFECTS = new Set<string>(KNOWN_EFFECT_NAMES);

/** 08 error 已覆盖（T3 批次）；warning 分期另列 */
export const VALIDATE_PACKAGE_ERROR_COVERAGE = {
  covered: [
    "CONF_CARD_FILE_MISSING",
    "ENTRY_CARD_UNKNOWN",
    "PARTICIPANT_UNKNOWN",
    "FREE_PACKAGE_SENTINEL",
    "SCHEMA_UNSUPPORTED",
    "PROMPT_SCENE_PATCH_HARD",
    "EFFECT_UNKNOWN",
    "EFFECT_ID_DUP",
    "PLAYBACK_NO_ASSET",
    "TOOL_UNKNOWN",
    "TOOL_KIND_MISMATCH",
    "TOOL_PLAYBACK",
    "TOOL_DIRECT_EFFECT",
    "ASSET_UNKNOWN",
    "SOCIAL_TARGET_UNKNOWN",
    "NARRATIVE_DIALABLE",
    "FREE_CARD_MISSING",
    "FREE_CARD_KIND",
  ],
  deferred: [
    "ASSET_URI_MISSING", // 需 assets/files 样例齐全后再硬拦
  ],
  warningsOnly: [
    "CARD_FILE_ORPHAN",
    "EXIT_EMPTY_STORY",
    "EXIT_NO_FAILURE",
    "EXIT_NO_RECOVERY",
    "TOOL_INTRODUCE_GUARD",
    "ASSET_KIND_MISMATCH",
    "NARRATIVE_NEEDS_NO_FREE",
  ],
} as const;


function push(
  list: ValidationIssue[],
  issue: ValidationIssue,
): void {
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
  const cards: CallCardDefinition[] = [];

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
          ruleId: "PROMPT_SCENE_PATCH_HARD",
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
    cards.push(card);

    if (card.cardKind === "story" && card.exits.length === 0) {
      push(warnings, {
        ruleId: "EXIT_EMPTY_STORY",
        level: "warning",
        path: `${cardPath}#exits`,
        message: "story card has no exits",
      });
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

    validateToolPolicy(card, cardPath, errors, isPlayback);

    if (isPlayback) {
      const ctx = card.context as { playbackClipId?: string } | undefined;
      if (ctx?.playbackClipId) {
        await validateAssetExists(
          input.rootDir,
          ctx.playbackClipId,
          `${cardPath}#context.playbackClipId`,
          errors,
        );
      }
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

function validateToolPolicy(
  card: CallCardDefinition,
  cardPath: string,
  errors: ValidationIssue[],
  isPlayback: boolean,
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
      if (!def.allowedCardKinds.includes(card.cardKind)) {
        push(errors, {
          ruleId: "TOOL_KIND_MISMATCH",
          level: "error",
          path: `${cardPath}#toolPolicy`,
          message: `tool ${toolId} not allowed for cardKind ${card.cardKind}`,
        });
      }
    }
  }
}

async function validateAssetExists(
  rootDir: string,
  assetId: string,
  issuePath: string,
  errors: ValidationIssue[],
): Promise<void> {
  const metaPath = path.join(rootDir, "assets", "meta", `${assetId}.json`);
  try {
    await access(metaPath);
  } catch {
    push(errors, {
      ruleId: "ASSET_UNKNOWN",
      level: "error",
      path: issuePath,
      message: `unknown assetId: ${assetId}`,
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
