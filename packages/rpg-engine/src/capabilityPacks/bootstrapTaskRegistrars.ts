/**
 * tasks.register：Host 装配时调用一次；完整定时 / onTick 属后续产品化。
 */
import type { TaskRegistrar } from "./contributeTypes.js";

export function bootstrapTaskRegistrars(input: {
	registrars: readonly TaskRegistrar[];
	packIdByTaskId?: ReadonlyMap<string, string>;
}): void {
	for (const reg of input.registrars) {
		reg.register({
			packId: input.packIdByTaskId?.get(reg.taskId) ?? "unknown",
		});
	}
}
