/**
 * 模块名称：Host 经 ProfilePort 读/写薄存档
 * 模块说明：从 createEngineHost 拆出，避免 Host 组合函数净增；
 * 引擎不再拼 users/.../profile.save.json（技术设计 23 §4.2）。
 */
import { engineError, isEngineError } from "./errors.js";
import type { PlayerProfile } from "../schema/profile.js";
import type { ProfilePort } from "../ports/profilePort.js";
import type { LogRecord, SaveReason } from "./types.js";

/**
 * 经 Port 加载薄档进 Host 内存缓存；无档 → NOT_FOUND（与迁前 ensureProfile 一致）。
 * 不在此自动建档；建档走 Port.ensureProfile（由调用方显式决定）。
 */
export async function loadProfileViaPort(input: {
	userId: string;
	profilePort: ProfilePort | null;
	profiles: Map<string, PlayerProfile>;
}): Promise<PlayerProfile> {
	const cached = input.profiles.get(input.userId);
	if (cached) {
		return cached;
	}
	if (!input.profilePort) {
		throw engineError(
			"ENGINE_INTERNAL",
			"ProfilePort required: inject createFsProfilePort (engineIOModule) or test fake",
		);
	}
	let loaded: PlayerProfile | null;
	try {
		loaded = await input.profilePort.readProfile({ userId: input.userId });
	} catch (err) {
		if (isEngineError(err)) {
			throw err;
		}
		throw engineError("ENGINE_INTERNAL", "readProfile failed", err);
	}
	if (!loaded) {
		throw engineError("NOT_FOUND", `profile not found: ${input.userId}`);
	}
	input.profiles.set(input.userId, structuredClone(loaded));
	return input.profiles.get(input.userId)!;
}

/** 经 Port 整档覆盖写；persist=false 时跳过落盘。 */
export async function saveProfileViaPort(input: {
	userId: string;
	reason: SaveReason;
	persist: boolean;
	profilePort: ProfilePort | null;
	profiles: Map<string, PlayerProfile>;
	pushLog: (record: LogRecord) => void;
}): Promise<void> {
	const profile = input.profiles.get(input.userId);
	if (!profile) {
		throw engineError("NOT_FOUND", `profile not in memory: ${input.userId}`);
	}
	if (input.persist) {
		if (!input.profilePort) {
			throw engineError(
				"ENGINE_INTERNAL",
				"ProfilePort required for persist saveProfile",
			);
		}
		await input.profilePort.writeProfile({ profile });
	}
	input.pushLog({
		at: new Date().toISOString(),
		type: "profile.saved",
		userId: input.userId,
		payload: { reason: input.reason },
	});
}
