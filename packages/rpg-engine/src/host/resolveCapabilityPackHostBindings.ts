/**
 * Host 装配期：解析 L1 能力包选项并执行 tasks.register。
 * 从 createEngineHost 拆出以降基线。
 */
import type { CreateEngineHostOptions } from "../ports/engineHostApi.js";
import type {
	AfterHangupHook,
	SoftExtraEnricher,
} from "../capabilityPacks/contributeTypes.js";
import type { CapabilityPackLogEvent } from "../capabilityPacks/mergeCapabilityPacks.js";
import { bootstrapTaskRegistrars } from "../capabilityPacks/bootstrapTaskRegistrars.js";

export type CapabilityPackHostBindings = {
	afterHangupHooks: readonly AfterHangupHook[];
	packIdByHookId: ReadonlyMap<string, string> | undefined;
	softExtraEnrichers: readonly SoftExtraEnricher[];
	capabilityPackEvents: readonly CapabilityPackLogEvent[];
};

export function resolveCapabilityPackHostBindings(
	options: CreateEngineHostOptions,
): CapabilityPackHostBindings {
	bootstrapTaskRegistrars({
		registrars: options.taskRegistrars ?? [],
		packIdByTaskId: options.packIdByTaskId ?? undefined,
	});
	return {
		afterHangupHooks: options.afterHangupHooks ?? [],
		packIdByHookId: options.packIdByHookId ?? undefined,
		softExtraEnrichers: options.softExtraEnrichers ?? [],
		capabilityPackEvents: options.capabilityPackEvents ?? [],
	};
}
