/**
	* 插件 outbound.requestCall 宿主处理器。
	* 先跑 outbound.prepare 贡献，再写 Host Profile 的 CallCard pending。
	*/
import { randomUUID } from "node:crypto";
import type { PluginOutboundRequest } from "@airpc/pack-sdk";
import type { EngineHost } from "@airpc/rpg-engine";
import { emitPluginLog } from "@studio-v2/src/utils/server/plugins/log/pluginLog.server";
import { getCachedCapabilityRuntime } from "@studio-v2/src/utils/server/plugins/assemble/assembleWithPlugins.server";

export type PluginOutboundHandlerResult = {
	accepted: boolean;
	reason?: string;
};

export type PluginOutboundHandler = (
	input: PluginOutboundRequest,
) => Promise<PluginOutboundHandlerResult>;

function readRequiredString(
	value: string | undefined,
	reason: string,
): { ok: true; value: string } | { ok: false; reason: string } {
	if (typeof value === "string" && value.trim() !== "") {
		return { ok: true, value };
	}
	return { ok: false, reason };
}

async function runOutboundPrepare(
	req: PluginOutboundRequest,
): Promise<{ ok: true } | { ok: false; reason: string }> {
	const runtime = getCachedCapabilityRuntime();
	const handlers = runtime?.plugins.outboundPrepare ?? [];
	for (const h of handlers) {
		try {
			const prepared = await h.run({
				userId: req.userId,
				characterId: req.characterId,
				chapterId: req.chapterId,
				cardId: req.cardId,
				reason: req.reason,
				extras: req.extras ?? {},
			});
			emitPluginLog({
				type: "plugin.outbound_prepare",
				pluginId: h.pluginId,
			});
			if (
				prepared &&
				typeof prepared === "object" &&
				(prepared as { skip?: unknown }).skip === true
			) {
				return {
					ok: false,
					reason: `outbound_prepare_skip:${h.pluginId}`,
				};
			}
		} catch (err) {
			const reason = err instanceof Error ? err.message : String(err);
			emitPluginLog({
				type: "plugin.load_failed",
				pluginId: h.pluginId,
				reason: `outbound_prepare_error:${reason}`,
			});
			return { ok: false, reason: `outbound_prepare_error:${h.pluginId}` };
		}
	}
	return { ok: true };
}

/**
	* L2 插件外呼必须先物化为 pending CallCard，避免绕过正式会话入口。
	*/
export function createPluginOutboundRequestHandler(input: {
	getHost: () => EngineHost | Promise<EngineHost>;
}): PluginOutboundHandler {
	return async function requestOutbound(
		req: PluginOutboundRequest,
	): Promise<PluginOutboundHandlerResult> {
		const cardId = readRequiredString(req.cardId, "cardId_required");
		if (!cardId.ok) return { accepted: false, reason: cardId.reason };
		const chapterId = readRequiredString(req.chapterId, "chapterId_required");
		if (!chapterId.ok) return { accepted: false, reason: chapterId.reason };
		const userId = readRequiredString(req.userId, "userId_required");
		if (!userId.ok) return { accepted: false, reason: userId.reason };
		const characterId = readRequiredString(
			req.characterId,
			"characterId_required",
		);
		if (!characterId.ok) {
			return { accepted: false, reason: characterId.reason };
		}

		const prepared = await runOutboundPrepare(req);
		if (!prepared.ok) {
			emitPluginLog({
				type: "plugin.outbound_request",
				pluginId: "host",
				accepted: false,
			});
			return { accepted: false, reason: prepared.reason };
		}

		const host = await input.getHost();
		const profile = await host.ensureProfile(userId.value);
		const byAgent = profile.callCards.board.byAgent;
		if (!byAgent[characterId.value]) {
			byAgent[characterId.value] = { pending: [] };
		}
		const board = byAgent[characterId.value]!;
		const existing = board.pending.find(function (item) {
			return item.cardId === cardId.value && item.status === "pending";
		});
		if (!existing) {
			const nowIso = new Date().toISOString();
			board.pending.push({
				instanceId: randomUUID(),
				cardId: cardId.value,
				chapterId: chapterId.value,
				agentId: characterId.value,
				status: "pending",
				entryMode: "outbound_auto",
				activationHint: "outbound_auto",
				createdAt: nowIso,
				updatedAt: nowIso,
			});
		}
		await host.saveProfile(userId.value, "autosave");
		emitPluginLog({
			type: "plugin.outbound_request",
			pluginId: "host",
			accepted: true,
		});
		return { accepted: true };
	};
}
