/**
 * tasks.register：Host 装配时调用一次；单条失败跳过，不炸 cold boot。
 */
import type { TaskRegistrar } from "./contributeTypes.js";
import type { CapabilityPackLogEvent } from "./mergeCapabilityPacksCollect.js";

export type BootstrapTaskRegistrarsResult = {
	events: CapabilityPackLogEvent[];
};

export function bootstrapTaskRegistrars(input: {
	registrars: readonly TaskRegistrar[];
	packIdByTaskId?: ReadonlyMap<string, string>;
}): BootstrapTaskRegistrarsResult {
	const events: CapabilityPackLogEvent[] = [];
	for (const reg of input.registrars) {
		const packId = input.packIdByTaskId?.get(reg.taskId) ?? "unknown";
		try {
			reg.register({ packId });
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			events.push({
				type: "capabilityPack.merge_rejected",
				packId,
				reason: `task_register_failed:${reg.taskId}:${message}`,
			});
		}
	}
	return { events };
}
