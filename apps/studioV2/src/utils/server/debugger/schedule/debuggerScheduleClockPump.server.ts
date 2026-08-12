/**
	* 调试器真实墙钟调度泵。
	* Node timer 只存在 Studio server；引擎仍只接收 deltaMs 并保持纯调度逻辑。
	*/
import { isEngineError, type EngineHost } from "@airpc/rpg-engine";
import { getStudioV2EngineHost } from "@studio-v2/src/utils/server/host/engineHost.server";
import { writeDtoLog } from "@studio-v2/src/utils/server/observability/dto/dtoLogStore.server";
import { writeStudioLog } from "@studio-v2/src/utils/server/observability/logger/pinoLogger.server";

export type DebuggerScheduleClockPumpResult = {
	/** 当前被推进的调试用户 */
	userId: string;
	/** 本轮墙钟起点；首次启动时等于 toWallMs */
	fromWallMs: number;
	/** 本轮墙钟终点 */
	toWallMs: number;
	/** 实际推进给 Host 的 deltaMs；可能被 maxDeltaMs 限流 */
	deltaMs: number;
	/** 是否调用过 Host.advanceClock */
	advanced: boolean;
	/** Host 本轮 fired schedule item 数 */
	firedCount: number;
	/** Host 当前 pending incoming event 数，用于核对是否已投递到电话壳 */
	pendingIncomingCount: number;
};

export type DebuggerScheduleClockPumpOptions = {
	/** 测试可注入当前墙钟毫秒；正式路径使用 Date.now */
	nowMs?: () => number;
	/** 单次最大推进量，避免休眠/断点调试后一次跨太久 */
	maxDeltaMs?: number;
	/** 测试可注入 dataRoot，用于检查 DTO/pino 输出 */
	dataRoot?: string;
	/** 测试可同步写 pino，正式路径保持异步 */
	syncLogs?: boolean;
};

type PumpState = {
	/** 上次已确认推进到的墙钟毫秒 */
	lastWallMs: number;
	/** 后台 interval；仅正式路径启动 */
	timer: ReturnType<typeof setInterval> | null;
	/** 防止 interval 与 API 请求并发推进同一 user */
	inFlight: boolean;
};

const DEFAULT_INTERVAL_MS = 2500;
const DEFAULT_MAX_DELTA_MS = 10 * 60_000;
const pumpStates = new Map<string, PumpState>();

function nowMs(options: DebuggerScheduleClockPumpOptions): number {
	const value = options.nowMs ? options.nowMs() : Date.now();
	if (Number.isFinite(value) && value >= 0) return Math.floor(value);
	throw Object.assign(new Error("invalid wall clock"), {
		code: "VALIDATION_FAILED",
		status: 400,
	});
}

function maxDeltaMs(options: DebuggerScheduleClockPumpOptions): number {
	const value = options.maxDeltaMs ?? DEFAULT_MAX_DELTA_MS;
	if (Number.isFinite(value) && value > 0) return Math.floor(value);
	throw Object.assign(new Error("invalid maxDeltaMs"), {
		code: "VALIDATION_FAILED",
		status: 400,
	});
}

function getOrCreateState(userId: string, wallMs: number): PumpState {
	const existing = pumpStates.get(userId);
	if (existing) return existing;
	const created: PumpState = {
		lastWallMs: wallMs,
		timer: null,
		inFlight: false,
	};
	pumpStates.set(userId, created);
	return created;
}

function pumpDtoId(userId: string): string {
	return `schedule-pump-${userId}`;
}

async function recordPumpResult(
	result: DebuggerScheduleClockPumpResult,
	options: DebuggerScheduleClockPumpOptions,
): Promise<void> {
	writeStudioLog("schedule", "info", {
		event: "schedule.clock_pump.advanced",
		userId: result.userId,
		message: "debugger wall clock advanced Host schedule clock",
		payload: result,
	}, {
		dataRoot: options.dataRoot,
		now: new Date(result.toWallMs),
		sync: options.syncLogs,
	});
	await writeDtoLog({
		bucket: "schedule-intents",
		id: pumpDtoId(result.userId),
		event: "schedule.clock_pump.advanced",
		userId: result.userId,
		summary: {
			deltaMs: result.deltaMs,
			firedCount: result.firedCount,
			pendingIncomingCount: result.pendingIncomingCount,
		},
		payload: result,
	}, {
		dataRoot: options.dataRoot,
		now: new Date(result.toWallMs),
	});
}

