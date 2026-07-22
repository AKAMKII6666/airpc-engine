/**
	* 故事包路径与 packageId 校验（server-only）。
	*/
import { access } from "node:fs/promises";
import path from "node:path";
import { getStudioV2DataRoot } from "../../data/dataRoot.server";

/** packageId：小写开头 snake_case；与 wrong_number_act1 / golden_handoff 对齐 */
const PACKAGE_ID_RE = /^[a-z][a-z0-9_]{0,63}$/;

/** packageId 是否符合磁盘目录约定（snake_case） */
export function isValidPackageId(packageId: string): boolean {
	return PACKAGE_ID_RE.test(packageId);
}

export function packagesRoot(): string {
	return path.join(getStudioV2DataRoot(), "storis-packages");
}

export function packageDir(packageId: string): string {
	return path.join(packagesRoot(), packageId);
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
