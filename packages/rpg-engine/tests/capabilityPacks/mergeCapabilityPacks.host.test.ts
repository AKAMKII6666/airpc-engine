/**
 * L1-B：Host 装配 merge 事件与关包 Free 通话（T3）。
 */
import { describe, it } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	assertFreeCallWithPackDisabled,
	assertHostBootstrapsMergeLog,
} from "./mergeCapabilityPacks.host.helpers.js";

const repoRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../../../..",
);
const dataSrc = path.join(repoRoot, "data");

describe("mergeCapabilityPacks L1-B host", function () {
	it("Host bootstraps capabilityPack.merge into log ring", async function () {
		await assertHostBootstrapsMergeLog(dataSrc);
	});

	it("T3 Free call still works with non-core pack disabled", async function () {
		await assertFreeCallWithPackDisabled(dataSrc);
	});
});
