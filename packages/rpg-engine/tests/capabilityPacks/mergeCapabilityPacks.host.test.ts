/**
 * L1-B：Host 装配 merge 事件与关包 Free 通话（T3）。
 */
import { describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isEngineError, mergeCapabilityPacks } from "../../src/index.js";
import { copyDataTree, createTestHost } from "../helpers/inMemoryMemoryPort.js";
import { samplePack } from "./samplePackFixture.js";

const repoRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../../../..",
);
const dataSrc = path.join(repoRoot, "data");

describe("mergeCapabilityPacks L1-B host", function () {
	it("Host bootstraps capabilityPack.merge into log ring", async function () {
		const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-l1b-log-"));
		try {
			const dataRoot = path.join(tmpRoot, "data");
			await copyDataTree(dataSrc, dataRoot);
			const merged = mergeCapabilityPacks({
				packs: [samplePack("keep", "pack.keep")],
			});
			const host = createTestHost({
				persist: false,
				dataRoot,
				promptProviderRegistry: merged.promptProviderRegistry,
				capabilityPackEvents: merged.events,
			});
			const logs = host.getRecentLogs({ limit: 20 });
			expect(
				logs.some(function (row) {
					return row.type === "capabilityPack.merge";
				}),
			).toBe(true);
		} finally {
			await rm(tmpRoot, { recursive: true, force: true });
		}
	});

	it("T3 Free call still works with non-core pack disabled", async function () {
		const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-l1b-"));
		try {
			const dataRoot = path.join(tmpRoot, "data");
			await copyDataTree(dataSrc, dataRoot);
			const merged = mergeCapabilityPacks({
				packs: [samplePack("sample-toggle", "pack.sample-toggle")],
				enabledPackIds: [],
			});
			const host = createTestHost({
				persist: false,
				dataRoot,
				promptProviderRegistry: merged.promptProviderRegistry,
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
			expect(session.renderedPrompt.debug?.providerIds ?? []).not.toContain(
				"pack.sample-toggle",
			);
			const ended = await host.endCall(session.sessionId, {
				flags: { answered_completed: true },
			});
			if (isEngineError(ended)) throw ended;
		} finally {
			await rm(tmpRoot, { recursive: true, force: true });
		}
	});
});
