/**
	* Studio V2 DTO 快照日志回归：按 id 落盘，并维护 trace/session/user 索引。
	*/
import { chmod, mkdir, mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
	getDtoLogFallbackFilePathForTests,
	writeDtoLog,
} from "@studio-v2/src/utils/server/observability/dto/dtoLogStore.server";
import type { DtoLogIndexDocument } from "@studio-v2/src/utils/server/observability/dto/dtoLogTypes.server";

async function tempDataRoot(): Promise<string> {
	return mkdtemp(path.join(os.tmpdir(), "airpc-dto-log-"));
}

async function readJson(file: string): Promise<Record<string, unknown>> {
	return JSON.parse(await readFile(file, "utf8")) as Record<string, unknown>;
}

async function readIndex(file: string): Promise<DtoLogIndexDocument> {
	return JSON.parse(await readFile(file, "utf8")) as DtoLogIndexDocument;
}

describe("dtoLogStore.server", () => {
	it("writes DTO document and updates trace/session/user indexes", async () => {
		const dataRoot = await tempDataRoot();
		await writeDtoLog({
			bucket: "tool-calls",
			id: "call_1",
			event: "engine.invoke_tool.ok",
			traceId: "trace_1",
			sessionId: "session_1",
			userId: "demo-user",
			summary: { toolId: "record_user_name" },
			payload: {
				toolCall: { id: "call_1", name: "record_user_name" },
				apiKey: "sk-1234567890abcdef",
			},
		}, {
			dataRoot,
			now: new Date("2026-08-11T01:02:03.000Z"),
		});

		const dto = await readJson(
			path.join(dataRoot, "debug-dto", "tool-calls", "call_1.json"),
		);
		const traceIndex = await readIndex(
			path.join(
				dataRoot,
				"debug-dto",
				"indexes",
				"by-trace",
				"trace_1.json",
			),
		);
		const sessionIndex = await readIndex(
			path.join(
				dataRoot,
				"debug-dto",
				"indexes",
				"by-session",
				"session_1.json",
			),
		);
		const userIndex = await readIndex(
			path.join(
				dataRoot,
				"debug-dto",
				"indexes",
				"by-user",
				"demo-user.json",
			),
		);

		expect(dto).toMatchObject({
			schemaVersion: 1,
			bucket: "tool-calls",
			id: "call_1",
			at: "2026-08-11T01:02:03.000Z",
			event: "engine.invoke_tool.ok",
			traceId: "trace_1",
			sessionId: "session_1",
			userId: "demo-user",
		});
		expect(JSON.stringify(dto)).not.toContain("1234567890abcdef");
		expect(dto.payload).toMatchObject({ apiKey: "[REDACTED]" });
		expect(traceIndex.refs).toHaveLength(1);
		expect(traceIndex.refs[0]).toMatchObject({
			bucket: "tool-calls",
			id: "call_1",
			path: "tool-calls/call_1.json",
			event: "engine.invoke_tool.ok",
		});
		expect(sessionIndex.refs).toHaveLength(1);
		expect(userIndex.refs).toHaveLength(1);
	});

	it("keeps latest ref for duplicate bucket/id in each index", async () => {
		const dataRoot = await tempDataRoot();
		for (const event of ["first", "second"]) {
			await writeDtoLog({
				bucket: "call-sessions",
				id: "session_1",
				event,
				sessionId: "session_1",
				userId: "demo-user",
				payload: { event },
			}, { dataRoot });
		}

		const sessionIndex = await readIndex(
			path.join(
				dataRoot,
				"debug-dto",
				"indexes",
				"by-session",
				"session_1.json",
			),
		);

		expect(sessionIndex.refs).toHaveLength(1);
		expect(sessionIndex.refs[0]).toMatchObject({
			bucket: "call-sessions",
			id: "session_1",
			event: "second",
		});
	});

	it("serializes concurrent writes to the same DTO and indexes", async () => {
		const dataRoot = await tempDataRoot();
		await Promise.all(
			Array.from({ length: 20 }, async function (_, i) {
				await writeDtoLog({
					bucket: "schedule-intents",
					id: "schedule-pump-demo-user",
					event: `pump-${i}`,
					traceId: "trace_1",
					sessionId: "session_1",
					userId: "demo-user",
					payload: { i },
				}, { dataRoot });
			}),
		);

		const dto = await readJson(
			path.join(
				dataRoot,
				"debug-dto",
				"schedule-intents",
				"schedule-pump-demo-user.json",
			),
		);
		const userIndex = await readIndex(
			path.join(
				dataRoot,
				"debug-dto",
				"indexes",
				"by-user",
				"demo-user.json",
			),
		);

		expect(dto.id).toBe("schedule-pump-demo-user");
		expect(userIndex.refs).toHaveLength(1);
		expect(userIndex.refs[0]?.id).toBe("schedule-pump-demo-user");
	});

	it("falls back when the primary DTO file is not writable", async () => {
		const dataRoot = await tempDataRoot();
		const input = {
			bucket: "tool-calls" as const,
			id: "call_permission",
			event: "engine.invoke_tool.ok",
			traceId: "trace_permission",
			sessionId: "session_permission",
			userId: "demo-user",
			payload: { ok: true },
		};
		const primary = path.join(
			dataRoot,
			"debug-dto",
			"tool-calls",
			"call_permission.json",
		);
		const primaryDir = path.dirname(primary);
		await mkdir(primaryDir, { recursive: true });
		await chmod(primaryDir, 0o555);

		try {
			await writeDtoLog(input, {
				dataRoot,
				now: new Date("2026-08-12T01:02:03.000Z"),
			});

			const fallbackDto = await readJson(
				getDtoLogFallbackFilePathForTests(dataRoot, input),
			);
			const fallbackTraceIndex = await readIndex(
				path.join(
					dataRoot,
					"debug-dto",
					".fallback",
					typeof process.getuid === "function"
						? String(process.getuid())
						: os.userInfo().username,
					"indexes",
					"by-trace",
					"trace_permission.json",
				),
			);

			expect(fallbackDto).toMatchObject({
				bucket: "tool-calls",
				id: "call_permission",
				at: "2026-08-12T01:02:03.000Z",
				event: "engine.invoke_tool.ok",
				traceId: "trace_permission",
			});
			expect(fallbackTraceIndex.refs).toHaveLength(1);
			expect(fallbackTraceIndex.refs[0]).toMatchObject({
				bucket: "tool-calls",
				id: "call_permission",
				path: "tool-calls/call_permission.json",
			});
		} finally {
			await chmod(primaryDir, 0o755);
		}
	});
});
