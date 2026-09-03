/**
	* usersFs 直写后 syncHostProfileAfterFsWrite：autosave 不覆盖新 nickname。
	*/
import { cp, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlayerProfileSchema } from "@airpc/rpg-engine";

vi.mock("../../src/utils/server/data/dataRoot.server", () => ({
	getStudioV2DataRoot: vi.fn(),
}));

import { getStudioV2DataRoot } from "../../src/utils/server/data/dataRoot.server";
import {
	getStudioV2EngineHost,
	resetStudioV2EngineHostForTests,
} from "../../src/utils/server/host/engineHost.server";
import { syncHostProfileAfterFsWrite } from "../../src/utils/server/users/syncHostProfileAfterFsWrite.server";
import { updateProfileUser } from "../../src/utils/server/users/usersFs.server";

const repoRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../../../..",
);
const repoData = path.join(repoRoot, "data");

/**
	* 只拷稳定夹具，禁止整树 cp(data/)。
	* storiesFs / diskBundleGraph 会在共享 storis-packages 下建删探针包，
	* 整树递归拷贝会与其竞态（ENOENT lstat studio_v2_*）。
	*/
async function setupIsolatedDataRoot(): Promise<string> {
	const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-user-sync-"));
	await mkdir(path.join(tmpRoot, "storis-packages"), { recursive: true });
	await cp(
		path.join(repoData, "workspace.json"),
		path.join(tmpRoot, "workspace.json"),
	);
	await cp(path.join(repoData, "users"), path.join(tmpRoot, "users"), {
		recursive: true,
	});
	await cp(
		path.join(repoData, "characters"),
		path.join(tmpRoot, "characters"),
		{ recursive: true },
	);
	await cp(
		path.join(repoData, "storis-packages", "golden_handoff"),
		path.join(tmpRoot, "storis-packages", "golden_handoff"),
		{ recursive: true },
	);
	return tmpRoot;
}

describe("syncHostProfileAfterFsWrite", () => {
	let tmpRoot: string | undefined;

	beforeEach(async () => {
		resetStudioV2EngineHostForTests();
		tmpRoot = await setupIsolatedDataRoot();
		vi.mocked(getStudioV2DataRoot).mockReturnValue(tmpRoot);
	});

	afterEach(async () => {
		resetStudioV2EngineHostForTests();
		vi.clearAllMocks();
		if (tmpRoot) {
			await rm(tmpRoot, { recursive: true, force: true });
			tmpRoot = undefined;
		}
	});

	it("FS 更新 user 后 sync，Host autosave 保留新 nickname", async () => {
		const userId = "demo-user";
		const profilePath = path.join(
			tmpRoot!,
			"users",
			userId,
			"profile.save.json",
		);
		const host = await getStudioV2EngineHost();
		const loaded = await host.ensureProfile(userId);
		const oldNickname = loaded.user.nickname;

		const nextUser = { ...loaded.user, nickname: `${oldNickname}-已保存` };
		await updateProfileUser(userId, nextUser);
		await syncHostProfileAfterFsWrite(userId);

		await host.saveProfile(userId, "autosave");
		const disk = PlayerProfileSchema.parse(
			JSON.parse(await readFile(profilePath, "utf8")),
		);
		expect(disk.user.nickname).toBe(`${oldNickname}-已保存`);
	});

	it("Host 未 boot 时 sync 不抛错", async () => {
		resetStudioV2EngineHostForTests();
		await expect(
			syncHostProfileAfterFsWrite("demo-user"),
		).resolves.toBeUndefined();
	});
});
