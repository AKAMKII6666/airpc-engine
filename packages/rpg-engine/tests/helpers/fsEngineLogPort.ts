/**
 * 模块名称：测试用 Fs EngineLogPort
 * 模块说明：与 engineIOModule/log/fsEngineLogPort 行为对齐的测试镜像；
 * 引擎测不得 import apps/studioV2（独立性优先于 DRY）。
 */
import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { redactLogRecord } from "../../src/host/engineLogViaPort.js";
import type { LogRecord } from "../../src/host/types.js";
import type { EngineLogPort } from "../../src/ports/engineLogPort.js";

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

/** 创建指向 dataRoot 的测试用 EngineLogPort。 */
export function createFsEngineLogPort(dataRoot: string): EngineLogPort {
	return {
		async append(input: { record: LogRecord }): Promise<void> {
			const dir = path.join(dataRoot, "logs");
			await mkdir(dir, { recursive: true });
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
