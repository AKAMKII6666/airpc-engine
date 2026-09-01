/**
 * Profile 内存缓存与 ProfilePort 重载：Studio usersFs 直写 FS 后须 reload，否则 autosave 覆盖新档。
 */
import { mkdtemp, readFile, writeFile, mkdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { PlayerProfileSchema } from "../../src/index.js";
import {
	createTestHost,
	createFsProfilePort,
} from "../helpers/inMemoryMemoryPort.js";

describe("profile cache reload from port", () => {
	let tmpRoot: string | undefined;

	afterEach(async () => {
		if (tmpRoot) {
			await rm(tmpRoot, { recursive: true, force: true });
			tmpRoot = undefined;
		}
	});

	async function seedProfile(userId: string, nickname: string): Promise<void> {
		tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-profile-reload-"));
		const now = "2026-08-01T00:00:00.000Z";
		const profile = PlayerProfileSchema.parse({
			schemaVersion: 1,
			userId,
			user: {
				userId,
				nickname,
				createdAt: now,
				updatedAt: now,
			},
		});
		const file = path.join(tmpRoot, "users", userId, "profile.save.json");
		await mkdir(path.dirname(file), { recursive: true });
		await writeFile(file, JSON.stringify(profile, null, 2) + "\n", "utf8");
	}

	it("ensureProfile 命中缓存时不读盘；reloadProfileFromPort 重载磁盘真源", async () => {
		const userId = "u-reload";
		await seedProfile(userId, "旧昵称");
		const host = createTestHost({ dataRoot: tmpRoot!, persist: true });

		const cached = await host.ensureProfile(userId);
		expect(cached.user.nickname).toBe("旧昵称");

		const file = path.join(tmpRoot!, "users", userId, "profile.save.json");
		const disk = PlayerProfileSchema.parse(
			JSON.parse(await readFile(file, "utf8")),
		);
		disk.user.nickname = "新昵称";
		await writeFile(file, JSON.stringify(disk, null, 2) + "\n", "utf8");

		const stillStale = await host.ensureProfile(userId);
		expect(stillStale.user.nickname).toBe("旧昵称");

		const reloaded = await host.reloadProfileFromPort(userId);
		expect(reloaded.user.nickname).toBe("新昵称");

		await host.saveProfile(userId, "autosave");
		const afterSave = PlayerProfileSchema.parse(
			JSON.parse(await readFile(file, "utf8")),
		);
		expect(afterSave.user.nickname).toBe("新昵称");
	});

	it("evictProfileCache 后 ensureProfile 重读 Port", async () => {
		const userId = "u-evict";
		await seedProfile(userId, "初始");
		const host = createTestHost({ dataRoot: tmpRoot!, persist: true });
		await host.ensureProfile(userId);

		const port = createFsProfilePort(tmpRoot!);
		const disk = await port.readProfile({ userId });
		expect(disk).not.toBeNull();
		disk!.user.nickname = "磁盘更新";
		await port.writeProfile({ profile: disk! });

		host.evictProfileCache(userId);
		const fresh = await host.ensureProfile(userId);
		expect(fresh.user.nickname).toBe("磁盘更新");
	});
});
