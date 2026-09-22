/**
 * 模块名称：Manual Story 闭环集成测（读 data/，不写回）
 */
import { rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, it } from "vitest";
import {
	runManualStoryLoop,
	runRejectSecondBeginCall,
} from "./manual-story-loop.helpers.js";

const repoRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../../../..",
);
const dataSrc = path.join(repoRoot, "data");

describe("manual story loop", () => {
	let tmpRoot: string | undefined;

	afterEach(async () => {
		if (tmpRoot) {
			await rm(tmpRoot, { recursive: true, force: true });
			tmpRoot = undefined;
		}
	});

	it("simulate_start → Manual Outcome → unlock/attach/redial → saveProfile", async () => {
		tmpRoot = await runManualStoryLoop(dataSrc);
	});

	it("rejects second beginCall while active", async () => {
		tmpRoot = await runRejectSecondBeginCall(dataSrc);
	});
});
