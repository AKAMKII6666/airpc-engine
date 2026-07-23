/**
	* 模块名称：本机 Fs ProfilePort
	* 模块说明：自 packages/rpg-engine persistProfile / readProfile 迁出；
	* 路径仅本模块知道：`data/users/<userId>/profile.save.json`。
	* Server 边界：仅 Host 装配 / API / *.server.ts 可引用；禁止 Client。
	* 协议：技术设计 23 §4.2。
	*/
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
	engineError,
	PlayerProfileSchema,
	type PlayerProfile,
	type ProfilePort,
} from "@airpc/rpg-engine";

function profileFilePath(dataRoot: string, userId: string): string {
	return path.join(dataRoot, "users", userId, "profile.save.json");
}

/**
	* 无档且未传 initial 时的最小合法档（钉死：nickname=userId，空 Board/stories）。
	* Host 推荐仍传入 initial；本路径仅保证 ensureProfile 不抛「缺 initial」。
	*/
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

function toIoFailed(err: unknown, message: string): never {
	throw engineError("ENGINE_INTERNAL", message, {
		reason: "IO_FAILED",
		cause: err,
	});
}

/**
	* 创建指向 `dataRoot` 的本机 ProfilePort（行为与迁前 Host 直写 fs 等价）。
	*
	* @param dataRoot 工作区根（本机即仓库 `data/` 或测试临时 data 根）
	*/
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
		try {
			await mkdir(path.dirname(file), { recursive: true });
			const next: PlayerProfile = {
				...profile,
				meta: {
					...(profile.meta ?? {}),
					updatedAt: new Date().toISOString(),
				},
			};
			await writeFile(file, JSON.stringify(next, null, 2) + "\n", "utf8");
		} catch (err) {
			toIoFailed(err, `writeProfile failed: ${profile.userId}`);
		}
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
			if (initial.userId !== input.userId) {
				throw engineError(
					"VALIDATION_FAILED",
					`ensureProfile initial.userId mismatch: ${initial.userId} !== ${input.userId}`,
				);
			}
			await writeProfile({ profile: initial });
			const written = await readProfile({ userId: input.userId });
			if (!written) {
				toIoFailed(
					undefined,
					`ensureProfile write then read miss: ${input.userId}`,
				);
			}
			return written;
		},
	};
}
