/**
 * E4b：角色 A（澜星）出口写 B（小雨）的 knowledge 与 memory
 */
import { rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, it } from "vitest";
import { runLanxingWritesXiaopiMemory } from "./a-to-b-memory-e2e.helpers.js";

const repoRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../../../..",
);
const dataSrc = path.join(repoRoot, "data");

describe("E4b A→B knowledge／memory", () => {
	let tmpRoot: string | undefined;

	afterEach(async () => {
		if (tmpRoot) {
			await rm(tmpRoot, { recursive: true, force: true });
			tmpRoot = undefined;
		}
	});

	it("lanxing exit writes xiaopi knowledge + semantic memory", async () => {
		tmpRoot = await runLanxingWritesXiaopiMemory(dataSrc);
	});
});
