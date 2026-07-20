/**
 * 统一 Schedule/Free 卡引用解析（休整 REST-E1）。
 */
import { FREE_PACKAGE_ID, SCHEDULE_PACKAGE_ID } from "../constants.js";
import type { CallCardDefinition, CardKind } from "../schema/callCard.js";

export type ScheduledCardLookup = (
  packageId: string,
  cardId: string,
) => CallCardDefinition | undefined;

export type ScheduledCardRefInput = {
  agentId: string;
  scheduleCardId?: string;
  cardId?: string;
  packageId?: string;
};

export type ScheduledCardResolveOk = {
  ok: true;
  packageId: string;
  cardId: string;
  cardKind: CardKind;
  ownerAgentId: string;
};

export type ScheduledCardResolveFail = {
  ok: false;
  code:
    | "MISSING_REF"
    | "CARD_NOT_FOUND"
    | "CARD_KIND"
    | "OWNER_MISMATCH"
    | "STORY_CARD_FORBIDDEN";
  reason: string;
};

export type ScheduledCardResolveResult =
  | ScheduledCardResolveOk
  | ScheduledCardResolveFail;

function fail(
  code: ScheduledCardResolveFail["code"],
  reason: string,
): ScheduledCardResolveFail {
  return { ok: false, code, reason };
}

function resolveTargetIds(
  input: ScheduledCardRefInput,
): { packageId: string; cardId: string } | ScheduledCardResolveFail {
  if (typeof input.scheduleCardId === "string" && input.scheduleCardId) {
    return { packageId: SCHEDULE_PACKAGE_ID, cardId: input.scheduleCardId };
  }
  if (
    typeof input.cardId === "string" &&
    input.cardId &&
    typeof input.packageId === "string" &&
    input.packageId
  ) {
    return { packageId: input.packageId, cardId: input.cardId };
  }
  return fail("MISSING_REF", "requires scheduleCardId or cardId+packageId");
}

function assertKindAllowed(
  packageId: string,
  kind: CardKind,
  viaScheduleCardId: boolean,
): ScheduledCardResolveFail | null {
  if (viaScheduleCardId || packageId === SCHEDULE_PACKAGE_ID) {
    if (kind !== "schedule") {
      return fail(
        "CARD_KIND",
        `scheduleCardId must resolve to cardKind=schedule, got ${kind}`,
      );
    }
    return null;
  }
  if (kind === "story") {
    return fail(
      "STORY_CARD_FORBIDDEN",
      "recurring explicit Free fallback must not point to StoryCard",
    );
  }
  if (kind !== "free") {
    return fail(
      "CARD_KIND",
      `recurring explicit fallback requires cardKind=free, got ${kind}`,
    );
  }
  return null;
}

/**
 * 解析 recurring / 调度意图的目标卡。
 * scheduleCardId → (__schedule__, id) 且 cardKind=schedule；
 * 显式 packageId+cardId → 允许 free/schedule，禁止 story。
 */
export function resolveScheduledCardReference(
  input: ScheduledCardRefInput,
  lookup: ScheduledCardLookup,
): ScheduledCardResolveResult {
  const agentId = input.agentId?.trim();
  if (!agentId) return fail("MISSING_REF", "recurring requires agentId");

  const target = resolveTargetIds(input);
  if ("ok" in target && target.ok === false) return target;

  const { packageId, cardId } = target as {
    packageId: string;
    cardId: string;
  };
  const card = lookup(packageId, cardId);
  if (!card) {
    return fail("CARD_NOT_FOUND", `card not found: ${packageId}/${cardId}`);
  }

  const kind = (card.cardKind ?? "story") as CardKind;
  const kindErr = assertKindAllowed(
    packageId,
    kind,
    Boolean(input.scheduleCardId),
  );
  if (kindErr) return kindErr;

  if (card.ownerAgentId !== agentId) {
    return fail(
      "OWNER_MISMATCH",
      `card owner ${card.ownerAgentId} !== recurring agentId ${agentId}`,
    );
  }

  return {
    ok: true,
    packageId,
    cardId,
    cardKind: kind,
    ownerAgentId: card.ownerAgentId,
  };
}
