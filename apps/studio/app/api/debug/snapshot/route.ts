/**
 * 模块名称：GET /api/debug/snapshot
 */
import {
	apiFail,
	apiOk,
	httpStatusForCode,
} from "@studio/server/apiResponse.server";
import { getStudioEngineHost } from "@studio/server/engineHost.server";
import { getSelectedUserId } from "@studio/server/sessionUser.server";
import { isEngineError, resolveToolPolicy } from "@airpc/rpg-engine";

export async function GET(req: Request): Promise<Response> {
	try {
		const url = new URL(req.url);
		const userId = url.searchParams.get("userId") ?? (await getSelectedUserId());
		if (!userId) {
			return apiFail("USER_REQUIRED", "select user first", 403);
		}
		const host = await getStudioEngineHost();
		const profile = await host.ensureProfile(userId);
		const active = host.getActiveSession(userId);
    const toolPolicy = active
      ? resolveToolPolicy(active.frozenCard)
      : null;
    const world = profile.world ?? { lore: null, facts: [], knowledge: {} };
    const facts = Array.isArray(world.facts) ? world.facts.slice(0, 12) : [];
    const knowledgeKeys = Object.keys(world.knowledge ?? {}).slice(0, 12);
		return apiOk({
			userId,
			board: profile.callCards.board,
			telephony: profile.telephony ?? null,
			characters: profile.characters,
      worldSummary: {
        lore: world.lore ?? null,
        factCount: Array.isArray(world.facts) ? world.facts.length : 0,
        facts,
        knowledgeKeys,
        knowledgeSample: knowledgeKeys.reduce(
          function (acc, key) {
            acc[key] = (world.knowledge as Record<string, unknown>)[key];
            return acc;
          },
          {} as Record<string, unknown>,
        ),
      },
      activeSession: active
        ? {
            sessionId: active.sessionId,
            status: active.status,
            cardId: active.resolve.cardId,
            agentId: active.resolve.agentId,
            packageId: active.packageId,
            resolveSource: active.resolve.source,
            cardKind: active.frozenCard.cardKind,
            interactionPhase: active.interactionPhase,
            playback: active.playback ?? null,
            phoneFlags: active.phoneFlags,
            composeScene: active.composeScene,
            renderedPrompt: active.renderedPrompt,
            matchedLayerIds: active.matchedLayerIds,
            toolPolicy,
            exitCandidates: active.exitCandidates,
            toolTrace: active.toolTrace,
            selectedExit: active.selectedExit,
            effectPlanResult: active.effectPlanResult,
            lastSimEvent: active.lastSimEvent ?? null,
            outcome: active.outcome,
          }
        : null,
			recentLogs: host.getRecentLogs({ userId, limit: 30 }),
		});
	} catch (err) {
		if (isEngineError(err)) {
			return apiFail(err.code, err.message, httpStatusForCode(err.code));
		}
		return apiFail(
			"ENGINE_INTERNAL",
			err instanceof Error ? err.message : String(err),
			500,
		);
	}
}
