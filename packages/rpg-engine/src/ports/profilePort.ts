/**
 * 模块名称：ProfilePort（技术设计 23 §4.2）
 * 模块说明：薄 PlayerProfile 整档读写契约；路径与介质由 IO 适配决定，引擎只调本 Port。
 */
import type { PlayerProfile } from "../schema/profile.js";

/**
 * 薄存档读写。失败默认 throw 结构化错误（`code` + `message`）；
 * 仅 `readProfile` 在键不存在时返回 null。
 */
export interface ProfilePort {
	/**
	 * 读薄存档。
	 * - 文件/键不存在：返回 null（Host 再决定 ensure）
	 * - JSON 损坏 / schema 失败：throw VALIDATION_FAILED（不要返回半截对象）
	 */
	readProfile(input: { userId: string }): Promise<PlayerProfile | null>;

	/**
	 * 整档覆盖写。实现须在写入前（或写入时）刷新 meta.updatedAt（ISO）。
	 * 成功：void。磁盘满/权限等：throw IO_FAILED。
	 * 幂等：同一文档重复 write = 最后一次覆盖。
	 */
	writeProfile(input: { profile: PlayerProfile }): Promise<void>;

	/**
	 * 若无档则按 initial 创建并落盘；若已有则原样读回。
	 * 不在此方法内跑剧情 Effect。
	 * 无 initial 且无档时由实现建最小合法档或 throw（须在实现注释钉死；推荐 Host 传入 initial）。
	 */
	ensureProfile(input: {
		userId: string;
		/** 仅当不存在时写入；已存在则忽略 */
		initial?: PlayerProfile;
	}): Promise<PlayerProfile>;
}
