/**
	* 玩家详情：回读 user 段 + lore 预览（禁止 UI 直引 ajaxProxy）。
	*/
import { fetchProfileUser } from "@studio-v2/src/utils/ajaxProxy/library/api/usersApi";
import { userToSummary } from "../form/mapper/mapUserProfile";
import type { UserProfileSummary } from "@studio-v2/typeFiles/library/users/userProfileSummary";
import type { LorePreviewDto } from "@studio-v2/typeFiles/library/users/loreBootstrap";

/**
	* 详情挂载时 GET 回读结果；lore 预览来自 Profile.world。
	*/
export type LoadUserDetailResult = {
	/** 由服务端 User 投影的详情表单摘要 */
	summary: UserProfileSummary;
	/** Profile.world.lore 只读预览；无 lore 为 null */
	lorePreview: LorePreviewDto | null;
};

/**
	* GET 单用户详情投影；供详情页挂载时刷新 lore 预览。
	*/
export async function loadUserDetail(
	userId: string,
): Promise<LoadUserDetailResult> {
	const data = await fetchProfileUser(userId);
	return {
		summary: userToSummary(data.user),
		lorePreview: data.lorePreview ?? null,
	};
}
