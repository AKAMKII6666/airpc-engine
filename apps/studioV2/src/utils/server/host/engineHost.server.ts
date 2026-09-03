/**
	* 模块名称：Studio V2 EngineHost 进程单例装配
	* 模块说明：createEngineIOPorts(dataRoot) → getEngineHost({ ports })；
	* 仅 app/api / *.server.ts / utils/server 可引用；禁止 Client 区 import。
	* 协议：技术设计 23 §5；需求引擎存取 Port 抽象 §5。
	* L1：merge 后注入 softExtras / scheduleGates / afterHangup / tasks.register；
	* commit.* 经 MemoryCommit Orchestrator，不经 Host beginCall。
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
// 引用了第一方 CapabilityPack 装配，用于 merge 后注入 promptProviderRegistry
import { assembleFirstPartyCapabilityPacks } from "../capabilityPacks/assembleFirstPartyPacks.server";

let ports: EngineIOPorts | null = null;
let workspaceLoaded = false;
let workspaceError: { code: string; message: string } | null = null;
let postCallJobsRecovered = false;

/**
	* 按 dataRoot 懒建 Ports；Memory 连接须进程内复用，禁止每次 getHost 新开库。
	* commit.* Pack 贡献注入 Orchestrator（非 Host beginCall 路径）。
	*/
function ensureEngineIOPorts(dataRoot: string): EngineIOPorts {
	if (!ports) {
		const packs = assembleFirstPartyCapabilityPacks();
		const io = createEngineIOPorts(dataRoot);
		ports = {
			...io,
			memory: createMemoryCommitOrchestratingPort(io.memory, {
				commitContextEnrichers: packs.commitContextEnrichers,
				commitExtractContributors: packs.commitExtractContributors,
			}),
		};
	}
	return ports;
}

/**
	* 热更后旧 Host 单例可能缺 PostCallJob API；dev 下重建以免 listPostCallJobs 炸。
	*/
function hostHasPostCallApi(host: EngineHost): boolean {
	return typeof host.listPostCallJobs === "function";
}

function createConfiguredHost(io: EngineIOPorts): EngineHost {
	const packs = assembleFirstPartyCapabilityPacks();
	return getEngineHost({
		memory: io.memory,
		profile: io.profile,
		content: io.content,
		engineLog: io.engineLog,
		postCallJob: io.postCallJob,
		// 无 Key / 禁用时为 null → Host 内走 fallback lore
		loreBootstrap: createLlmLoreBootstrapPortFromEnv(),
		promptProviderRegistry: packs.promptProviderRegistry,
		afterHangupHooks: packs.afterHangupHooks,
		packIdByHookId: packs.packIdByHookId,
		scheduleGates: packs.scheduleGates,
		packIdByGateId: packs.packIdByGateId,
		softExtraEnrichers: packs.softExtraEnrichers,
		taskRegistrars: packs.taskRegistrars,
		packIdByTaskId: packs.packIdByTaskId,
		capabilityPackEvents: packs.events,
	});
}

/**
	* 取得已注入本机 Ports 的 Host，并确保 workspace 已 load。
	* getEngineHost 仅首次创建时吃 options；本函数保证首次即带齐四 Port。
	*/
export async function getStudioV2EngineHost(): Promise<EngineHost> {
	const dataRoot = getStudioV2DataRoot();
	const io = ensureEngineIOPorts(dataRoot);
	let host = createConfiguredHost(io);
	if (!hostHasPostCallApi(host)) {
		resetEngineHostForTests();
		workspaceLoaded = false;
		postCallJobsRecovered = false;
		host = createConfiguredHost(io);
	}
	if (!workspaceLoaded && !workspaceError) {
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
		}
	}
	if (workspaceError && !workspaceLoaded) {
		throw workspaceError;
	}
	if (workspaceLoaded && !postCallJobsRecovered && hostHasPostCallApi(host)) {
		postCallJobsRecovered = true;
		const recovered = await host.recoverPostCallJobs();
		if (isEngineError(recovered)) {
			// 恢复失败不阻断调试；job tip 仍可读内存态
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

/**
	* Content 保存后刷新引擎工作区缓存。
	* 默认保留 sessions / profiles（与旧 Studio reload 口径一致）。
	*/
export async function reloadStudioV2Workspace(): Promise<void> {
	const dataRoot = getStudioV2DataRoot();
	const io = ensureEngineIOPorts(dataRoot);
	const host = createConfiguredHost(io);
	await host.loadWorkspace(dataRoot, { resetRuntime: false });
	workspaceLoaded = true;
	workspaceError = null;
}

/**
	* 内容写盘后通知：仅当 Host 已装配过才刷缓存，避免纯编辑路径强制开 SQLite。
	* 首次 getStudioV2EngineHost 会重新扫盘，故未 boot 时跳过是安全的。
	*/
export async function reloadStudioV2WorkspaceIfBooted(): Promise<void> {
	if (!ports) {
		return;
	}
	await reloadStudioV2Workspace();
}

/** 显式重置运行时（踢会话 + 清 Profile 缓存），禁与普通保存绑定 */
export async function resetStudioV2WorkspaceRuntime(): Promise<void> {
	const host = await getStudioV2EngineHost();
	host.resetRuntime();
}

/**
	* 仅测试：关 Memory 库、清本模块状态、重置引擎进程单例。
	* 退出条件：正式 API 路径不得调用。
	*/
export function resetStudioV2EngineHostForTests(): void {
	if (ports?.memory.close) {
		try {
			ports.memory.close();
		} catch {
			/* 测试 teardown：库已关则忽略 */
		}
	}
	ports = null;
	workspaceLoaded = false;
	workspaceError = null;
	postCallJobsRecovered = false;
	resetEngineHostForTests();
}
