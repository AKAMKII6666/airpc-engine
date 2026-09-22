/** ToolPolicy v1 / studioShellHangup → v2 幂等规范化。 */
import type {
  CallCardDefinition,
  HangupReasonKind,
  ToolPolicy,
} from "../../schema/call/callCard.js";
import {
  listEnabledCharacterToolCapabilityIds,
  type CharacterDef,
} from "../../schema/identity/character.js";
import {
  DEFAULT_TOOL_REGISTRY,
  REQUEST_HANGUP_TOOL_ID,
} from "../registry/toolRegistry.js";
import type { ToolRegistry } from "../types.js";

function legacyReasonKinds(card: CallCardDefinition): HangupReasonKind[] {
  const legacy = (
    card.context as {
      studioShellHangup?: {
        naturalHangup?: boolean;
        policyHangup?: boolean;
      };
    } | undefined
  )?.studioShellHangup;
  const reasons: HangupReasonKind[] = [];
  if (legacy?.naturalHangup !== false) reasons.push("natural");
  if (legacy?.policyHangup !== false) reasons.push("policy");
  return reasons;
}

function inheritedIds(input: {
  card: CallCardDefinition;
  registry: ToolRegistry;
  characterDef?: CharacterDef | null;
}): string[] {
  const capabilities = new Set(
    listEnabledCharacterToolCapabilityIds(input.characterDef),
  );
  return input.registry.registrations.filter(function (registration) {
    const tool = registration.definition;
    const cardKindAllowed =
      input.card.cardKind === "free" || input.card.cardKind === "schedule"
        ? tool.allowedCardKinds.includes("free") ||
          tool.allowedCardKinds.includes("schedule")
        : tool.allowedCardKinds.includes(input.card.cardKind);
    const characterAllowed =
      tool.availability !== "character_capability" ||
      capabilities.has(tool.toolId);
    return registration.inheritByDefault && cardKindAllowed && characterAllowed;
  }).map(function (registration) {
    return registration.definition.toolId;
  });
}

function withoutLegacyContext(
  card: CallCardDefinition,
): CallCardDefinition["context"] {
  if (!card.context) return card.context;
  const next = { ...card.context } as CallCardDefinition["context"] & {
    studioShellHangup?: unknown;
  };
  delete next.studioShellHangup;
  return next;
}

type NormalizationContext = {
  card: CallCardDefinition;
  policy: ToolPolicy | undefined;
  canHangup: boolean;
  hasLegacyShell: boolean;
  reasons: HangupReasonKind[];
  registry: ToolRegistry;
  characterDef?: CharacterDef | null;
};

function normalizeAllowlist(input: NormalizationContext): ToolPolicy {
  const ids = [...new Set(input.policy?.allowedToolIds ?? [])];
  if (
    input.policy?.schemaVersion !== 2 &&
    !ids.includes(REQUEST_HANGUP_TOOL_ID)
  ) {
    ids.push(REQUEST_HANGUP_TOOL_ID);
  }
  if (input.hasLegacyShell && input.reasons.length === 0) {
    const index = ids.indexOf(REQUEST_HANGUP_TOOL_ID);
    if (index >= 0) ids.splice(index, 1);
  }
  return {
    schemaVersion: 2,
    mode: "allowlist",
    allowedToolIds: ids,
    ...(ids.includes(REQUEST_HANGUP_TOOL_ID)
      ? {
          options: {
            request_hangup: { allowedReasonKinds: input.reasons },
          },
        }
      : {}),
  };
}

function inheritWithoutLegacyHangup(input: NormalizationContext): ToolPolicy {
  return {
    schemaVersion: 2,
    mode: "allowlist",
    allowedToolIds: inheritedIds({
      card: input.card,
      registry: input.registry,
      characterDef: input.characterDef,
    }).filter(function (toolId) {
      return toolId !== REQUEST_HANGUP_TOOL_ID;
    }),
  };
}

function normalizeMissingPolicy(
  input: NormalizationContext,
): ToolPolicy | undefined {
  if (!["free", "schedule"].includes(input.card.cardKind)) return undefined;
  return {
    schemaVersion: 2,
    mode: "inherit_free",
    options: input.canHangup
      ? { request_hangup: { allowedReasonKinds: input.reasons } }
      : undefined,
  };
}

function normalizeDisabledPolicy(input: NormalizationContext): ToolPolicy {
  const allowedToolIds =
    input.policy?.mode === "allowlist"
      ? { allowedToolIds: input.policy.allowedToolIds ?? [] }
      : {};
  return {
    schemaVersion: 2,
    mode: input.policy?.mode ?? "deny_all",
    ...allowedToolIds,
  };
}

function normalizePolicy(input: NormalizationContext): ToolPolicy | undefined {
  if (!input.policy) return normalizeMissingPolicy(input);
  if (input.policy.mode === "deny_all") return normalizeDisabledPolicy(input);
  if (!input.canHangup) return normalizeDisabledPolicy(input);
  if (input.policy.mode === "allowlist") return normalizeAllowlist(input);
  if (input.hasLegacyShell && input.reasons.length === 0) {
    return inheritWithoutLegacyHangup(input);
  }
  return {
    schemaVersion: 2,
    mode: "inherit_free",
    options: { request_hangup: { allowedReasonKinds: input.reasons } },
  };
}

export function normalizeCallCardToolPolicy(
  card: CallCardDefinition,
  options: {
    registry?: ToolRegistry;
    characterDef?: CharacterDef | null;
  } = {},
): CallCardDefinition {
  const policy = card.toolPolicy;
  const realtime = card.interactionMode !== "playback_only";
  const canHangup = realtime && card.cardKind !== "voicemail";
  const hasLegacyShell = Boolean(
    card.context &&
    typeof card.context === "object" &&
    "studioShellHangup" in card.context,
  );
  const reasons = policy?.options?.request_hangup?.allowedReasonKinds
    ? [...new Set(policy.options.request_hangup.allowedReasonKinds)]
    : legacyReasonKinds(card);
  const nextPolicy = normalizePolicy({
    card,
    policy,
    canHangup,
    hasLegacyShell,
    reasons,
    registry: options.registry ?? DEFAULT_TOOL_REGISTRY,
    characterDef: options.characterDef,
  });

  return {
    ...card,
    context: withoutLegacyContext(card),
    toolPolicy: nextPolicy,
  };
}
