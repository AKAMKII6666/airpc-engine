/**
	* background tick → outbound.request 贡献执行与请求归一化。
	*/
import type {
	PluginCapabilityApi,
	PluginOutboundRequest,
} from "@airpc/pack-sdk";
import type { ScannedPluginContributions } from "@studio-v2/src/utils/server/plugins/load/scan/scannedPluginTypes.server";

function readString(value: unknown): string | undefined {
	return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

function pickFirstString(...values: unknown[]): string | undefined {
	for (const value of values) {
		const s = readString(value);
		if (s) return s;
	}
	return undefined;
}

export function toOutboundRequest(input: {
	value: unknown;
	taskId: string;
	nowIso: string;
	payload?: Record<string, unknown>;
}): PluginOutboundRequest | null {
	if (!input.value || typeof input.value !== "object") return null;
	const raw = input.value as Record<string, unknown>;
	if (raw.shouldCall === false) return null;

	const userId = pickFirstString(raw.userId, input.payload?.userId);
	const characterId = pickFirstString(
		raw.characterId,
		raw.agentId,
		input.payload?.characterId,
		input.payload?.agentId,
	);
	const cardId = pickFirstString(raw.cardId, input.payload?.cardId);
	const chapterId = pickFirstString(raw.chapterId, input.payload?.chapterId);
	if (!userId || !characterId || !cardId || !chapterId) return null;

	return {
		userId,
		characterId,
		cardId,
		chapterId,
		reason: readString(raw.reason),
		extras: {
			taskId: input.taskId,
			nowIso: input.nowIso,
			decision: raw,
		},
	};
}

export async function runOutboundRequestContributions(input: {
	api: PluginCapabilityApi;
	manifestId: string;
	out: ScannedPluginContributions;
	taskId: string;
	nowIso: string;
	payload?: Record<string, unknown>;
}): Promise<void> {
	for (const contribution of input.out.outboundRequest) {
		if (contribution.pluginId !== input.manifestId) continue;
		const decision = await contribution.run({
			taskId: input.taskId,
			nowIso: input.nowIso,
			payload: input.payload ?? {},
		});
		const req = toOutboundRequest({
			value: decision,
			taskId: input.taskId,
			nowIso: input.nowIso,
			payload: input.payload,
		});
		if (req) {
			await input.api.outbound.requestCall(req);
		}
	}
}
