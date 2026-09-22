/**
 * E4d：同卡 outbound + night／late_night 层；改 localNowIso 命中
 */
import { rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, it } from "vitest";
import {
	assertLateNightLayerHit,
	assertNightLayerHit,
} from "./night-layer-e2e.helpers.js";

const repoRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../../../..",
);
const dataSrc = path.join(repoRoot, "data");

describe("E4d night／late_night layer", () => {
	let tmpRoot: string | undefined;

	afterEach(async () => {
		if (tmpRoot) {
			await rm(tmpRoot, { recursive: true, force: true });
			tmpRoot = undefined;
		}
	});

	it("night localNowIso hits outbound_night + local time hard block", async () => {
		tmpRoot = await assertNightLayerHit({ dataSrc });
	});

	it("late_night localNowIso hits outbound_late_night", async () => {
		tmpRoot = await assertLateNightLayerHit({ dataSrc });
	});
});
