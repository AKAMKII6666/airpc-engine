/**
	* EngineHost cold boot：装配 L1+L2、建 Ports、首次 getEngineHost。
	* 从 engineHost.server 拆出以控 bootHost 有效行与复杂度。
	*/
import {
	getEngineHost,
	type EngineHost,
} from "@airpc/rpg-engine";
import {
	createEngineIOPorts,
	type EngineIOPorts,
} from "@studio-v2/engineIOModule/createEngineIOPorts";
import { getStudioV2DataRoot } from "../data/dataRoot.server";
import { createMemoryCommitOrchestratingPort } from "../memory/ports/memoryCommitMemoryPort.server";
import { createLlmLoreBootstrapPortFromEnv } from "../lore/bootstrap/loreBootstrapLlm.server";
import {
	assembleCapabilityRuntime,
	type AssembledCapabilityRuntime,
} from "@studio-v2/src/utils/server/plugins/assemble/assembleWithPlugins.server";
import { createPluginOutboundRequestHandler } from "@studio-v2/src/utils/server/plugins/api/outbound/requestOutbound.server";
import { createStudioGenerateVoicemailPort } from "@studio-v2/src/utils/server/voicemail/generateVoicemail.server";

export type EngineHostBootSlot = {
	ports: EngineIOPorts | null;
	liveHost: EngineHost | null;
	runtimePacks: AssembledCapabilityRuntime | null;
};

function requireLiveHost(slot: EngineHostBootSlot): EngineHost {
	if (!slot.liveHost) {
		throw new Error("ENGINE_HOST_NOT_READY");
	}
	return slot.liveHost;
}

function ensureOrchestratingPorts(
	slot: EngineHostBootSlot,
	dataRoot: string,
	packs: AssembledCapabilityRuntime,
): EngineIOPorts {
	if (slot.ports) return slot.ports;
	const io = createEngineIOPorts(dataRoot);
	const next: EngineIOPorts = {
		...io,
		memory: createMemoryCommitOrchestratingPort(io.memory, {
			commitContextEnrichers: packs.commitContextEnrichers,
			commitExtractContributors: packs.commitExtractContributors,
		}),
	};
	slot.ports = next;
	return next;
}

function createHostWithPacks(
	ports: EngineIOPorts,
	packs: AssembledCapabilityRuntime,
): EngineHost {
	return getEngineHost({
		toolRegistry: packs.toolRegistry,
		memory: ports.memory,
		profile: ports.profile,
		content: ports.content,
		engineLog: ports.engineLog,
		postCallJob: ports.postCallJob,
		loreBootstrap: createLlmLoreBootstrapPortFromEnv(),
		generateVoicemail: createStudioGenerateVoicemailPort(),
		promptProviderRegistry: packs.promptProviderRegistry,
		afterHangupHooks: packs.afterHangupHooks,
		packIdByHookId: packs.packIdByHookId,
		scheduleGates: packs.scheduleGates,
		packIdByGateId: packs.packIdByGateId,
		softExtraEnrichers: packs.softExtraEnrichers,
		taskRegistrars: packs.taskRegistrars,
		packIdByTaskId: packs.packIdByTaskId,
		capabilityPackEvents: packs.capabilityPackEvents,
	});
}

/**
	* 装配能力包 → Ports → Host；写入 slot（ports / runtimePacks / liveHost）。
	* 插件 entry 在加载期不得调用能力 API（Host 尚未就绪）。
	*/
export async function createBootedHost(
	slot: EngineHostBootSlot,
): Promise<EngineHost> {
	const dataRoot = getStudioV2DataRoot();
	const packs = await assembleCapabilityRuntime({
		getHost: function () {
			return requireLiveHost(slot);
		},
		requestOutbound: createPluginOutboundRequestHandler({
			getHost: function () {
				return requireLiveHost(slot);
			},
		}),
	});
	slot.runtimePacks = packs;
	const ports = ensureOrchestratingPorts(slot, dataRoot, packs);
	const host = createHostWithPacks(ports, packs);
	slot.liveHost = host;
	return host;
}
