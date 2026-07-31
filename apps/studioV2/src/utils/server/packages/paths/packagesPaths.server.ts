/**
	* 故事包路径与 packageId / chapterId 校验（server-only）。
	*/
import { access } from "node:fs/promises";
import path from "node:path";
import { getStudioV2DataRoot } from "../../data/dataRoot.server";

/** packageId / chapterId：小写开头 snake_case */
const PACKAGE_ID_RE = /^[a-z][a-z0-9_]{0,63}$/;

/** packageId 是否符合磁盘目录约定（snake_case） */
export function isValidPackageId(packageId: string): boolean {
	return PACKAGE_ID_RE.test(packageId);
}

/** chapterId 与 packageId 同形；全局唯一键 */
export function isValidChapterId(chapterId: string): boolean {
	return PACKAGE_ID_RE.test(chapterId);
}

export function packagesRoot(): string {
	return path.join(getStudioV2DataRoot(), "storis-packages");
}

export function packageDir(packageId: string): string {
	return path.join(packagesRoot(), packageId);
}

/** 章目录：storis-packages/<pkg>/chapters/<chapterId>/ */
export function chapterDir(packageId: string, chapterId: string): string {
	return path.join(packageDir(packageId), "chapters", chapterId);
}

export function packageConfPath(packageId: string): string {
	return path.join(packageDir(packageId), "package.conf.json");
}

export function chapterConfPath(
	packageId: string,
	chapterId: string,
): string {
	return path.join(chapterDir(packageId, chapterId), "story.conf.json");
}

export function chapterLayoutPath(
	packageId: string,
	chapterId: string,
): string {
	return path.join(chapterDir(packageId, chapterId), "canvas.layout.json");
}

export function chapterCardsDir(
	packageId: string,
	chapterId: string,
): string {
	return path.join(chapterDir(packageId, chapterId), "cards");
}

export async function pathExists(p: string): Promise<boolean> {
	try {
		await access(p);
		return true;
	} catch {
		return false;
	}
}

export function packageFail(code: string, message: string): never {
	throw Object.assign(new Error(message), { code });
}
