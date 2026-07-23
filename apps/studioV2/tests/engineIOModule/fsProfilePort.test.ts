/**
 * 模块名称：engineIOModule FsProfilePort 验收测（自引擎迁出后）
 */
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { isEngineError, PlayerProfileSchema } from "@airpc/rpg-engine";
// 引用了本机 Fs Profile 工厂，用于验收迁出后的读写行为等价
import { createFsProfilePort } from "../../engineIOModule/profile/fsProfilePort";

describe("FsProfilePort", () => {
	let tmp: string | undefined;

	afterEach(async () => {
		if (tmp) {
			await rm(tmp, { recursive: true, force: true });
			tmp = undefined;
		}
	});

	async function setup() {
		tmp = await mkdtemp(path.join(os.tmpdir(), "airpc-profile-"));
		return createFsProfilePort(tmp);
	}

	it("readProfile 无档返回 null", async () => {
		const port = await setup();
		expect(await port.readProfile({ userId: "missing" })).toBeNull();
	});

	it("writeProfile 整档覆盖并刷新 meta.updatedAt", async () => {
		const port = await setup();
		const now = "2026-07-01T00:00:00.000Z";
		const profile = PlayerProfileSchema.parse({
			schemaVersion: 1,
			userId: "u1",
			user: {
				userId: "u1",
				nickname: "测",
				createdAt: now,
				updatedAt: now,
			},
		});
		await port.writeProfile({ profile });
		const file = path.join(tmp!, "users", "u1", "profile.save.json");
		const disk = PlayerProfileSchema.parse(
			JSON.parse(await readFile(file, "utf8")),
		);
		expect(disk.user.nickname).toBe("测");
		expect(typeof disk.meta?.updatedAt).toBe("string");
		expect(disk.meta?.updatedAt).not.toBe(now);

		const again = await port.readProfile({ userId: "u1" });
		expect(again?.userId).toBe("u1");
	});

	it("ensureProfile 无档时建最小档；有档原样读回", async () => {
		const port = await setup();
		const created = await port.ensureProfile({ userId: "new-user" });
		expect(created.userId).toBe("new-user");
		expect(created.user.nickname).toBe("new-user");

		created.user.nickname = "改名";
		await port.writeProfile({ profile: created });
		const again = await port.ensureProfile({ userId: "new-user" });
		expect(again.user.nickname).toBe("改名");
	});

	it("JSON 损坏 throw VALIDATION_FAILED", async () => {
		const port = await setup();
		const dir = path.join(tmp!, "users", "bad");
		await mkdir(dir, { recursive: true });
		await writeFile(path.join(dir, "profile.save.json"), "{not-json", "utf8");
		await expect(port.readProfile({ userId: "bad" })).rejects.toSatisfy(
			function (err: unknown) {
				return isEngineError(err) && err.code === "VALIDATION_FAILED";
			},
		);
	});
});
