/**
	* data/users Profile.user 摘要投影；用于记忆区调试 userId 下拉。
	* 与玩家配置页 UserProfileSummary 解耦，只取键与昵称。
	*/

/** 磁盘用户摘要；userId 与 Memory SQLite 键一致 */
export type DiskUserSummaryDto = {
	/** 存档用户键 */
	userId: string;
	/** 显示昵称 */
	nickname: string;
	/** 创建时间 ISO；可缺 */
	createdAt?: string;
};
