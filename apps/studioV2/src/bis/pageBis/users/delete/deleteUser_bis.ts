/**
	* 玩家档案删除：经 API 删除 data/users/<userId>（含 profile.save.json）。
	* demo-user 由服务端拒绝。
	*/
import { deleteProfileUser } from "@studio-v2/src/utils/ajaxProxy/library/api/usersApi";

/** 删除玩家落盘结果 */
export type DeleteUserResult = {
	/** 被移除的 userId */
	userId: string;
};

/**
	* 提交删除用户目录与 index 条目；失败抛错不假定本地已删。
	*/
export async function commitDeleteUser(
	userId: string,
): Promise<DeleteUserResult> {
	await deleteProfileUser(userId);
	return { userId };
}
