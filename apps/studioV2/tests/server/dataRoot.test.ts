/**
 * Studio data root resolution: E2E may inject an isolated workspace, while
 * invalid configuration must never fall back to the repository data tree.
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { getStudioV2DataRoot } from "../../src/utils/server/data/dataRoot.server";

const originalDataRoot = process.env.AIRPC_STUDIO_DATA_ROOT;
const originalE2E = process.env.AIRPC_E2E;
const temporaryRoots: string[] = [];

afterEach(async () => {
	if (originalDataRoot == null) {
		delete process.env.AIRPC_STUDIO_DATA_ROOT;
	} else {
		process.env.AIRPC_STUDIO_DATA_ROOT = originalDataRoot;
	}
	if (originalE2E == null) {
		delete process.env.AIRPC_E2E;
	} else {
		process.env.AIRPC_E2E = originalE2E;
	}
	await Promise.all(
		temporaryRoots.splice(0).map((root) => rm(root, { recursive: true })),
	);
});

describe("getStudioV2DataRoot", () => {
	it("uses an explicit isolated workspace data root", async () => {
		const root = await mkdtemp(path.join(os.tmpdir(), "airpc-data-root-"));
		temporaryRoots.push(root);
		await writeFile(path.join(root, "workspace.json"), "{}\n", "utf8");
		process.env.AIRPC_STUDIO_DATA_ROOT = root;

		expect(getStudioV2DataRoot()).toBe(path.normalize(root));
	});

	it("rejects a relative configured path", () => {
		process.env.AIRPC_STUDIO_DATA_ROOT = "data";

		expect(() => getStudioV2DataRoot()).toThrow(
			"AIRPC_STUDIO_DATA_ROOT must be an absolute path",
		);
	});

	it("rejects a configured path without workspace.json", async () => {
		const root = await mkdtemp(path.join(os.tmpdir(), "airpc-data-root-"));
		temporaryRoots.push(root);
		process.env.AIRPC_STUDIO_DATA_ROOT = root;

		expect(() => getStudioV2DataRoot()).toThrow(
			"AIRPC_STUDIO_DATA_ROOT does not contain workspace.json",
		);
	});

	it("requires a disposable workspace marker in E2E mode", async () => {
		const workspace = await mkdtemp(path.join(os.tmpdir(), "airpc-data-root-"));
		temporaryRoots.push(workspace);
		const root = path.join(workspace, "data");
		await mkdir(root, { recursive: true });
		await writeFile(path.join(root, "workspace.json"), "{}\n", "utf8");
		process.env.AIRPC_STUDIO_DATA_ROOT = root;
		process.env.AIRPC_E2E = "1";

		expect(() => getStudioV2DataRoot()).toThrow(
			"AIRPC_E2E workspace marker not found",
		);
		await writeFile(path.join(workspace, ".airpc-e2e-workspace"), "1\n");
		expect(getStudioV2DataRoot()).toBe(path.normalize(root));
	});
});
