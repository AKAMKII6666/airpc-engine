/**
 * Host shell-control FC：LLM 请求电话壳动作，Host 登记事件但不跑剧情出口。
 */
import { rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, it } from "vitest";
import { runRequestHangupShellEvent } from "./shell-control.helpers.js";

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
		tmpRoot = await runRequestHangupShellEvent(dataSrc);
	});
});
