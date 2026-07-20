/**
 * 模块名称：全局资产库磁盘读写（data/assets）
 */
import {
  access,
  mkdir,
  readdir,
  readFile,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { AssetMetaSchema, type AssetMeta } from "@airpc/rpg-engine";
import { getStudioDataRoot } from "@studio/server/dataRoot.server";

const ASSET_ID_RE = /^[a-z][a-z0-9_-]{0,63}$/;

export function isValidAssetId(assetId: string): boolean {
  return ASSET_ID_RE.test(assetId);
}

function assetsRoot(): string {
  return path.join(getStudioDataRoot(), "assets");
}

function metaPath(assetId: string): string {
  return path.join(assetsRoot(), "meta", `${assetId}.json`);
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

function resolveUriUnderAssets(uri: string): string | null {
  const rel = uri.replace(/^\.?\//, "");
  if (!rel || rel.includes("..") || path.isAbsolute(rel) || rel.startsWith("~")) {
    return null;
  }
  return path.join(assetsRoot(), rel);
}

export async function listAssets(): Promise<AssetMeta[]> {
  const metaDir = path.join(assetsRoot(), "meta");
  let names: string[] = [];
  try {
    names = await readdir(metaDir);
  } catch {
    return [];
  }
  const out: AssetMeta[] = [];
  for (const name of names) {
    if (!name.endsWith(".json")) continue;
    try {
      const raw = JSON.parse(
        await readFile(path.join(metaDir, name), "utf8"),
      ) as unknown;
      const parsed = AssetMetaSchema.safeParse(raw);
      if (parsed.success) out.push(parsed.data);
    } catch {
      // skip broken
    }
  }
  return out.sort(function (a, b) {
    return a.assetId.localeCompare(b.assetId);
  });
}

export async function readAsset(assetId: string): Promise<AssetMeta> {
  if (!isValidAssetId(assetId)) {
    throw Object.assign(new Error("invalid assetId"), { code: "VALIDATION_FAILED" });
  }
  const p = metaPath(assetId);
  if (!(await pathExists(p))) {
    throw Object.assign(new Error(`asset not found: ${assetId}`), {
      code: "NOT_FOUND",
    });
  }
  const raw = JSON.parse(await readFile(p, "utf8")) as unknown;
  const parsed = AssetMetaSchema.safeParse(raw);
  if (!parsed.success) {
    throw Object.assign(new Error("invalid AssetMeta on disk"), {
      code: "VALIDATION_FAILED",
    });
  }
  return parsed.data;
}

export async function writeAssetMeta(meta: AssetMeta): Promise<AssetMeta> {
  const parsed = AssetMetaSchema.parse(meta);
  if (!isValidAssetId(parsed.assetId)) {
    throw Object.assign(new Error("invalid assetId"), { code: "VALIDATION_FAILED" });
  }
  if (!resolveUriUnderAssets(parsed.uri)) {
    throw Object.assign(new Error("uri must be relative under data/assets/"), {
      code: "VALIDATION_FAILED",
    });
  }
  const metaDir = path.join(assetsRoot(), "meta");
  await mkdir(metaDir, { recursive: true });
  await writeFile(
    metaPath(parsed.assetId),
    JSON.stringify(parsed, null, 2) + "\n",
    "utf8",
  );
  return parsed;
}

export async function writeAssetFile(
  uri: string,
  bytes: Buffer,
): Promise<string> {
  const abs = resolveUriUnderAssets(uri);
  if (!abs) {
    throw Object.assign(new Error("uri must be relative under data/assets/"), {
      code: "VALIDATION_FAILED",
    });
  }
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, bytes);
  return abs;
}

export async function createAsset(input: {
  meta: AssetMeta;
  /** base64 文件内容；省略则只写 meta（文件可后补） */
  fileBase64?: string;
}): Promise<AssetMeta> {
  const meta = await writeAssetMeta(input.meta);
  if (input.fileBase64) {
    const bytes = Buffer.from(input.fileBase64, "base64");
    await writeAssetFile(meta.uri, bytes);
  }
  return meta;
}

export async function deleteAsset(assetId: string): Promise<void> {
  const meta = await readAsset(assetId);
  await unlink(metaPath(assetId));
  const abs = resolveUriUnderAssets(meta.uri);
  if (abs && (await pathExists(abs))) {
    try {
      await unlink(abs);
    } catch {
      // ignore file delete race
    }
  }
}

export async function assetFileExists(uri: string): Promise<boolean> {
  const abs = resolveUriUnderAssets(uri);
  if (!abs) return false;
  return pathExists(abs);
}
