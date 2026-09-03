/**
	* 模块名称：Studio V2 第一方 CapabilityPack 装配
	* 模块说明：静态 merge → 注入 Host（providers / softExtras / gates / afterHangup / tasks）
	* 与 MemoryCommit Orchestrator（commit.*）；禁扫 workspace plugins。
	* 协议：技术设计 24 §0 / §4；路径避开 server/packages（故事包 IO）。
	*/
import {
	CORE_COMPOSE_PACK_ID,
	coreComposePack,
	mergeCapabilityPacks,
	outboundWindowGatePack,
	OUTBOUND_WINDOW_GATE_PACK_ID,
	userLocationPack,
	USER_LOCATION_PACK_ID,
	type FirstPartyPack,
	type MergeCapabilityPacksResult,
} from "@airpc/rpg-engine";

/**
	* 默认启用清单：core-compose + L1-C 样板。
	*/
export function getDefaultEnabledFirstPartyPackIds(): string[] {
	return [
		CORE_COMPOSE_PACK_ID,
		USER_LOCATION_PACK_ID,
		OUTBOUND_WINDOW_GATE_PACK_ID,
	];
}

/** 已注册的第一方包（静态 import；core 在前） */
export function listFirstPartyPacks(): FirstPartyPack[] {
	return [coreComposePack, userLocationPack, outboundWindowGatePack];
}

/**
	* 按启用清单合并第一方包；启用 core-compose 时 baseProviders 置空以免双份默认链。
	*/
export function assembleFirstPartyCapabilityPacks(
	enabledPackIds: readonly string[] | null = getDefaultEnabledFirstPartyPackIds(),
): MergeCapabilityPacksResult {
	const enabled =
		enabledPackIds === null
			? null
			: enabledPackIds;
	const useCore =
		enabled === null || enabled.includes(CORE_COMPOSE_PACK_ID);
	return mergeCapabilityPacks({
		packs: listFirstPartyPacks(),
		enabledPackIds: enabled,
		baseProviders: useCore ? [] : undefined,
	});
}
