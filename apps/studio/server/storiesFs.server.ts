/**
 * 模块名称：故事包读写（Content JSON + layout 旁车）
 */
import {
  access,
  readdir,
  readFile,
  rename,
  rm,
  unlink,
  writeFile,
  mkdir,
} from "node:fs/promises";
import path from "node:path";
import { getStudioDataRoot } from "@studio/server/dataRoot.server";

export interface StoryPackageSummary {
  packageId: string;
  title: string;
  schemaVersion: number;
  cardCount: number;
}

export interface StoryLayoutFile {
  schemaVersion: number;
  packageId: string;
  lanes: Array<{ agentId: string; order: number }>;
  nodes: Array<{ cardId: string; x: number; y: number }>;
  note?: string;
}

const PACKAGE_ID_RE = /^[a-z][a-z0-9_]{0,63}$/;

export function isValidPackageId(packageId: string): boolean {
  return PACKAGE_ID_RE.test(packageId);
}

function packageDir(packageId: string): string {
  return path.join(getStudioDataRoot(), "storis-packages", packageId);
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
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

export async function createStoryPackage(input: {
  packageId: string;
  title?: string;
}): Promise<StoryPackageSummary> {
  const packageId = input.packageId.trim();
  if (!isValidPackageId(packageId)) {
    throw Object.assign(new Error("packageId 须为 snake_case（小写字母开头）"), {
      code: "VALIDATION_FAILED",
    });
  }
  const dir = packageDir(packageId);
  if (await pathExists(dir)) {
    throw Object.assign(new Error(`package already exists: ${packageId}`), {
      code: "VALIDATION_FAILED",
    });
  }
  await mkdir(path.join(dir, "cards"), { recursive: true });
  const title = (input.title ?? packageId).trim() || packageId;
  const conf = {
    schemaVersion: 1,
    packageId,
    title,
    participants: [] as string[],
    cards: [] as Array<{ cardId: string }>,
  };
  const layout: StoryLayoutFile = {
    schemaVersion: 1,
    packageId,
    lanes: [],
    nodes: [],
  };
  await writeFile(
    path.join(dir, "story.conf.json"),
    JSON.stringify(conf, null, 2) + "\n",
    "utf8",
  );
  await writeFile(
    path.join(dir, "canvas.layout.json"),
    JSON.stringify(layout, null, 2) + "\n",
    "utf8",
  );
  return {
    packageId,
    title,
    schemaVersion: 1,
    cardCount: 0,
  };
}

export async function renameStoryPackage(
  packageId: string,
  newPackageId: string,
): Promise<StoryPackageSummary> {
  const nextId = newPackageId.trim();
  if (!isValidPackageId(nextId)) {
    throw Object.assign(new Error("newPackageId 须为 snake_case（小写字母开头）"), {
      code: "VALIDATION_FAILED",
    });
  }
  if (packageId === nextId) {
    const conf = await readStoryPackageConf(packageId);
    return {
      packageId,
      title: conf.title ?? packageId,
      schemaVersion: conf.schemaVersion,
      cardCount: conf.cards.length,
    };
  }
  const from = packageDir(packageId);
  const to = packageDir(nextId);
  if (!(await pathExists(from))) {
    throw Object.assign(new Error(`package not found: ${packageId}`), {
      code: "NOT_FOUND",
    });
  }
  if (await pathExists(to)) {
    throw Object.assign(new Error(`package already exists: ${nextId}`), {
      code: "VALIDATION_FAILED",
    });
  }
  await rename(from, to);
  const conf = await readStoryPackageConf(nextId);
  conf.packageId = nextId;
  await writeStoryPackageConf(nextId, conf);
  const layout = await readStoryLayout(nextId);
  if (layout) {
    layout.packageId = nextId;
    await writeStoryLayout(nextId, layout);
  }
  return {
    packageId: nextId,
    title: conf.title ?? nextId,
    schemaVersion: conf.schemaVersion,
    cardCount: conf.cards.length,
  };
}

export async function deleteStoryPackage(packageId: string): Promise<void> {
  if (!isValidPackageId(packageId)) {
    throw Object.assign(new Error("invalid packageId"), {
      code: "VALIDATION_FAILED",
    });
  }
  const dir = packageDir(packageId);
  if (!(await pathExists(dir))) {
    throw Object.assign(new Error(`package not found: ${packageId}`), {
      code: "NOT_FOUND",
    });
  }
  await rm(dir, { recursive: true, force: true });
}

export async function readStoryPackageConf(packageId: string): Promise<{
  packageId: string;
  title?: string;
  schemaVersion: number;
  participants: string[];
  cards: Array<{ cardId: string }>;
  entryCardId?: string;
}> {
  const confPath = path.join(packageDir(packageId), "story.conf.json");
  return JSON.parse(await readFile(confPath, "utf8"));
}

export async function writeStoryPackageConf(
  packageId: string,
  conf: unknown,
): Promise<void> {
  const dir = packageDir(packageId);
  await mkdir(dir, { recursive: true });
  await mkdir(path.join(dir, "cards"), { recursive: true });
  const text = JSON.stringify(conf, null, 2) + "\n";
  await writeFile(path.join(dir, "story.conf.json"), text, "utf8");
}

export async function readStoryCard(
  packageId: string,
  cardId: string,
): Promise<unknown> {
  const cardPath = path.join(
    packageDir(packageId),
    "cards",
    `${cardId}.s-card.json`,
  );
  return JSON.parse(await readFile(cardPath, "utf8"));
}

export async function writeStoryCard(
  packageId: string,
  cardId: string,
  card: unknown,
): Promise<void> {
  const cardsDir = path.join(packageDir(packageId), "cards");
  await mkdir(cardsDir, { recursive: true });
  const text = JSON.stringify(card, null, 2) + "\n";
  await writeFile(path.join(cardsDir, `${cardId}.s-card.json`), text, "utf8");
}

export async function readAllStoryCards(
  packageId: string,
  cardIds: string[],
): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = {};
  for (const cardId of cardIds) {
    try {
      out[cardId] = await readStoryCard(packageId, cardId);
    } catch {
      // skip missing
    }
  }
  return out;
}

