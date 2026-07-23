/**
	* 全局资产库读写：data/assets/meta/<assetId>.json + files/。
	* 仅 Next API 门面调用；禁止 client 直引。真源口径见需求 14。
	*/
import {
	access,
	mkdir,
	readdir,
	readFile,
	stat,
	unlink,
	writeFile,
} from "node:fs/promises";
import path from "node:path";
import type { AssetMeta } from "@airpc/rpg-engine";
import { getStudioV2DataRoot } from "../data/dataRoot.server";

/** assetId：小写开头，允许数字 / _ / -；与 createStudioId("asset") 及既有 clip_* 对齐 */
const ASSET_ID_RE = /^[a-z][a-z0-9_-]{0,63}$/;

export function isValidAssetId(assetId: string): boolean {
	return ASSET_ID_RE.test(assetId);
}

function assetsRoot(): string {
	return path.join(getStudioV2DataRoot(), "assets");
}

function metaRoot(): string {
	return path.join(assetsRoot(), "meta");
}

function metaPath(assetId: string): string {
	return path.join(metaRoot(), `${assetId}.json`);
}

async function pathExists(p: string): Promise<boolean> {
	try {
		await access(p);
		return true;
	} catch {
		return false;
	}
}

/**
	* 解析 uri 相对 data/assets/ 的绝对路径；拒绝越界。
	*/
export function resolveAssetFilePath(uri: string): string {
	const uriRel = uri.replace(/^\.?\//, "");
	if (
		uriRel.includes("..") ||
		path.isAbsolute(uriRel) ||
		uriRel.startsWith("~")
	) {
		throw Object.assign(new Error(`asset uri escapes assets root: ${uri}`), {
			code: "VALIDATION_FAILED",
		});
	}
	return path.join(assetsRoot(), uriRel);
}

/**
	* 列出 meta/*.json 对应的 assetId（跳过破损文件名）。
	*/
export async function listAssetIds(): Promise<string[]> {
	const root = metaRoot();
	if (!(await pathExists(root))) {
		return [];
	}
	const names = await readdir(root);
	const out: string[] = [];
	for (const name of names) {
		if (!name.endsWith(".json")) continue;
		const assetId = name.slice(0, -".json".length);
		if (!isValidAssetId(assetId)) continue;
		out.push(assetId);
	}
	return out.sort(function (a, b) {
		return a.localeCompare(b);
	});
}

export async function readAssetMetaJson(assetId: string): Promise<unknown> {
	if (!isValidAssetId(assetId)) {
		throw Object.assign(new Error("invalid assetId"), {
			code: "VALIDATION_FAILED",
		});
	}
	try {
		return JSON.parse(await readFile(metaPath(assetId), "utf8"));
	} catch {
		throw Object.assign(new Error(`asset not found: ${assetId}`), {
			code: "NOT_FOUND",
		});
	}
}

/**
	* 探测 uri 指向的文件是否存在（不校验 kind）。
	*/
export async function assetFileExists(uri: string): Promise<boolean> {
	try {
		const filePath = resolveAssetFilePath(uri);
		return pathExists(filePath);
	} catch {
		return false;
	}
}

/**
	* meta JSON 的 mtime（ISO）；读失败时回落当前时间，避免列表崩。
	*/
export async function readAssetMetaMtimeIso(assetId: string): Promise<string> {
	try {
		const st = await stat(metaPath(assetId));
		return st.mtime.toISOString();
	} catch {
		return new Date().toISOString();
	}
}

export async function writeAssetMetaJson(
	assetId: string,
	meta: AssetMeta,
): Promise<void> {
	if (!isValidAssetId(assetId)) {
		throw Object.assign(new Error("invalid assetId"), {
			code: "VALIDATION_FAILED",
		});
	}
	if (meta.assetId !== assetId) {
		throw Object.assign(new Error("assetId mismatch"), {
			code: "VALIDATION_FAILED",
		});
	}
	await mkdir(metaRoot(), { recursive: true });
	const text = JSON.stringify(meta, null, 2) + "\n";
	await writeFile(metaPath(assetId), text, "utf8");
}

export async function assetMetaExists(assetId: string): Promise<boolean> {
	if (!isValidAssetId(assetId)) return false;
	return pathExists(metaPath(assetId));
}

/**
	* 将二进制写入 uri（相对 data/assets/）；自动建父目录。
	* 供头像/资源直传；禁止越界 uri。
	*/
export async function writeAssetFileBytes(
	uri: string,
	bytes: Uint8Array,
): Promise<void> {
	const filePath = resolveAssetFilePath(uri);
	await mkdir(path.dirname(filePath), { recursive: true });
	await writeFile(filePath, bytes);
}

/**
	* 读出 uri 指向的文件字节；缺失或不存在时抛 NOT_FOUND。
	*/
export async function readAssetFileBytes(uri: string): Promise<Buffer> {
	const filePath = resolveAssetFilePath(uri);
	try {
		return await readFile(filePath);
	} catch {
		throw Object.assign(new Error(`asset file not found: ${uri}`), {
			code: "NOT_FOUND",
		});
	}
}

/**
	* 删除 meta JSON；若 uri 指向 files/ 下文件且存在则一并删（不递归清目录）。
	*/
export async function deleteAssetMetaJson(assetId: string): Promise<void> {
	if (!isValidAssetId(assetId)) {
		throw Object.assign(new Error("invalid assetId"), {
			code: "VALIDATION_FAILED",
		});
	}
	if (!(await pathExists(metaPath(assetId)))) {
		throw Object.assign(new Error(`asset not found: ${assetId}`), {
			code: "NOT_FOUND",
		});
	}
	let uri: string | undefined;
	try {
		const raw = JSON.parse(await readFile(metaPath(assetId), "utf8")) as {
			uri?: unknown;
		};
		if (typeof raw.uri === "string") uri = raw.uri;
	} catch {
		/* 元数据已坏仍删文件名 */
	}
	await unlink(metaPath(assetId));
	if (uri) {
		try {
			const filePath = resolveAssetFilePath(uri);
			if (await pathExists(filePath)) {
				await unlink(filePath);
			}
		} catch {
			/* uri 非法或越界：只删 meta，不抛 */
		}
	}
}
