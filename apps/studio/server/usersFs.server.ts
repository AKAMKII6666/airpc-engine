/**
 * 模块名称：用户列表 / 创建（文件系统）
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getStudioDataRoot } from "@studio/server/dataRoot.server";

export interface UserSummary {
  userId: string;
  nickname: string;
  createdAt?: string;
}

interface UsersIndex {
  schemaVersion: number;
  users: UserSummary[];
}

async function readIndex(): Promise<UsersIndex> {
  const file = path.join(getStudioDataRoot(), "users/index.json");
  const raw = JSON.parse(await readFile(file, "utf8")) as UsersIndex;
  return raw;
}

async function writeIndex(index: UsersIndex): Promise<void> {
  const file = path.join(getStudioDataRoot(), "users/index.json");
  await writeFile(file, JSON.stringify(index, null, 2) + "\n", "utf8");
}

export async function listUserSummaries(): Promise<UserSummary[]> {
  const index = await readIndex();
  return index.users;
}

export async function createUserProfile(input: {
  userId: string;
  nickname: string;
}): Promise<UserSummary> {
  const index = await readIndex();
  if (index.users.some((u) => u.userId === input.userId)) {
    throw Object.assign(new Error("user exists"), { code: "VALIDATION_FAILED" });
  }
  const now = new Date().toISOString();
  const summary: UserSummary = {
    userId: input.userId,
    nickname: input.nickname,
    createdAt: now,
  };
  index.users.push(summary);
  await writeIndex(index);

  const dir = path.join(getStudioDataRoot(), "users", input.userId);
  await mkdir(dir, { recursive: true });
  const profile = {
    schemaVersion: 1,
    userId: input.userId,
    user: {
      userId: input.userId,
      nickname: input.nickname,
      createdAt: now,
      updatedAt: now,
    },
    characters: {},
    stories: {},
    callCards: { board: { byAgent: {} } },
    world: { lore: null, facts: [], knowledge: {} },
    schedule: { clockMs: 0, intents: [] },
    research: { commitments: [] },
    meta: { createdAt: now, updatedAt: now },
  };
  await writeFile(
    path.join(dir, "profile.save.json"),
    JSON.stringify(profile, null, 2) + "\n",
    "utf8",
  );
  return summary;
}
