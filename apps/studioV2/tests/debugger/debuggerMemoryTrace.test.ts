/**
	* Memory Trace DTO 读取投影。
	*/
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readDebuggerMemoryTrace } from "@studio-v2/src/utils/server/debugger/session/debuggerMemoryTrace.server";

describe("readDebuggerMemoryTrace", () => {
	let tmp: string | undefined;

	afterEach(async () => {
		if (tmp) {
			await rm(tmp, { recursive: true, force: true });
			tmp = undefined;
		}
	});

	it("projects MemoryCommit DTO into readable debug view", async () => {
		tmp = await mkdtemp(path.join(os.tmpdir(), "airpc-memory-trace-"));
		const dir = path.join(tmp, "debug-dto", "memory-commits");
		await mkdir(dir, { recursive: true });
		await writeFile(path.join(dir, "session_1.json"), JSON.stringify({
			schemaVersion: 1,
			bucket: "memory-commits",
			id: "session_1",
			at: "2026-08-12T01:06:00.000Z",
			event: "memory_commit.trace",
			traceId: "memory_commit:session_1",
			sessionId: "session_1",
			userId: "demo-user",
			summary: {
				agentId: "lanxing",
				ok: true,
				writtenLayers: ["episodic", "semantic"],
				writtenEntryCount: 2,
				filteredCounts: { userFacts: 1 },
				exclusionSeedCount: 3,
			},
			payload: {
				originalInput: {
					sessionId: "session_1",
					userId: "demo-user",
					agentId: "lanxing",
				},
				enrichedInput: {
					summaryText: "用户聊到生日蛋糕。",
					items: [
						{ kind: "user_fact", text: "用户喜欢妈妈做的生日蛋糕" },
						{ kind: "shared_event", text: "一起聊了生日蛋糕" },
						{ kind: "promise", text: "下次继续问生日" },
						{ kind: "emotion", text: "开心" },
					],
				},
				extraction: {
					summaryText: "用户聊到生日蛋糕。",
					debug: {
						rawCounts: { userFacts: 2 },
						sanitizedCounts: { userFacts: 1 },
						filteredCounts: { userFacts: 1 },
						llmInput: { messages: [{ role: "user", content: "transcript..." }] },
						rawLlmText: "{\"summary\":\"用户聊到生日蛋糕。\"}",
					},
				},
				storageResult: {
					ok: true,
					writtenLayers: ["episodic", "semantic"],
					writtenEntryIds: ["mem_1", "mem_2"],
				},
			},
		}), "utf8");

		const trace = await readDebuggerMemoryTrace("session_1", { dataRoot: tmp });

		expect(trace).toMatchObject({
			dtoId: "session_1",
			traceId: "memory_commit:session_1",
			sessionId: "session_1",
			userId: "demo-user",
			agentId: "lanxing",
			ok: true,
			writtenLayers: ["episodic", "semantic"],
			writtenEntryCount: 2,
			rawCounts: { userFacts: 2 },
			sanitizedCounts: { userFacts: 1 },
			filteredCounts: { userFacts: 1 },
			exclusionSeedCount: 3,
			summaryText: "用户聊到生日蛋糕。",
			structured: {
				userFacts: ["用户喜欢妈妈做的生日蛋糕"],
				sharedEvents: ["一起聊了生日蛋糕"],
				promises: ["下次继续问生日"],
				emotion: "开心",
			},
		});
		expect(trace.blocks.map((block) => block.title)).toEqual([
			"LLM 输入",
			"LLM 原始输出",
			"清洗后抽取",
			"写入输入",
			"存储结果",
		]);
		expect(trace.blocks[0]?.text).toContain("transcript");
		expect(trace.blocks[1]?.text).toContain("生日蛋糕");
	});
});
