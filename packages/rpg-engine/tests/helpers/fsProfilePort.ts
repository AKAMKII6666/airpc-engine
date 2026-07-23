/**
 * 模块名称：测试用 Fs ProfilePort
 * 模块说明：与 engineIOModule/profile/fsProfilePort 行为对齐的测试镜像；
 * 引擎测不得 import apps/studioV2（独立性优先于 DRY）。
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { engineError } from "../../src/host/errors.js";
import {
	PlayerProfileSchema,
	type PlayerProfile,
} from "../../src/schema/profile.js";
import type { ProfilePort } from "../../src/ports/profilePort.js";

function profileFilePath(dataRoot: string, userId: string): string {
	return path.join(dataRoot, "users", userId, "profile.save.json");
}

function createMinimalProfile(userId: string): PlayerProfile {
	const now = new Date().toISOString();
	return PlayerProfileSchema.parse({
		schemaVersion: 1,
		userId,
		user: {
			userId,
			nickname: userId,
			createdAt: now,
			updatedAt: now,
		},
	});
}

/** 指向 dataRoot 的 ProfilePort；供 host 集成测注入。 */
export function createFsProfilePort(dataRoot: string): ProfilePort {
	async function readProfile(input: {
		userId: string;
	}): Promise<PlayerProfile | null> {
		const file = profileFilePath(dataRoot, input.userId);
		let text: string;
		try {
			text = await readFile(file, "utf8");
		} catch {
			return null;
		}
		try {
			return PlayerProfileSchema.parse(JSON.parse(text));
		} catch (err) {
			throw engineError("VALIDATION_FAILED", "profile parse failed", err);
		}
	}

	async function writeProfile(input: {
		profile: PlayerProfile;
	}): Promise<void> {
		const { profile } = input;
		const file = profileFilePath(dataRoot, profile.userId);
		await mkdir(path.dirname(file), { recursive: true });
		const next: PlayerProfile = {
			...profile,
			meta: {
				...(profile.meta ?? {}),
				updatedAt: new Date().toISOString(),
			},
		};
		await writeFile(file, JSON.stringify(next, null, 2) + "\n", "utf8");
	}

	return {
		readProfile,
		writeProfile,
		async ensureProfile(input) {
			const existing = await readProfile({ userId: input.userId });
			if (existing) {
				return existing;
			}
			const initial = input.initial ?? createMinimalProfile(input.userId);
			await writeProfile({ profile: initial });
			const written = await readProfile({ userId: input.userId });
			if (!written) {
				throw engineError(
					"ENGINE_INTERNAL",
					`ensureProfile write then read miss: ${input.userId}`,
				);
			}
			return written;
		},
	};
}
