/**
	* 模块名称：Studio V2 EngineHost 进程单例装配
	* 模块说明：createEngineIOPorts(dataRoot) → getEngineHost({ ports })；
	* 仅 app/api / *.server.ts / utils/server 可引用；禁止 Client 区 import。
	* 协议：技术设计 23 §5；L1+L2 合流见 assembleWithPlugins。
	*/
import {
	getEngineHost,
	isEngineError,
	resetEngineHostForTests,
	type EngineHost,
} from "@airpc/rpg-engine";
// 引用了本机 IO 工厂，用于一次创建四 Port 并注入 Host
import {
	createEngineIOPorts,
	type EngineIOPorts,
} from "@studio-v2/engineIOModule/createEngineIOPorts";
import { getStudioV2DataRoot } from "../data/dataRoot.server";
import { createMemoryCommitOrchestratingPort } from "../memory/memoryCommitMemoryPort.server";
import { createLlmLoreBootstrapPortFromEnv } from "../lore/bootstrap/loreBootstrapLlm.server";
import {
	assembleCapabilityRuntime,
	getCachedCapabilityRuntime,
	resetAssembledCapabilityRuntimeForTests,
	type AssembledCapabilityRuntime,
} from "@studio-v2/src/utils/server/plugins/assemble/assembleWithPlugins.server";
import { createPluginOutboundRequestHandler } from "@studio-v2/src/utils/server/plugins/api/outbound/requestOutbound.server";
// 引用了留言物化端口，用于挂机后把 GenStack 写成可读 unread 槽
import { createStudioGenerateVoicemailPort } from "@studio-v2/src/utils/server/voicemail/generateVoicemail.server";

let ports: EngineIOPorts | null = null;
let workspaceLoaded = false;
let workspaceError: { code: string; message: string } | null = null;
let postCallJobsRecovered = false;
let runtimePacks: AssembledCapabilityRuntime | null = null;
/** 供插件 API 懒解析；getEngineHost 首次创建前为 null */
let liveHost: EngineHost | null = null;
/** cold boot 单飞，避免并发重复扫描/装配 */
let bootInFlight: Promise<EngineHost> | null = null;
/** 首次 loadWorkspace 单飞 */
let workspaceLoadInFlight: Promise<void> | null = null;

function hostHasPostCallApi(host: EngineHost): boolean {
	return typeof host.listPostCallJobs === "function";
}

/**
	* 装配 L1+L2 → 建 Ports → 首次 getEngineHost（带齐 options）。
	* 插件 entry 在加载期不得调用能力 API（Host 尚未就绪）。
	*/
async function bootHost(): Promise<EngineHost> {
	if (bootInFlight) {
		return bootInFlight;
	}
	bootInFlight = (async function () {
		const dataRoot = getStudioV2DataRoot();
		const packs = await assembleCapabilityRuntime({
			getHost: function () {
				if (!liveHost) {
					throw new Error("ENGINE_HOST_NOT_READY");
				}
				return liveHost;
			},
			requestOutbound: createPluginOutboundRequestHandler({
				getHost: function () {
					if (!liveHost) {
						throw new Error("ENGINE_HOST_NOT_READY");
					}
					return liveHost;
				},
			}),
		});
		runtimePacks = packs;
		if (!ports) {
			const io = createEngineIOPorts(dataRoot);
			ports = {
				...io,
				memory: createMemoryCommitOrchestratingPort(io.memory, {
					commitContextEnrichers: packs.commitContextEnrichers,
					commitExtractContributors: packs.commitExtractContributors,
				}),
			};
		}
		const host = getEngineHost({
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
		liveHost = host;
		return host;
	})();
	try {
		return await bootInFlight;
	} finally {
		bootInFlight = null;
	}
}

async function ensureWorkspaceLoaded(host: EngineHost): Promise<void> {
	if (workspaceLoaded || workspaceError) {
		return;
	}
	if (workspaceLoadInFlight) {
		await workspaceLoadInFlight;
		return;
	}
	const dataRoot = getStudioV2DataRoot();
	workspaceLoadInFlight = (async function () {
		try {
			await host.loadWorkspace(dataRoot);
			workspaceLoaded = true;
		} catch (err) {
			if (isEngineError(err)) {
				workspaceError = { code: err.code, message: err.message };
			} else {
				workspaceError = {
					code: "ENGINE_INTERNAL",
					message: err instanceof Error ? err.message : String(err),
				};
			}
			throw err;
		} finally {
			workspaceLoadInFlight = null;
		}
	})();
	await workspaceLoadInFlight;
}

/**
	* 取得已注入本机 Ports 的 Host，并确保 workspace 已 load。
	*/
export async function getStudioV2EngineHost(): Promise<EngineHost> {
	let host = liveHost ?? (await bootHost());
	if (!hostHasPostCallApi(host)) {
		resetStudioV2EngineHostForTests();
		host = await bootHost();
	}
	if (!workspaceLoaded && !workspaceError) {
		await ensureWorkspaceLoaded(host);
	}
	if (workspaceError && !workspaceLoaded) {
		throw workspaceError;
	}
	if (workspaceLoaded && !postCallJobsRecovered && hostHasPostCallApi(host)) {
		postCallJobsRecovered = true;
		const recovered = await host.recoverPostCallJobs();
		if (isEngineError(recovered)) {
			console.warn("[studioV2] recoverPostCallJobs failed", recovered);
		}
	}
	return host;
}

export function getStudioV2WorkspaceLoadError(): {
	code: string;
	message: string;
} | null {
	return workspaceError;
}

export async function reloadStudioV2Workspace(): Promise<void> {
	const host = await getStudioV2EngineHost();
	const dataRoot = getStudioV2DataRoot();
	await host.loadWorkspace(dataRoot, { resetRuntime: false });
	workspaceLoaded = true;
	workspaceError = null;
}

export async function reloadStudioV2WorkspaceIfBooted(): Promise<void> {
	if (!ports) {
		return;
	}
	await reloadStudioV2Workspace();
}

export async function resetStudioV2WorkspaceRuntime(): Promise<void> {
	const host = await getStudioV2EngineHost();
	host.resetRuntime();
}

export function resetStudioV2EngineHostForTests(): void {
	if (ports?.memory.close) {
		try {
			ports.memory.close();
		} catch {
			/* 测试 teardown */
		}
	}
	ports = null;
	workspaceLoaded = false;
	workspaceError = null;
	postCallJobsRecovered = false;
	runtimePacks = null;
	liveHost = null;
	bootInFlight = null;
	workspaceLoadInFlight = null;
	resetAssembledCapabilityRuntimeForTests();
	resetEngineHostForTests();
}

/** 调试 / 面板：已装配的 L2 运行时快照 */
export function getStudioV2CapabilityRuntime(): AssembledCapabilityRuntime | null {
	return runtimePacks ?? getCachedCapabilityRuntime();
}
