/**
 * 模块名称：Profile 落盘
 */
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import type { PlayerProfile } from "../schema/profile.js";
import { profilePath } from "./loadWorkspace.js";

export async function writeProfile(
  rootDir: string,
  profile: PlayerProfile,
): Promise<void> {
  const file = profilePath(rootDir, profile.userId);
  await mkdir(path.dirname(file), { recursive: true });
  const next: PlayerProfile = {
    ...profile,
    meta: {
      ...(profile.meta ?? {}),
      updatedAt: new Date().toISOString(),
    },
  };
  await writeFile(file, JSON.stringify(next, null, 2) + "\n", "utf8");
}
