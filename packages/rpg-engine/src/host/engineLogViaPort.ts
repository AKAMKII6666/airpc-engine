/**
 * 模块名称：Host 经 EngineLogPort 读写旁路日志 + 隐私脱敏
 * 模块说明：从 createEngineHost 拆出，避免 Host 组合函数净增；
 * jsonl 落盘在 engineIOModule；本文件仅 Port 编排与纯脱敏（技术设计 23 §4.4）。
 */
import { engineError, isEngineError, type EngineError } from "./errors.js";
import type { LogRecord } from "./types.js";
import type { EngineLogPort } from "../ports/engineLogPort.js";
import {
	WET_STORAGE_NOTE,
	filterWetRecords,
	mergeWetSources,
	type WetQueryOpts,
} from "./wet.js";

const PRIVATE_KEY_RE =
	/^(private|openingPrivate|privateBrief|systemHard)$/i;

function isPlainObject(v: unknown): v is Record<string, unknown> {
	return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}

/** 递归剥除 private*／openingPrivate／privateBrief 等原文键 */
export function redactSensitive(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map(redactSensitive);
	}
	if (!isPlainObject(value)) {
		return value;
	}
	const out: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(value)) {
		if (PRIVATE_KEY_RE.test(k)) {
			out[k] = "[redacted]";
			continue;
		}
		out[k] = redactSensitive(v);
	}
	return out;
}

export function redactLogRecord(record: LogRecord): LogRecord {
	return {
		...record,
		payload: record.payload
			? (redactSensitive(record.payload) as LogRecord["payload"])
			: record.payload,
	};
}

/** 读磁盘（或等价介质）日志切片；无 Port → 空切片。 */
export async function readLogFileSliceViaPort(input: {
	engineLogPort: EngineLogPort | null;
	day?: string;
	limit?: number;
}): Promise<
	| { file: string; lines: LogRecord[]; truncated: boolean }
	| EngineError
> {
	try {
		if (!input.engineLogPort) {
			return { file: "", lines: [], truncated: false };
		}
		const slice = await input.engineLogPort.readSlice({
			day: input.day,
			limit: input.limit,
		});
		return {
			file: slice.locator ?? "",
			lines: slice.lines,
			truncated: slice.truncated,
		};
	} catch (err) {
		if (isEngineError(err)) return err;
		return engineError(
			"ENGINE_INTERNAL",
			err instanceof Error ? err.message : String(err),
		);
	}
}

/** 合并 ring +（可选）Port 当日切片，再按 WET 过滤。 */
export async function queryWetViaPort(input: {
	ring: LogRecord[];
	engineLogPort: EngineLogPort | null;
	opts?: WetQueryOpts & { includeFile?: boolean };
}): Promise<
	| {
			events: LogRecord[];
			storageNote: string;
			file?: string;
			truncated?: boolean;
	  }
	| EngineError
> {
	try {
		const includeFile = input.opts?.includeFile !== false;
		let fileLines: LogRecord[] = [];
		let file: string | undefined;
		let truncated: boolean | undefined;
		if (includeFile && input.engineLogPort) {
			const slice = await input.engineLogPort.readSlice({
				limit: Math.min(input.opts?.limit ?? 200, 500),
			});
			fileLines = slice.lines;
			file = slice.locator;
			truncated = slice.truncated;
		}
		const merged = mergeWetSources(input.ring, fileLines);
		const events = filterWetRecords(merged, input.opts);
		return {
			events,
			storageNote: WET_STORAGE_NOTE,
			file,
			truncated,
		};
	} catch (err) {
		if (isEngineError(err)) return err;
		return engineError(
			"ENGINE_INTERNAL",
			err instanceof Error ? err.message : String(err),
		);
	}
}
