/**
 * Profile 内存缓存与 ProfilePort 重载：Studio usersFs 直写 FS 后须 reload，否则 autosave 覆盖新档。
 */
import { rm } from "node:fs/promises";
import { afterEach, describe, it } from "vitest";
import {
	assertEvictThenReread,
	assertReloadFromPortKeepsDisk,
	seedProfile,
} from "./profile-cache-reload.helpers.js";

describe("profile cache reload from port", () => {
	let tmpRoot: string | undefined;

	afterEach(async () => {
		if (tmpRoot) {
			await rm(tmpRoot, { recursive: true, force: true });
			tmpRoot = undefined;
		}
	});

	it("ensureProfile 命中缓存时不读盘；reloadProfileFromPort 重载磁盘真源", async () => {
		tmpRoot = await seedProfile("u-reload", "旧昵称");
		await assertReloadFromPortKeepsDisk(tmpRoot);
	});

	it("evictProfileCache 后 ensureProfile 重读 Port", async () => {
		tmpRoot = await seedProfile("u-evict", "初始");
		await assertEvictThenReread(tmpRoot);
	});
});