function idleResult(input: {
	/** 当前调试用户 */
	userId: string;
	/** 墙钟起点 */
	fromWallMs: number;
	/** 墙钟终点 */
	toWallMs: number;
	/** 当前 pending incoming event 数 */
	pendingIncomingCount: number;
}): DebuggerScheduleClockPumpResult {
	return {
		userId: input.userId,
		fromWallMs: input.fromWallMs,
		toWallMs: input.toWallMs,
		deltaMs: 0,
		advanced: false,
		firedCount: 0,
		pendingIncomingCount: input.pendingIncomingCount,
	};
}

/** 推进某 user 的 Host schedule clock 一次；首次调用只建立墙钟锚点 */
export async function pumpDebuggerScheduleClock(
	userId: string,
	host?: EngineHost,
	options: DebuggerScheduleClockPumpOptions = {},
): Promise<DebuggerScheduleClockPumpResult> {
	const wallMs = nowMs(options);
	const state = getOrCreateState(userId, wallMs);
	if (state.inFlight) {
		return idleResult({
			userId,
			fromWallMs: state.lastWallMs,
			toWallMs: wallMs,
			pendingIncomingCount: host?.listIncomingCallEvents(userId).length ?? 0,
		});
	}
	state.inFlight = true;
	try {
		const activeHost = host ?? await getStudioV2EngineHost();
		await activeHost.ensureProfile(userId);
		const fromWallMs = state.lastWallMs;
		const elapsedMs = Math.max(0, wallMs - fromWallMs);
		const deltaMs = Math.min(elapsedMs, maxDeltaMs(options));
		if (deltaMs <= 0) {
			return idleResult({
				userId,
				fromWallMs,
				toWallMs: wallMs,
				pendingIncomingCount: activeHost.listIncomingCallEvents(userId).length,
			});
		}
		const fired = activeHost.advanceClock(userId, deltaMs);
		if (isEngineError(fired)) throw fired;
		state.lastWallMs = fromWallMs + deltaMs;
		await activeHost.saveProfile(userId, "autosave");
		const result: DebuggerScheduleClockPumpResult = {
			userId,
			fromWallMs,
			toWallMs: state.lastWallMs,
			deltaMs,
			advanced: true,
			firedCount: fired.length,
			pendingIncomingCount: activeHost.listIncomingCallEvents(userId).length,
		};
		await recordPumpResult(result, options);
		return result;
	} catch (err) {
		writeStudioLog("schedule", "error", {
			event: "schedule.clock_pump.failed",
			userId,
			message: "debugger wall clock pump failed",
			error: err,
		}, {
			dataRoot: options.dataRoot,
			sync: options.syncLogs,
		});
		throw err;
	} finally {
		state.inFlight = false;
	}
}

/** 确保某 user 的后台墙钟 pump 已启动；调试器首次轮询时调用 */
export function ensureDebuggerScheduleClockPumpStarted(userId: string): void {
	const wallMs = Date.now();
	const state = getOrCreateState(userId, wallMs);
	if (state.timer) return;
	state.timer = setInterval(function () {
		void pumpDebuggerScheduleClock(userId);
	}, DEFAULT_INTERVAL_MS);
	if (typeof state.timer.unref === "function") {
		state.timer.unref();
	}
}

/** 测试专用：停止所有 interval 并清空墙钟锚点 */
export function resetDebuggerScheduleClockPumpForTests(): void {
	for (const state of pumpStates.values()) {
		if (state.timer) clearInterval(state.timer);
	}
	pumpStates.clear();
}
