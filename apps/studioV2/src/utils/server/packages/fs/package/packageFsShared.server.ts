/**
	* 故事包磁盘 IO 共享：包就绪、JSON 写入、package.conf 解析。
	*/
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PackageConfSchema, type PackageConf } from "@airpc/rpg-engine";
import { ensureFlatPackageMigrated } from "@studio-v2/engineIOModule/content/migrate/packageMigrate";
import {
	isValidPackageId,
	packageDir,
	packageFail,
} from "../../paths/packagesPaths.server";

export async function ensurePackageReady(packageId: string): Promise<void> {
	if (!isValidPackageId(packageId)) {
		packageFail("VALIDATION_FAILED", "invalid packageId");
	}
	const dir = packageDir(packageId);
	await ensureFlatPackageMigrated(dir, packageId);
}

export async function writeJson(filePath: string, value: unknown): Promise<void> {
	await mkdir(path.dirname(filePath), { recursive: true });
	await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function parsePackageConfOrFail(
	packageId: string,
	raw: unknown,
): PackageConf {
	const parsed = PackageConfSchema.safeParse(raw);
	if (!parsed.success) {
		packageFail("VALIDATION_FAILED", `package.conf.json invalid: ${packageId}`);
	}
	const conf = parsed.data;
	if (conf.packageId !== packageId) {
		packageFail(
			"VALIDATION_FAILED",
			`package.conf packageId mismatch: ${conf.packageId}`,
		);
	}
	return conf;
}
