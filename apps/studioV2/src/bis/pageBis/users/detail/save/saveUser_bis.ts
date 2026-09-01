/**
	* 玩家详情保存：经 API 写 Profile.user，回读投影；禁止写 Board / Memory。
	*/
import type { UserProfileSummary } from "@studio-v2/typeFiles/library/users/userProfileSummary";
import type { LorePreviewDto } from "@studio-v2/typeFiles/library/users/loreBootstrap";
import { putProfileUser } from "@studio-v2/src/utils/ajaxProxy/library/api/usersApi";
import {
	summaryToUser,
	userToSummary,
} from "../../form/mapper/mapUserProfile";
import {
	applyUserDetailForm,
	type UserDetailFormValues,
} from "../userDetailForm";

/**
	* 详情保存成功体：投影供列表 upsert；lore 字段供本页提示，不进 users store。
	*/
export type SaveUserDetailResult = {
	/** 写后回读 User 的列表/详情投影 */
	summary: UserProfileSummary;
	/** 当前 lore 只读预览；保存不改 lore，通常与保存前一致 */
	lorePreview?: LorePreviewDto | null;
	/** 地点相对旧档变化且已有 lore → UI 提示可手动重生成（不自动覆盖） */
	loreRegenSuggested?: boolean;
};

/**
	* 合并表单 → PUT user 段 → 以服务端回读结果投影，保证刷新后一致。
	*/
export async function commitSaveUserDetail(
	previous: UserProfileSummary,
	values: UserDetailFormValues,
): Promise<SaveUserDetailResult> {
	const nextSummary = applyUserDetailForm(previous, values);
	const saved = await putProfileUser(
		previous.userId,
		summaryToUser(nextSummary),
	);
	return {
		summary: userToSummary(saved.user),
		lorePreview: saved.lorePreview ?? null,
		loreRegenSuggested: saved.loreRegenSuggested,
	};
}
