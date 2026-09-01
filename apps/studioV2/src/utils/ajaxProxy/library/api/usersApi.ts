/**
	* 玩家配置 BFF：读写 data/users/<userId>/profile.save.json 的 user 段。
	* 记忆区仍用摘要字段；列表与详情用完整 User。
	*/
import type { User } from "@studio-v2/typeFiles/library/users/engineUser";
import { parseStudioApiJson } from "@studio-v2/src/utils/ajaxHelper/studioApiClient";
import type { DiskUserSummaryDto } from "@studio-v2/typeFiles/library/users/diskUserSummary";
import type {
	LoreBootstrapResultDto,
	LorePreviewDto,
	LoreSourceDto,
} from "@studio-v2/typeFiles/library/users/loreBootstrap";

export type UsersListData = {
	users: User[];
};

export type UserOneData = {
	user: User;
	/** 当前 Profile.world.lore.source；无 lore 为 null */
	loreSource?: LoreSourceDto | null;
	/** 世界背景只读预览；无 lore 为 null */
	lorePreview?: LorePreviewDto | null;
	/** 地点已变且已有 lore 时建议手动重生成 */
	loreRegenSuggested?: boolean;
};

export type CreateUserData = {
	user: User;
	/** 自动 bootstrap 失败或走 fallback 时的人话提示；不挡创建成功 */
	loreWarning?: string;
};

/**
	* GET /api/users — 磁盘各 Profile 的 user 段列表。
	*/
export async function fetchProfileUsers(): Promise<User[]> {
	const res = await fetch("/api/users");
	const data = await parseStudioApiJson<UsersListData>(res);
	return data.users;
}

/**
	* GET /api/users — 投影为记忆区调试 userId 下拉摘要。
	*/
export async function fetchDiskUserSummaries(): Promise<DiskUserSummaryDto[]> {
	const users = await fetchProfileUsers();
	return users.map(function (u) {
		return {
			userId: u.userId,
			nickname: u.nickname,
			createdAt: u.createdAt,
		};
	});
}

/** GET /api/users/:userId — 回读单用户 user 段 + loreSource */
export async function fetchProfileUser(userId: string): Promise<UserOneData> {
	const res = await fetch(`/api/users/${encodeURIComponent(userId)}`);
	return parseStudioApiJson<UserOneData>(res);
}

/** POST /api/users — 新建薄 Profile；可选 loreWarning */
export async function postProfileUser(
	user: User,
): Promise<CreateUserData> {
	const res = await fetch("/api/users", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ user }),
	});
	return parseStudioApiJson<CreateUserData>(res);
}

/**
	* PUT /api/users/:userId — 仅更新 user 段；响应为写后回读。
	*/
export async function putProfileUser(
	userId: string,
	user: User,
): Promise<UserOneData> {
	const res = await fetch(`/api/users/${encodeURIComponent(userId)}`, {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ user }),
	});
	return parseStudioApiJson<UserOneData>(res);
}

/**
	* POST /api/users/:userId/lore/bootstrap — 生成／强制重生成世界背景。
	*/
export async function postBootstrapUserLore(
	userId: string,
	opts?: { force?: boolean },
): Promise<LoreBootstrapResultDto> {
	const res = await fetch(
		`/api/users/${encodeURIComponent(userId)}/lore/bootstrap`,
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ force: opts?.force === true }),
		},
	);
	return parseStudioApiJson<LoreBootstrapResultDto>(res);
}

/** DELETE /api/users/:userId */
export async function deleteProfileUser(userId: string): Promise<void> {
	const res = await fetch(`/api/users/${encodeURIComponent(userId)}`, {
		method: "DELETE",
	});
	await parseStudioApiJson<{ ok: true }>(res);
}
