/**
	* 玩家 Profile 落盘：data/users/<userId>/profile.save.json 的 user 段读写。
	* 仅 Next API 门面调用；禁止 client 直引。
	* 更新只替换 user（及 meta.updatedAt）；不碰 Board / stories / Memory。
	*/
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
	PlayerProfileSchema,
	UserSchema,
	type PlayerProfile,
	type User,
} from "@airpc/rpg-engine";
import { getStudioV2DataRoot } from "../data/dataRoot.server";

/** index.json 中的用户摘要；与磁盘真源字段对齐 */
export type DiskUserSummary = {
	userId: string;
	nickname: string;
	createdAt?: string;
};

type UsersIndex = {
	schemaVersion: number;
	users: DiskUserSummary[];
};

const USER_ID_RE = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/;

export function isValidUserId(userId: string): boolean {
	return USER_ID_RE.test(userId);
}

function usersRoot(): string {
	return path.join(getStudioV2DataRoot(), "users");
}

function indexPath(): string {
	return path.join(usersRoot(), "index.json");
}

function profilePath(userId: string): string {
	return path.join(usersRoot(), userId, "profile.save.json");
}

async function readIndex(): Promise<UsersIndex> {
	const raw = JSON.parse(await readFile(indexPath(), "utf8")) as UsersIndex;
	if (!Array.isArray(raw.users)) {
		throw Object.assign(new Error("users/index.json invalid"), {
			code: "VALIDATION_FAILED",
		});
	}
	return raw;
}

async function writeIndex(index: UsersIndex): Promise<void> {
	await writeFile(indexPath(), JSON.stringify(index, null, 2) + "\n", "utf8");
}

async function readRawProfile(userId: string): Promise<unknown> {
	if (!isValidUserId(userId)) {
		throw Object.assign(new Error("invalid userId"), {
			code: "VALIDATION_FAILED",
		});
	}
	try {
		return JSON.parse(await readFile(profilePath(userId), "utf8"));
	} catch {
		throw Object.assign(new Error(`user not found: ${userId}`), {
			code: "NOT_FOUND",
		});
	}
}

async function writeRawProfile(
	userId: string,
	profile: PlayerProfile,
): Promise<void> {
	const dir = path.join(usersRoot(), userId);
	await mkdir(dir, { recursive: true });
	await writeFile(
		profilePath(userId),
		JSON.stringify(profile, null, 2) + "\n",
		"utf8",
	);
}

/**
	* 列出 data/users/index.json 中的用户；失败时抛错由 API 映射。
	*/
export async function listDiskUserSummaries(): Promise<DiskUserSummary[]> {
	const index = await readIndex();
	return index.users.map(function (u) {
		return {
			userId: String(u.userId),
			nickname: String(u.nickname ?? u.userId),
			createdAt: u.createdAt,
		};
	});
}

/**
	* 读取并校验整份 Profile；供 user 段回读与合并写。
	*/
export async function readPlayerProfile(
	userId: string,
): Promise<PlayerProfile> {
	const raw = await readRawProfile(userId);
	const parsed = PlayerProfileSchema.safeParse(raw);
	if (!parsed.success) {
		throw Object.assign(
			new Error(`profile invalid: ${userId}`),
			{ code: "VALIDATION_FAILED", cause: parsed.error },
		);
	}
	return parsed.data;
}

/**
	* 列出各存档 Profile 的 user 段（按 index 顺序）。
	*/
export async function listProfileUsers(): Promise<User[]> {
	const summaries = await listDiskUserSummaries();
	const users: User[] = [];
	for (const summary of summaries) {
		const profile = await readPlayerProfile(summary.userId);
		users.push(profile.user);
	}
	return users;
}

/**
	* 新建薄 Profile：写 index + profile.save.json；user 段经 UserSchema 校验。
	*/
export async function createUserProfile(input: User): Promise<User> {
	if (!isValidUserId(input.userId)) {
		throw Object.assign(new Error("invalid userId"), {
			code: "VALIDATION_FAILED",
		});
	}
	const parsedUser = UserSchema.parse(input);
	const index = await readIndex();
	if (index.users.some((u) => u.userId === parsedUser.userId)) {
		throw Object.assign(new Error("user exists"), {
			code: "VALIDATION_FAILED",
		});
	}
	const now = parsedUser.createdAt || new Date().toISOString();
	const user: User = {
		...parsedUser,
		createdAt: now,
		updatedAt: parsedUser.updatedAt || now,
	};
	index.users.push({
		userId: user.userId,
		nickname: user.nickname,
		createdAt: user.createdAt,
	});
	await writeIndex(index);

	const profile: PlayerProfile = {
		schemaVersion: 1,
		userId: user.userId,
		user,
		characters: {},
		stories: {},
		callCards: { board: { byAgent: {} } },
		world: { lore: null, facts: [], knowledge: {} },
		schedule: { clockMs: 0, intents: [] },
		research: { commitments: [] },
		meta: { createdAt: user.createdAt, updatedAt: user.updatedAt },
	};
	await writeRawProfile(user.userId, profile);
	return (await readPlayerProfile(user.userId)).user;
}

/**
	* 仅更新 Profile.user（保留经历态）；写后回读 user 段以保证一致。
	*/
export async function updateProfileUser(
	userId: string,
	incoming: User,
): Promise<User> {
	if (!isValidUserId(userId)) {
		throw Object.assign(new Error("invalid userId"), {
			code: "VALIDATION_FAILED",
		});
	}
	if (incoming.userId !== userId) {
		throw Object.assign(new Error("userId mismatch"), {
			code: "VALIDATION_FAILED",
		});
	}
	const existing = await readPlayerProfile(userId);
	const now = new Date().toISOString();
	const nextUser = UserSchema.parse({
		...incoming,
		userId,
		createdAt: existing.user.createdAt,
		updatedAt: now,
		preferences: incoming.preferences ?? existing.user.preferences,
	});
	const nextProfile: PlayerProfile = {
		...existing,
		user: nextUser,
		meta: {
			...(typeof existing.meta === "object" && existing.meta != null
				? existing.meta
				: {}),
			updatedAt: now,
		},
	};
	await writeRawProfile(userId, nextProfile);

	const index = await readIndex();
	const idx = index.users.findIndex((u) => u.userId === userId);
	if (idx >= 0) {
		index.users[idx] = {
			userId,
			nickname: nextUser.nickname,
			createdAt: index.users[idx]?.createdAt ?? nextUser.createdAt,
		};
		await writeIndex(index);
	}

	return (await readPlayerProfile(userId)).user;
}

/**
	* 删除 index 条目与用户目录；demo-user 禁止删。
	*/
export async function deleteUserProfile(userId: string): Promise<void> {
	if (!isValidUserId(userId)) {
		throw Object.assign(new Error("invalid userId"), {
			code: "VALIDATION_FAILED",
		});
	}
	if (userId === "demo-user") {
		throw Object.assign(new Error("demo-user 为样例存档，禁止删除"), {
			code: "VALIDATION_FAILED",
		});
	}
	const index = await readIndex();
	const next = index.users.filter(function (u) {
		return u.userId !== userId;
	});
	if (next.length === index.users.length) {
		throw Object.assign(new Error(`user not found: ${userId}`), {
			code: "NOT_FOUND",
		});
	}
	index.users = next;
	await writeIndex(index);
	await rm(path.join(usersRoot(), userId), {
		recursive: true,
		force: true,
	});
}
