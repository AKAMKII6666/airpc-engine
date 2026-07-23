/**
	* 模块名称：本机 Fs EngineLogPort
	* 模块说明：自 packages/rpg-engine engineLogFile 迁出；
	* 路径仅本模块知道：`data/logs/engine-YYYYMMDD.jsonl`（UTC 日键）。
	* Server 边界：仅 Host 装配 / API / *.server.ts 可引用；禁止 Client。
	* 协议：技术设计 23 §4.4。
	*/
import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import {
	redactLogRecord,
	type EngineLogPort,
	type LogRecord,
} from "@airpc/rpg-engine";

function logFilePath(dataRoot: string, day = new Date()): string {
	const y = day.getUTCFullYear();
	const m = String(day.getUTCMonth() + 1).padStart(2, "0");
	const d = String(day.getUTCDate()).padStart(2, "0");
	return path.join(dataRoot, "logs", `engine-${y}${m}${d}.jsonl`);
}

function resolveDayFile(dataRoot: string, day?: string): string {
	if (day) {
		return path.join(dataRoot, "logs", `engine-${day}.jsonl`);
	}
	return logFilePath(dataRoot);
}

/**
	* 创建指向 `dataRoot` 的本机 EngineLogPort（行为与迁前 Host 直写 jsonl 等价）。
	*
	* @param dataRoot 工作区根（本机即仓库 `data/` 或测试临时 data 根）
	*/
export function createFsEngineLogPort(dataRoot: string): EngineLogPort {
	return {
		async append(input: { record: LogRecord }): Promise<void> {
			const dir = path.join(dataRoot, "logs");
			await mkdir(dir, { recursive: true });
			// 防御性脱敏：引擎 ring 可能已 redact，落盘前再剥一次
			const safe = redactLogRecord(input.record);
			await appendFile(
				logFilePath(dataRoot),
				JSON.stringify(safe) + "\n",
				"utf8",
			);
		},

		async readSlice(input?: {
			day?: string;
			limit?: number;
		}): Promise<{
			locator?: string;
			lines: LogRecord[];
			truncated: boolean;
		}> {
			const file = resolveDayFile(dataRoot, input?.day);
			const limit = input?.limit ?? 80;
			let text: string;
			try {
				text = await readFile(file, "utf8");
			} catch {
				return { locator: file, lines: [], truncated: false };
			}
			const rawLines = text.split("\n").filter(Boolean);
			const slice = rawLines.slice(-limit);
			const lines: LogRecord[] = [];
			for (const line of slice) {
				try {
					lines.push(JSON.parse(line) as LogRecord);
				} catch {
					// skip broken
				}
			}
			return {
				locator: file,
				lines,
				truncated: rawLines.length > slice.length,
			};
		},
	};
}
