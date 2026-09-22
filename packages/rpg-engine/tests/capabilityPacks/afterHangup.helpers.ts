/**
 * afterHangup 集成测步骤：组装样例包并跑通 endCall 钩子。
 */
import { expect } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
	isEngineError,
	mergeCapabilityPacks,
	type AfterHangupHook,
	type FirstPartyPack,
	type MergeCapabilityPacksResult,
} from "../../src/index.js";
import { copyDataTree, createTestHost } from "../helpers/inMemoryMemoryPort.js";

export function buildAfterHangupSamplePack(
	hook: AfterHangupHook,
): FirstPartyPack {
	return {
		manifest: {
			packId: "afterhangup-sample",
			packVersion: "0.0.1",
			apiVersion: 1,
			domains: ["realtime"],
		},
		contribute: {
			realtime: {
				"call.afterHangup": [hook],
				"commit.context": [
					{
						enricherId: "test.commit.context",
						enrich() {
							return { note: "shape-only" };
						},
					},
				],
			},
			background: {
				"tasks.register": [
					{ taskId: "test.task", register() {} },
				],
				"tasks.onTick": [
					{ taskId: "test.task", onTick() {} },
				],
			},
		},
	};
}

function assertMergedAfterHangupShapes(
	merged: MergeCapabilityPacksResult,
): void {
	expect(merged.afterHangupHooks).toHaveLength(1);
	expect(merged.taskRegistrars).toHaveLength(1);
	expect(merged.taskTickHandlers).toHaveLength(1);
	expect(merged.commitContextEnrichers).toHaveLength(1);
}

async function endFreeCallAndAssertHook(
	dataRoot: string,
	merged: MergeCapabilityPacksResult,
	ran: string[],
): Promise<void> {
	const host = createTestHost({
		persist: false,
		dataRoot,
		promptProviderRegistry: merged.promptProviderRegistry,
		afterHangupHooks: merged.afterHangupHooks,
		packIdByHookId: merged.packIdByHookId,
	});
	await host.loadWorkspace(dataRoot);
	await host.ensureProfile("demo-user");
	const resolved = await host.resolveAsync("demo-user", {
		kind: "free_call",
		agentId: "lanxing",
	});
	if (isEngineError(resolved)) throw resolved;
	const session = await host.beginCall("demo-user", resolved, {
		channel: "manual",
	});
	if (isEngineError(session)) throw session;
	const ended = await host.endCall(session.sessionId, {
		flags: { answered_completed: true },
	});
	if (isEngineError(ended)) throw ended;
	expect(ran).toEqual(["ok"]);
	const logs = host.getRecentLogs({ userId: "demo-user", limit: 50 });
	expect(
		logs.some(function (row) {
			return row.type === "capabilityPack.afterHangup";
		}),
	).toBe(true);
}

export async function runAfterHangupEndCallTest(dataSrc: string): Promise<void> {
	const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-l1d-"));
	const ran: string[] = [];
	try {
		const dataRoot = path.join(tmpRoot, "data");
		await copyDataTree(dataSrc, dataRoot);
		const hook: AfterHangupHook = {
			hookId: "test.afterHangup",
			run() {
				ran.push("ok");
			},
		};
		const merged = mergeCapabilityPacks({
			packs: [buildAfterHangupSamplePack(hook)],
		});
		assertMergedAfterHangupShapes(merged);
		await endFreeCallAndAssertHook(dataRoot, merged, ran);
	} finally {
		await rm(tmpRoot, { recursive: true, force: true });
	}
}
