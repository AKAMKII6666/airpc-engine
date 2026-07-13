/**
 * 模块名称：故事包列表（读 conf，不经引擎剧情）
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { getStudioDataRoot } from "@studio/server/dataRoot.server";

export interface StoryPackageSummary {
  packageId: string;
  title: string;
  schemaVersion: number;
  cardCount: number;
}

export async function listStoryPackages(): Promise<StoryPackageSummary[]> {
  const root = path.join(getStudioDataRoot(), "storis-packages");
  const names = await readdir(root);
  const out: StoryPackageSummary[] = [];
  for (const name of names) {
    const confPath = path.join(root, name, "story.conf.json");
    try {
      const conf = JSON.parse(await readFile(confPath, "utf8")) as {
        packageId: string;
        title?: string;
        schemaVersion: number;
        cards?: unknown[];
      };
      out.push({
        packageId: conf.packageId,
        title: conf.title ?? conf.packageId,
        schemaVersion: conf.schemaVersion,
        cardCount: conf.cards?.length ?? 0,
      });
    } catch {
      // skip broken dirs
    }
  }
  return out;
}

export async function readStoryPackageConf(packageId: string): Promise<{
  packageId: string;
  title?: string;
  schemaVersion: number;
  cards: Array<{ cardId: string }>;
  entryCardId?: string;
}> {
  const confPath = path.join(
    getStudioDataRoot(),
    "storis-packages",
    packageId,
    "story.conf.json",
  );
  return JSON.parse(await readFile(confPath, "utf8"));
}
