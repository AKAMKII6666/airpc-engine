/**
 * 模块名称：afterHangup 钩子集成测
 * 模块说明：L1-D T6 — endCall 触发 afterHangup 并写日志。
 */
import { describe, it } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runAfterHangupEndCallTest } from "./afterHangup.helpers.js";

const repoRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../../../..",
);
const dataSrc = path.join(repoRoot, "data");

describe("capabilityPacks L1-D afterHangup and shapes", function () {
	it("T6 endCall runs afterHangup hooks and logs", async function () {
		await runAfterHangupEndCallTest(dataSrc);
	});
});
