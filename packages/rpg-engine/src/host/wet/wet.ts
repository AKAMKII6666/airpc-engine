/**
 * 模块名称：WET（逻辑事件）查询／受控追加／重放摘要
 * 存储：ring + data/logs/engine-*.jsonl 旁路；不进 SaveGame／Profile。
 */
import type { CallSession, LogRecord } from "../types.js";
import type { EngineError } from "../errors.js";
import { validateWetAppendInput } from "./wetValidateAppend.js";
import {
	assembleWetReplayView,
	WET_STORAGE_NOTE,
	type WetReplayView,
} from "./wetReplayView.js";

/** 允许 Studio／调试受控追加的类型（补偿／标注；禁止伪造成 effect 历史） */
export const WET_APPENDABLE_TYPES = [
	"wet.annotation",
	"wet.compensation",
] as const;

export type WetAppendableType = (typeof WET_APPENDABLE_TYPES)[number];

export { WET_STORAGE_NOTE };
export type { WetReplayView };

export interface WetQueryOpts {
	userId?: string;
	/** 精确匹配 type，或以 * 后缀做前缀匹配（如 story.*） */
	type?: string;
	sessionId?: string;
	/** ISO 下界（含） */
	since?: string;
	/** ISO 上界（含） */
	until?: string;
	limit?: number;
}

export interface WetAppendInput {
	type: string;
	userId: string;
	sessionId?: string;
	/** 必填：补偿／标注说明 */
	note: string;
	/** 可选结构化补充；不得冒充 effect 执行结果篡改账本 */
	payload?: Record<string, unknown>;
}

export function isWetAppendableType(type: string): type is WetAppendableType {
	return (WET_APPENDABLE_TYPES as readonly string[]).includes(type);
}

export function matchWetType(recordType: string, filter?: string): boolean {
	if (!filter) return true;
	if (filter.endsWith(".*")) {
		const prefix = filter.slice(0, -1);
		return recordType.startsWith(prefix);
	}
	return recordType === filter;
}

export function filterWetRecords(
	records: LogRecord[],
	opts: WetQueryOpts = {},
): LogRecord[] {
	const limit = Math.min(Math.max(opts.limit ?? 80, 1), 500);
	let items = records;
	if (opts.userId) {
		items = items.filter(function (r) {
			return r.userId === opts.userId;
		});
	}
	if (opts.sessionId) {
		items = items.filter(function (r) {
			return r.sessionId === opts.sessionId;
		});
	}
	if (opts.type) {
		const typeFilter = opts.type;
		items = items.filter(function (r) {
			return matchWetType(r.type, typeFilter);
		});
	}
	if (opts.since) {
		const since = opts.since;
		items = items.filter(function (r) {
			return r.at >= since;
		});
	}
	if (opts.until) {
		const until = opts.until;
		items = items.filter(function (r) {
			return r.at <= until;
		});
	}
	return items.slice(-limit);
}

/** 合并 ring 与文件切片；同 at+type+sessionId 去重，按 at 升序 */
export function mergeWetSources(
	ring: LogRecord[],
	fileLines: LogRecord[],
): LogRecord[] {
	const map = new Map<string, LogRecord>();
	function keyOf(r: LogRecord): string {
		return `${r.at}|${r.type}|${r.sessionId ?? ""}|${JSON.stringify(r.payload ?? null)}`;
	}
	for (const r of fileLines) {
		map.set(keyOf(r), r);
	}
	for (const r of ring) {
		map.set(keyOf(r), r);
	}
	return Array.from(map.values()).sort(function (a, b) {
		return a.at.localeCompare(b.at);
	});
}

export function validateWetAppend(input: WetAppendInput): EngineError | null {
	return validateWetAppendInput(input);
}

export function buildWetAppendRecord(input: WetAppendInput): LogRecord {
	if (!isWetAppendableType(input.type)) {
		throw new Error(`invalid wet append type: ${input.type}`);
	}
	return {
		at: new Date().toISOString(),
		type: input.type,
		userId: input.userId,
		sessionId: input.sessionId,
		payload: {
			note: input.note.trim(),
			controlled: true,
			...(input.payload ?? {}),
		},
	};
}

export function buildWetReplayView(opts: {
	sessionId: string;
	events: LogRecord[];
	session: CallSession | null;
}): WetReplayView {
	return assembleWetReplayView(opts);
}
