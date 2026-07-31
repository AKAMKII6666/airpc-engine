/**
	* 扫描 data/storis-packages 下各包 package.conf.json 为列表摘要。
	* characterCount 取自入口章 cards 派生。
	*/
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import {
	type CallCardDefinition,
	type ChapterConf,
	PackageConfSchema,
} from "@airpc/rpg-engine";
import { ensureFlatPackageMigrated } from "@studio-v2/engineIOModule/content/migrate/packageMigrate";
import { listDerivedReferencedAgentIds } from "@studio-v2/src/utils/server/packages/conf/referencedAgentsDerive.server";
import { tryReadChapterConfSoft } from "@studio-v2/src/utils/server/packages/list/chapterConfSoftRead.server";
import {
	packageConfPath,
} from "@studio-v2/src/utils/server/packages/paths/packagesPaths.server";
import type { DiskStoryPackageSummary } from "@studio-v2/src/utils/server/types/diskStoryPackage.server";
import { isValidPackageId, packagesRoot } from "../paths/packagesPaths.server";

export async function listDiskStoryPackages(): Promise<
	DiskStoryPackageSummary[]
> {
	const root = packagesRoot();
	let names: string[];
	try {
		names = await readdir(root);
	} catch {
		return [];
	}
	const out: DiskStoryPackageSummary[] = [];
	for (const name of names) {
		if (!isValidPackageId(name)) continue;
		const summary = await tryReadPackageSummary(root, name);
		if (summary) out.push(summary);
	}
	return out.sort(function (a, b) {
		return a.packageId.localeCompare(b.packageId);
	});
}

async function tryReadPackageSummary(
	root: string,
	name: string,
): Promise<DiskStoryPackageSummary | null> {
	const pkgDir = path.join(root, name);
	await ensureFlatPackageMigrated(pkgDir, name);
	try {
		const raw = JSON.parse(await readFile(packageConfPath(name), "utf8"));
		const parsed = PackageConfSchema.safeParse(raw);
		if (!parsed.success) return null;
		const packageConf = parsed.data;
		const packageId =
			packageConf.packageId.length > 0 ? packageConf.packageId : name;

		let cardCount = 0;
		for (const ch of packageConf.chapters) {
			const conf = await tryReadChapterConfSoft(packageId, ch.chapterId);
			if (conf) cardCount += conf.cards.length;
		}

		const entryConfRaw = await tryReadChapterConfSoft(
			packageId,
			packageConf.entryChapterId,
		);
		const entryCards =
			entryConfRaw &&
			"_cardsLoaded" in entryConfRaw
				? (entryConfRaw as ChapterConf & {
						_cardsLoaded: CallCardDefinition[];
					})._cardsLoaded
				: [];

		let lastEditedAt = "";
		try {
			const st = await stat(pkgDir);
			lastEditedAt = st.mtime.toISOString();
		} catch {
			lastEditedAt = "";
		}

		const entryConf = entryConfRaw;
		return {
			packageId,
			title:
				typeof packageConf.title === "string" &&
				packageConf.title.trim() !== ""
					? packageConf.title
					: packageId,
			schemaVersion: packageConf.schemaVersion,
			chapterCount: packageConf.chapters.length,
			entryChapterId: packageConf.entryChapterId,
			cardCount,
			characterCount: entryConf
				? listDerivedReferencedAgentIds({
						conf: entryConf,
						cards: entryCards,
					}).length
				: 0,
			assetCount: entryConf?.assetRefs?.length ?? 0,
			entryCardId: entryConf?.entryCardId ?? "",
			lastEditedAt,
		};
	} catch {
		return null;
	}
}