export async function readStoryLayout(
  packageId: string,
): Promise<StoryLayoutFile | null> {
  const layoutPath = path.join(packageDir(packageId), "canvas.layout.json");
  try {
    return JSON.parse(await readFile(layoutPath, "utf8")) as StoryLayoutFile;
  } catch {
    return null;
  }
}

export async function writeStoryLayout(
  packageId: string,
  layout: StoryLayoutFile,
): Promise<void> {
  const dir = packageDir(packageId);
  await mkdir(dir, { recursive: true });
  const text = JSON.stringify(layout, null, 2) + "\n";
  await writeFile(path.join(dir, "canvas.layout.json"), text, "utf8");
}

export async function deleteStoryCard(
  packageId: string,
  cardId: string,
): Promise<void> {
  const cardPath = path.join(
    packageDir(packageId),
    "cards",
    `${cardId}.s-card.json`,
  );
  try {
    await unlink(cardPath);
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code?: string }).code)
        : "";
    if (code !== "ENOENT") throw err;
  }
}

const CARD_ID_RE = /^[a-z][a-z0-9_]{0,63}$/;

export function isValidCardId(cardId: string): boolean {
  return CARD_ID_RE.test(cardId);
}

function rewriteCardIdRefs(
  value: unknown,
  fromId: string,
  toId: string,
): unknown {
  if (Array.isArray(value)) {
    return value.map(function (item) {
      return rewriteCardIdRefs(item, fromId, toId);
    });
  }
  if (!value || typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (
      (k === "cardId" || k === "card_id") &&
      typeof v === "string" &&
      v === fromId
    ) {
      out[k] = toId;
    } else {
      out[k] = rewriteCardIdRefs(v, fromId, toId);
    }
  }
  return out;
}

/**
 * 重命名卡文件 + conf／layout／其它卡引用；写回后由 API 刷 workspace。
 */
export async function renameStoryCard(
  packageId: string,
  oldCardId: string,
  newCardIdRaw: string,
): Promise<{ cardId: string }> {
  const newCardId = newCardIdRaw.trim();
  if (!isValidCardId(newCardId)) {
    throw Object.assign(
      new Error("cardId 须为 snake_case（小写字母开头）"),
      { code: "VALIDATION_FAILED" },
    );
  }
  if (oldCardId === newCardId) {
    return { cardId: oldCardId };
  }
  const oldPath = path.join(
    packageDir(packageId),
    "cards",
    `${oldCardId}.s-card.json`,
  );
  const newPath = path.join(
    packageDir(packageId),
    "cards",
    `${newCardId}.s-card.json`,
  );
  if (!(await pathExists(oldPath))) {
    throw Object.assign(new Error(`card not found: ${oldCardId}`), {
      code: "NOT_FOUND",
    });
  }
  if (await pathExists(newPath)) {
    throw Object.assign(new Error(`card already exists: ${newCardId}`), {
      code: "VALIDATION_FAILED",
    });
  }

  const conf = await readStoryPackageConf(packageId);
  const cardIds = conf.cards.map(function (c) {
    return c.cardId;
  });
  const allCards = await readAllStoryCards(packageId, cardIds);

  const raw = allCards[oldCardId];
  if (!raw || typeof raw !== "object") {
    throw Object.assign(new Error(`card unreadable: ${oldCardId}`), {
      code: "NOT_FOUND",
    });
  }
  const rewrittenSelf = rewriteCardIdRefs(raw, oldCardId, newCardId) as Record<
    string,
    unknown
  >;
  rewrittenSelf.cardId = newCardId;
  await writeStoryCard(packageId, newCardId, rewrittenSelf);
  await deleteStoryCard(packageId, oldCardId);

  for (const [cid, other] of Object.entries(allCards)) {
    if (cid === oldCardId) continue;
    const next = rewriteCardIdRefs(other, oldCardId, newCardId);
    await writeStoryCard(packageId, cid, next);
  }

  conf.cards = conf.cards.map(function (c) {
    return c.cardId === oldCardId ? { ...c, cardId: newCardId } : c;
  });
  if (conf.entryCardId === oldCardId) {
    conf.entryCardId = newCardId;
  }
  await writeStoryPackageConf(packageId, conf);

  const layout = await readStoryLayout(packageId);
  if (layout) {
    layout.nodes = layout.nodes.map(function (n) {
      return n.cardId === oldCardId ? { ...n, cardId: newCardId } : n;
    });
    await writeStoryLayout(packageId, layout);
  }

  return { cardId: newCardId };
}
