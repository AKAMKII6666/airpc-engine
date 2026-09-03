/**
	* FS 直写 Profile 后同步 EngineHost 内存缓存。
	* usersFs 不经 Host.saveProfile 落盘；若 Host 已缓存该 user，schedule autosave 会用旧内存覆盖磁盘。
	*/
import { getStudioV2EngineHost } from "../host/engineHost.server";

/**
	* PUT/POST 写 profile.save.json 后重载 Host 缓存，使后续 autosave 与磁盘一致。
	* Host 未 boot 时无 stale 风险，静默跳过。
	*/
export async function syncHostProfileAfterFsWrite(
	userId: string,
): Promise<void> {
	try {
		const host = await getStudioV2EngineHost();
		await host.reloadProfileFromPort(userId);
	} catch {
		/* Host 未装配或无档：无内存缓存可污染磁盘 */
	}
}

/**
	* DELETE 删档后踢 Host 缓存，避免 saveProfile 把已删 user 写回磁盘。
	*/
export async function evictHostProfileAfterFsDelete(
	userId: string,
): Promise<void> {
	try {
		const host = await getStudioV2EngineHost();
		host.evictProfileCache(userId);
	} catch {
		/* Host 未 boot：无缓存 */
	}
}
