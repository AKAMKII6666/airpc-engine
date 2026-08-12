/**
	* Studio V2 pino 分模块日志回归：落盘路径、基础字段与脱敏。
	*/
import { chmod, mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
	getStudioLogFallbackFilePathForTests,
	resetStudioLoggersForTests,
	writeStudioLog,
} from "@studio-v2/src/utils/server/observability/logger/pinoLogger.server";

async function tempDataRoot(): Promise<string> {
	return mkdtemp(path.join(os.tmpdir(), "airpc-pino-"));
}

async function readJsonl(file: string): Promise<Record<string, unknown>[]> {
	const text = await readFile(file, "utf8");
	return text.trim().split("\n").map(function (line) {
		return JSON.parse(line) as Record<string, unknown>;
	});
}

describe("pinoLogger.server", () => {
	afterEach(function () {
		resetStudioLoggersForTests();
	});

	it("writes module-separated jsonl records with common trace fields", async () => {
		const dataRoot = await tempDataRoot();
		const now = new Date("2026-08-10T12:00:00.000Z");

		writeStudioLog("llm", "info", {
			event: "llm.request",
			traceId: "trace_1",
			userId: "demo-user",
			sessionId: "session_1",
			message: "request",
			payload: { model: "qwen-plus" },
		}, { dataRoot, now, sync: true });
		writeStudioLog("tools", "warn", {
			event: "engine.invoke_tool.engine_error",
			traceId: "trace_1",
			sessionId: "session_1",
			payload: { toolId: "record_user_name" },
		}, { dataRoot, now, sync: true });

		const llmRows = await readJsonl(
			path.join(dataRoot, "logs", "llm", "llm-20260810.jsonl"),
		);
		const toolRows = await readJsonl(
			path.join(dataRoot, "logs", "tools", "tools-20260810.jsonl"),
		);

		expect(llmRows).toHaveLength(1);
		expect(toolRows).toHaveLength(1);
		expect(llmRows[0]).toMatchObject({
			module: "llm",
			event: "llm.request",
			traceId: "trace_1",
			userId: "demo-user",
			sessionId: "session_1",
			message: "request",
		});
		expect(toolRows[0]).toMatchObject({
			module: "tools",
			event: "engine.invoke_tool.engine_error",
			traceId: "trace_1",
		});
	});

	it("redacts sensitive keys and token-like strings before disk write", async () => {
		const dataRoot = await tempDataRoot();
		writeStudioLog("api", "error", {
			event: "api.failed",
			payload: {
				apiKey: "sk-1234567890abcdef",
				Authorization: "Bearer abcdefghijklmnop",
				nested: { token: "plain-token", text: "key sk-abcdefghi" },
			},
		}, {
			dataRoot,
			now: new Date("2026-08-10T00:00:00.000Z"),
			sync: true,
		});

		const rows = await readJsonl(
			path.join(dataRoot, "logs", "api", "api-20260810.jsonl"),
		);

		expect(JSON.stringify(rows[0])).not.toContain("1234567890abcdef");
		expect(JSON.stringify(rows[0])).not.toContain("abcdefghijklmnop");
		expect(rows[0]?.payload).toMatchObject({
			apiKey: "[REDACTED]",
			Authorization: "[REDACTED]",
			nested: {
				token: "[REDACTED]",
				text: "key sk-a...fghi",
			},
		});
	});

	it("falls back when today's module log file is not writable", async () => {
		const dataRoot = await tempDataRoot();
		const now = new Date("2026-08-10T00:00:00.000Z");
		const primary = path.join(
			dataRoot,
			"logs",
			"tools",
			"tools-20260810.jsonl",
		);
		await writeStudioLog("tools", "info", {
			event: "tools.seed",
			traceId: "trace_seed",
		}, { dataRoot, now, sync: true });
		await chmod(primary, 0o444);
		resetStudioLoggersForTests();

		try {
			writeStudioLog("tools", "info", {
				event: "tools.after_permission_denied",
				traceId: "trace_fallback",
			}, { dataRoot, now, sync: true });

			const fallbackRows = await readJsonl(
				getStudioLogFallbackFilePathForTests({
					dataRoot,
					module: "tools",
					now,
				}),
			);
			expect(fallbackRows).toHaveLength(1);
			expect(fallbackRows[0]).toMatchObject({
				module: "tools",
				event: "tools.after_permission_denied",
				traceId: "trace_fallback",
			});
		} finally {
			await chmod(primary, 0o644);
		}
	});
});
