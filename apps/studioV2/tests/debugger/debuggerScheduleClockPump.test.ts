/**
	* 调试器真实墙钟 pump 回归：墙钟 elapsed → Host.advanceClock → Profile autosave + 可观测日志。
	*/
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { EngineHost, FiredScheduleItem } from "@airpc/rpg-engine";
import {
	pumpDebuggerScheduleClock,
	resetDebuggerScheduleClockPumpForTests,
} from "../../src/utils/server/debugger/schedule/debuggerScheduleClockPump.server";
import { resetStudioLoggersForTests } from "../../src/utils/server/observability/logger/pinoLogger.server";

type FakeHostState = {
	/** Host.advanceClock 收到的 deltaMs 列表 */
	advancedDeltas: number[];
	/** Host.saveProfile 收到的 reason 列表 */
	saveReasons: string[];
	/** 当前 pending incoming 数；模拟 dispatch 后壳队列已有事件 */
	pendingIncomingCount: number;
};

async function tempDataRoot(): Promise<string> {
	return mkdtemp(path.join(os.tmpdir(), "airpc-schedule-pump-"));
}

function firedItemFixture(): FiredScheduleItem {
	return {
		intentId: "once_1",
		agentId: "lanxing",
		chapterId: "golden_handoff",
		cardId: "doubao_intro_outbound",
		instanceId: "pending_1",
	};
}

function fakeHost(state: FakeHostState): EngineHost {
	return {
		async ensureProfile() {
			return {} as Awaited<ReturnType<EngineHost["ensureProfile"]>>;
		},
		advanceClock(_userId: string, deltaMs: number) {
			state.advancedDeltas.push(deltaMs);
			state.pendingIncomingCount = 1;
			return [firedItemFixture()];
		},
		async saveProfile(_userId: string, reason: string) {
			state.saveReasons.push(reason);
		},
		listIncomingCallEvents() {
			return Array.from({ length: state.pendingIncomingCount }, function (_, index) {
				return {
					schemaVersion: 1,
					eventId: `incoming_${index}`,
					type: "call.incoming_requested",
					userId: "demo-user",
					chapterId: "golden_handoff",
					cardId: "doubao_intro_outbound",
					agentId: "lanxing",
					instanceId: "pending_1",
					scheduleIntentId: "once_1",
					source: "schedule",
					status: "pending",
					createdAt: "2026-08-11T00:00:00.000Z",
				};
			}) as ReturnType<EngineHost["listIncomingCallEvents"]>;
		},
	} as unknown as EngineHost;
}

async function readJson(file: string): Promise<Record<string, unknown>> {
	return JSON.parse(await readFile(file, "utf8")) as Record<string, unknown>;
}

async function readJsonl(file: string): Promise<Record<string, unknown>[]> {
	const text = await readFile(file, "utf8");
	return text.trim().split("\n").map(function (line) {
		return JSON.parse(line) as Record<string, unknown>;
	});
}

describe("debuggerScheduleClockPump.server", () => {
	afterEach(function () {
		resetDebuggerScheduleClockPumpForTests();
		resetStudioLoggersForTests();
	});

	it("primes wall clock on first call and advances Host by elapsed delta afterwards", async () => {
		const dataRoot = await tempDataRoot();
		const state: FakeHostState = {
			advancedDeltas: [],
			saveReasons: [],
			pendingIncomingCount: 0,
		};
		const host = fakeHost(state);

		const first = await pumpDebuggerScheduleClock("demo-user", host, {
			nowMs: () => 1_000,
			dataRoot,
			syncLogs: true,
		});
		const second = await pumpDebuggerScheduleClock("demo-user", host, {
			nowMs: () => 4_500,
			dataRoot,
			syncLogs: true,
		});

		expect(first).toMatchObject({
			advanced: false,
			deltaMs: 0,
		});
		expect(second).toMatchObject({
			advanced: true,
			deltaMs: 3_500,
			firedCount: 1,
			pendingIncomingCount: 1,
		});
		expect(state.advancedDeltas).toEqual([3_500]);
		expect(state.saveReasons).toEqual(["autosave"]);

		const dto = await readJson(
			path.join(
				dataRoot,
				"debug-dto",
				"schedule-intents",
				"schedule-pump-demo-user.json",
			),
		);
		const rows = await readJsonl(
			path.join(dataRoot, "logs", "schedule", "schedule-19700101.jsonl"),
		);

		expect(dto).toMatchObject({
			bucket: "schedule-intents",
			event: "schedule.clock_pump.advanced",
			userId: "demo-user",
		});
		expect(rows[0]).toMatchObject({
			module: "schedule",
			event: "schedule.clock_pump.advanced",
			userId: "demo-user",
		});
	});

	it("caps a long wall-clock gap and catches up gradually", async () => {
		const state: FakeHostState = {
			advancedDeltas: [],
			saveReasons: [],
			pendingIncomingCount: 0,
		};
		const host = fakeHost(state);

		await pumpDebuggerScheduleClock("demo-user", host, { nowMs: () => 0 });
		const result = await pumpDebuggerScheduleClock("demo-user", host, {
			nowMs: () => 60_000,
			maxDeltaMs: 10_000,
		});

		expect(result).toMatchObject({
			fromWallMs: 0,
			toWallMs: 10_000,
			deltaMs: 10_000,
		});
		expect(state.advancedDeltas).toEqual([10_000]);
	});
});
