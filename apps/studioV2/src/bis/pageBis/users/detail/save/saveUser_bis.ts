/**
	* 玩家详情保存：经 API 写 Profile.user，回读投影；禁止写 Board / Memory。
	*/
import type { UserProfileSummary } from "@studio-v2/typeFiles/library/users/userProfileSummary";
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
	* 合并表单 → PUT user 段 → 以服务端回读结果投影，保证刷新后一致。
	*/
export async function commitSaveUserDetail(
	previous: UserProfileSummary,
	values: UserDetailFormValues,
): Promise<UserProfileSummary> {
	const nextSummary = applyUserDetailForm(previous, values);
	const saved = await putProfileUser(
		previous.userId,
		summaryToUser(nextSummary),
	);
	return userToSummary(saved);
}
