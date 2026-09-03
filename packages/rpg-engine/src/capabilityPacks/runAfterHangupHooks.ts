/**
 * 运行 call.afterHangup 钩子；失败记 log 不阻断挂机主链。
 * 时序：endCall 写入 outcome 之后、Free/Story 分支之前（同步段前部，非整条挂机流水线末尾）。
 */
import type { PlayerProfile } from "../schema/profile.js";
import type { AfterHangupHook } from "./contributeTypes.js";
import type { CapabilityPackLogEvent } from "./mergeCapabilityPacks.js";

export async function runAfterHangupHooks(input: {
	hooks: readonly AfterHangupHook[];
	userId: string;
	sessionId: string;
	agentId: string;
	profile: PlayerProfile;
	packIdByHookId?: ReadonlyMap<string, string>;
}): Promise<CapabilityPackLogEvent[]> {
	const events: CapabilityPackLogEvent[] = [];
	if (input.hooks.length === 0) {
		return events;
	}
	events.push({
		type: "capabilityPack.afterHangup",
		hookCount: input.hooks.length,
		packIds: [
			...new Set(
				input.hooks.map(function (hook) {
					return input.packIdByHookId?.get(hook.hookId) ?? "unknown";
				}),
			),
		],
	});
	for (const hook of input.hooks) {
		try {
			await hook.run({
				userId: input.userId,
				sessionId: input.sessionId,
				agentId: input.agentId,
				profile: input.profile,
			});
		} catch (err) {
			events.push({
				type: "capabilityPack.afterHangup_failed",
				packId: input.packIdByHookId?.get(hook.hookId) ?? "unknown",
				hookId: hook.hookId,
				message: err instanceof Error ? err.message : String(err),
			});
		}
	}
	return events;
}
