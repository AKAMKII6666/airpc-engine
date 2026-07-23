/**
	* 玩家配置 BFF：读写 data/users/<userId>/profile.save.json 的 user 段。
	* 记忆区仍用摘要字段；列表与详情用完整 User。
	*/
import type { User } from "@studio-v2/typeFiles/library/users/engineUser";
import { parseStudioApiJson } from "@studio-v2/src/utils/ajaxHelper/studioApiClient";
import type { DiskUserSummaryDto } from "@studio-v2/typeFiles/library/users/diskUserSummary";

export type UsersListData = {
	users: User[];
};

export type UserOneData = {
	user: User;
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

/** GET /api/users/:userId — 回读单用户 user 段 */
export async function fetchProfileUser(userId: string): Promise<User> {
	const res = await fetch(`/api/users/${encodeURIComponent(userId)}`);
	const data = await parseStudioApiJson<UserOneData>(res);
	return data.user;
}

/** POST /api/users — 新建薄 Profile 并写 user 段 */
export async function postProfileUser(user: User): Promise<User> {
	const res = await fetch("/api/users", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ user }),
	});
	const data = await parseStudioApiJson<UserOneData>(res);
	return data.user;
}

/**
	* PUT /api/users/:userId — 仅更新 user 段；响应为写后回读。
	*/
export async function putProfileUser(
	userId: string,
	user: User,
): Promise<User> {
	const res = await fetch(`/api/users/${encodeURIComponent(userId)}`, {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ user }),
	});
	const data = await parseStudioApiJson<UserOneData>(res);
	return data.user;
}

/** DELETE /api/users/:userId */
export async function deleteProfileUser(userId: string): Promise<void> {
	const res = await fetch(`/api/users/${encodeURIComponent(userId)}`, {
		method: "DELETE",
	});
	await parseStudioApiJson<{ ok: true }>(res);
}
