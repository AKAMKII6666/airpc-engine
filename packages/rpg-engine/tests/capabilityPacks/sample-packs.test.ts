/**
 * L1-C 样板：user-location（T4）与 outbound-window-gate（T5）。
 */
import { describe, it } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	assertOutboundWindowGateDefers,
	assertUserLocationInSoftContext,
} from "./sample-packs.helpers.js";

const repoRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../../../..",
);
const dataSrc = path.join(repoRoot, "data");

describe("capabilityPacks L1-C samples", function () {
	it("T4 user-location appears in softContext when pack enabled", async function () {
		await assertUserLocationInSoftContext(dataSrc);
	});

	it("T5 outbound-window-gate defers outside window", function () {
		assertOutboundWindowGateDefers();
	});
});
