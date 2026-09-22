/**
 * Story 通话挂机记忆策略：有真实 transcript 才写长期记忆。
 */
import { rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, it } from "vitest";
import {
	runFreeHangupWhenMemoryThrows,
	runNoExitStoryStillCommits,
	runStoryCommitWithTranscript,
	runStorySkipEmptyTranscript,
} from "./story-call-memory-commit.helpers.js";

const repoRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../../../..",
);
const dataSrc = path.join(repoRoot, "data");

let tmpRoot: string | undefined;

afterEach(async function () {
	if (tmpRoot) {
		await rm(tmpRoot, { recursive: true, force: true });
		tmpRoot = undefined;
	}
});

describe("Story call MemoryCommit policy with transcript", function () {
	it("提交长期记忆，但不替代剧情 Effect", async function () {
		tmpRoot = await runStoryCommitWithTranscript(dataSrc);
	});

	it("no-exit story hangup still ends the call and commits transcript memory", async function () {
		tmpRoot = await runNoExitStoryStillCommits(dataSrc);
	});
});

describe("Call hangup resilience", function () {
	it("free hangup still completes when MemoryPort commit throws", async function () {
		tmpRoot = await runFreeHangupWhenMemoryThrows(dataSrc);
	});
});

describe("Story call MemoryCommit policy without transcript", function () {
	it("不写占位 call_summary", async function () {
		tmpRoot = await runStorySkipEmptyTranscript(dataSrc);
	});
});
