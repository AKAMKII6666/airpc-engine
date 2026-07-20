/** beginCall 时按 classifyCall 决定是否激活 StorySave（REST-E6）。 */
import { activateStoryOnBegin } from "../runtime/activeStoryLock.js";
import { classifyCall } from "../runtime/classifyCall.js";
import type { PlayerProfile } from "../schema/profile.js";
import type { CardKind } from "../schema/callCard.js";

export function maybeActivateStoryOnBegin(input: {
  profile: PlayerProfile | undefined;
  packageId: string;
  cardKind: CardKind | string | undefined;
  source: string;
  instanceId: string;
  nowIso: string;
}): void {
  if (!input.profile) return;
  if (
    !classifyCall({
      packageId: input.packageId,
      cardKind: input.cardKind,
      source: input.source,
    }).isNarrative
  ) {
    return;
  }
  activateStoryOnBegin(input.profile, {
    packageId: input.packageId,
    instanceId: input.instanceId,
    nowIso: input.nowIso,
  });
}

export function sessionIsFreeLike(input: {
  packageId: string;
  cardKind: CardKind | string | undefined;
  source: string;
}): boolean {
  return classifyCall(input).isFreeLike;
}
