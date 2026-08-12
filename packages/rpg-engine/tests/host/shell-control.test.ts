/**
 * Host shell-control FC：LLM 请求电话壳动作，Host 登记事件但不跑剧情出口。
 */
import { cp, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { isEngineError } from "../../src/index.js";
import { createTestHost } from "../helpers/inMemoryMemoryPort.js";

const repoRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../../../..",
);
const dataSrc = path.join(repoRoot, "data");

describe("Host shell-control tools", () => {
	let tmpRoot: string | undefined;

	afterEach(async () => {
		if (tmpRoot) {
			await rm(tmpRoot, { recursive: true, force: true });
			tmpRoot = undefined;
		}
	});

	it("request_hangup records a shell event without ending the call", async () => {
		tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-shell-control-"));
		const dataRoot = path.join(tmpRoot, "data");
		await cp(dataSrc, dataRoot, { recursive: true });

		const host = createTestHost({ persist: true, dataRoot });
		await host.loadWorkspace(dataRoot);
		await host.ensureProfile("demo-user");

		const resolved = await host.resolveAsync("demo-user", {
			kind: "free_call",
			agentId: "lanxing",
		});
		if (isEngineError(resolved)) throw resolved;
		const session = await host.beginCall("demo-user", resolved, {
			channel: "text_turn",
		});
		if (isEngineError(session)) throw session;

		const invoked = host.invokeShellControlTool(
			session.sessionId,
			"request_hangup",
			{ reason: "角色说完道别后主动挂断" },
		);

		expect(isEngineError(invoked)).toBe(false);
		if (isEngineError(invoked)) return;
		expect(invoked.event).toMatchObject({
			type: "call.hangup_requested",
			sessionId: session.sessionId,
			userId: "demo-user",
			agentId: "lanxing",
			reason: "角色说完道别后主动挂断",
		});
		expect(session.status).toBe("in_call");
		expect(session.phoneFlags.remote_hangup_requested).toBe(true);
		expect(session.shellEvents).toEqual([invoked.event]);
		expect(host.getRecentLogs({ userId: "demo-user", limit: 5 }).some(
			function (log) {
				return log.type === "shell.control_event";
			},
		)).toBe(true);
	});
});
