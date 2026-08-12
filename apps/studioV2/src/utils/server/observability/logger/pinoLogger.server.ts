/**
	* Studio V2 pino 分模块落盘 logger。
	* 路径：data/logs/<module>/<module>-YYYYMMDD.jsonl；不替代引擎 EngineLogPort。
	*/
import { randomUUID } from "node:crypto";
import { accessSync, constants, mkdirSync, openSync, closeSync } from "node:fs";
import path from "node:path";
import pino, { type Logger } from "pino";
import { getStudioV2DataRoot } from "@studio-v2/src/utils/server/data/dataRoot.server";
import { redactForLog } from "@studio-v2/src/utils/server/observability/logger/loggerRedact.server";
import { processOwnerScope } from "@studio-v2/src/utils/server/observability/processOwnerScope.server";
import type {
	StudioLogEvent,
	StudioLogLevel,
	StudioLogModule,
} from "@studio-v2/src/utils/server/observability/logger/loggerTypes.server";

type LoggerCacheEntry = {
	/** UTC 日期键；变更时切到新文件 */
	dayKey: string;
	/** pino logger 实例；按 module/day 缓存 */
	logger: Logger;
};

type LoggerOptions = {
	/** 测试可注入 dataRoot；正式路径自动解析 workspace data */
	dataRoot?: string;
	/** 测试可注入日期；正式路径使用当前 UTC 日期 */
	now?: Date;
	/** 测试可开启同步写入；正式路径默认异步 */
	sync?: boolean;
};

const loggerCache = new Map<string, LoggerCacheEntry>();

function utcDayKey(date: Date): string {
	const y = date.getUTCFullYear();
	const m = String(date.getUTCMonth() + 1).padStart(2, "0");
	const d = String(date.getUTCDate()).padStart(2, "0");
	return `${y}${m}${d}`;
}

function logFilePath(input: {
	/** data/ 根目录 */
	dataRoot: string;
	/** 日志模块 */
	module: StudioLogModule;
	/** UTC 日期键 */
	dayKey: string;
}): string {
	return path.join(
		input.dataRoot,
		"logs",
		input.module,
		`${input.module}-${input.dayKey}.jsonl`,
	);
}

function fallbackLogFilePath(input: {
	/** data/ 根目录 */
	dataRoot: string;
	/** 日志模块 */
	module: StudioLogModule;
	/** UTC 日期键 */
	dayKey: string;
}): string {
	return path.join(
		input.dataRoot,
		"logs",
		".fallback",
		processOwnerScope(),
		input.module,
		`${input.module}-${input.dayKey}.jsonl`,
	);
}

function canAppendLogFile(file: string): boolean {
	try {
		mkdirSync(path.dirname(file), { recursive: true });
		try {
			accessSync(file, constants.F_OK);
			accessSync(file, constants.W_OK);
			return true;
		} catch (error) {
			const code = (error as { code?: unknown }).code;
			if (code !== "ENOENT") return false;
		}
		const fd = openSync(file, "a");
		closeSync(fd);
		return true;
	} catch {
		return false;
	}
}

function resolveWritableLogFile(input: {
	/** data/ 根目录 */
	dataRoot: string;
	/** 日志模块 */
	module: StudioLogModule;
	/** UTC 日期键 */
	dayKey: string;
}): string {
	const primary = logFilePath(input);
	if (canAppendLogFile(primary)) {
		return primary;
	}
	const fallback = fallbackLogFilePath(input);
	if (canAppendLogFile(fallback)) {
		return fallback;
	}
	return primary;
}

function createLogger(input: {
	/** data/ 根目录 */
	dataRoot: string;
	/** 日志模块 */
	module: StudioLogModule;
	/** UTC 日期键 */
	dayKey: string;
	/** 是否同步写入；测试用 */
	sync?: boolean;
}): Logger {
	const destination = pino.destination({
		dest: resolveWritableLogFile(input),
		mkdir: true,
		sync: input.sync === true,
	});
	destination.on("error", function () {
		// 日志落盘失败不可冒泡成业务/测试未捕获异常。
	});
	return pino({
		base: { module: input.module },
		timestamp: function () {
			return `,"at":"${new Date().toISOString()}"`;
		},
	}, destination);
}

function getModuleLogger(
	module: StudioLogModule,
	options: LoggerOptions,
): Logger {
	const dataRoot = options.dataRoot ?? getStudioV2DataRoot();
	const dayKey = utcDayKey(options.now ?? new Date());
	const cacheKey = `${dataRoot}:${module}:${options.sync === true ? "sync" : "async"}`;
	const cached = loggerCache.get(cacheKey);
	if (cached?.dayKey === dayKey) return cached.logger;
	const logger = createLogger({
		dataRoot,
		module,
		dayKey,
		sync: options.sync,
	});
	loggerCache.set(cacheKey, { dayKey, logger });
	return logger;
}

function buildRecord(event: StudioLogEvent): Record<string, unknown> {
	return {
		event: event.event,
		traceId: event.traceId ?? randomUUID(),
		userId: event.userId,
		sessionId: event.sessionId,
		packageId: event.packageId,
		chapterId: event.chapterId,
		cardId: event.cardId,
		agentId: event.agentId,
		message: event.message,
		payload: redactForLog(event.payload),
		error: redactForLog(event.error),
	};
}

/** 写入一条 Studio server pino 日志；失败不会阻断业务主流程 */
export function writeStudioLog(
	module: StudioLogModule,
	level: StudioLogLevel,
	event: StudioLogEvent,
	options: LoggerOptions = {},
): void {
	try {
		const logger = getModuleLogger(module, options);
		logger[level](buildRecord(event));
	} catch {
		// 日志不可影响调试器和引擎主流程；必要时由调用方业务错误另行暴露
	}
}

/** 测试专用：清空 logger cache，避免临时目录互相污染 */
export function resetStudioLoggersForTests(): void {
	loggerCache.clear();
}

/** 测试专用：暴露 fallback 路径，生产调用不要依赖。 */
export function getStudioLogFallbackFilePathForTests(input: {
	dataRoot: string;
	module: StudioLogModule;
	now: Date;
}): string {
	return fallbackLogFilePath({
		dataRoot: input.dataRoot,
		module: input.module,
		dayKey: utcDayKey(input.now),
	});
}
