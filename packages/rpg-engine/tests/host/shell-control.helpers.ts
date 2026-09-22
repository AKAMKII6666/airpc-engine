/**
 * Host shell-control 测步骤。
 */
import { expect } from "vitest";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { isEngineError } from "../../src/index.js";
import { copyDataTree, createTestHost } from "../helpers/inMemoryMemoryPort.js";

export async function runRequestHangupShellEvent(
	dataSrc: string,
): Promise<string> {
	const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-shell-control-"));
	const dataRoot = path.join(tmpRoot, "data");
	await copyDataTree(dataSrc, dataRoot);

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

	host.recordChatTurn(session.sessionId, {
		role: "user",
		text: "再见",
	});
	const invoked = await host.invokeTool(
		session.sessionId,
		"request_hangup",
		{
			reasonKind: "natural",
			reason: "角色说完道别后主动挂断",
		},
	);

	expect(isEngineError(invoked)).toBe(false);
	if (isEngineError(invoked)) return tmpRoot;
	expect(invoked).toMatchObject({
		behavior: "shell_control",
		localResult: {
			accepted: true,
			eventType: "call.hangup_requested",
		},
	});
	const event = session.shellEvents?.[0];
	expect(event).toMatchObject({
		type: "call.hangup_requested",
		sessionId: session.sessionId,
		userId: "demo-user",
		agentId: "lanxing",
		reasonKind: "natural",
		reason: "角色说完道别后主动挂断",
	});
	expect(session.status).toBe("in_call");
	expect(session.phoneFlags.remote_hangup_requested).toBe(true);
	expect(session.shellEvents).toEqual([event]);
	expect(host.getRecentLogs({ userId: "demo-user", limit: 5 }).some(
		function (log) {
			return log.type === "shell.control_event";
		},
	)).toBe(true);
	return tmpRoot;
}
