/**
	* 新建玩家：经 API 落盘 data/users/<userId>/profile.save.json 的 user 段。
	* userId / 时间戳由系统生成；禁止 Host 写口。
	*/
import { postProfileUser } from "@studio-v2/src/utils/ajaxProxy/library/api/usersApi";
import type { UserProfileSummary } from "@studio-v2/typeFiles/library/users/userProfileSummary";
import {
	summaryToUser,
	userToSummary,
} from "../form/mapper/mapUserProfile";
import {
	buildMockUserFromForm,
	type CreateUserFormValues,
} from "./createUserForm";

/** 新建玩家落盘结果 */
export type CreateUserResult = {
	/** 新建后的 userId，供选中详情 */
	userId: string;
	/** 由写后回读 User 投影的列表项 */
	summary: UserProfileSummary;
};

/**
	* 创建薄 Profile 并写 user 段；返回回读投影供列表选中。
	*/
export async function commitCreateUser(
	values: CreateUserFormValues,
): Promise<CreateUserResult> {
	const draft = buildMockUserFromForm(values);
	const saved = await postProfileUser(summaryToUser(draft));
	const summary = userToSummary(saved);
	return { userId: summary.userId, summary };
}
