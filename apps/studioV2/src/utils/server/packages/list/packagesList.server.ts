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

function isEacces(err: unknown): boolean {
	return (
		err !== null &&
		typeof err === "object" &&
		"code" in err &&
		(err as NodeJS.ErrnoException).code === "EACCES"
	);
}

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

async function migratePackageOrSkip(
	pkgDir: string,
	name: string,
): Promise<"ok" | "skip"> {
	try {
		await ensureFlatPackageMigrated(pkgDir, name);
		return "ok";
	} catch (err) {
		// root 属主残留包可能 EACCES；跳过以免整表挂
		if (isEacces(err)) return "skip";
		throw err;
	}
}

async function countCardsAcrossChapters(
	packageId: string,
	chapters: readonly { chapterId: string }[],
): Promise<number> {
	let cardCount = 0;
	for (const ch of chapters) {
		const conf = await tryReadChapterConfSoft(packageId, ch.chapterId);
		if (conf) cardCount += conf.cards.length;
	}
	return cardCount;
}

function entryCardsFromConf(
	entryConfRaw: ChapterConf | null,
): CallCardDefinition[] {
	if (entryConfRaw && "_cardsLoaded" in entryConfRaw) {
		return (entryConfRaw as ChapterConf & {
			_cardsLoaded: CallCardDefinition[];
		})._cardsLoaded;
	}
	return [];
}

async function buildPackageSummary(input: {
	pkgDir: string;
	name: string;
	packageConf: ReturnType<typeof PackageConfSchema.parse>;
}): Promise<DiskStoryPackageSummary> {
	const packageId =
		input.packageConf.packageId.length > 0
			? input.packageConf.packageId
			: input.name;
	const cardCount = await countCardsAcrossChapters(
		packageId,
		input.packageConf.chapters,
	);
	const entryConfRaw = await tryReadChapterConfSoft(
		packageId,
		input.packageConf.entryChapterId,
	);
	const entryCards = entryCardsFromConf(entryConfRaw);
	let lastEditedAt = "";
	try {
		const st = await stat(input.pkgDir);
		lastEditedAt = st.mtime.toISOString();
	} catch {
		lastEditedAt = "";
	}
	return {
		packageId,
		title:
			typeof input.packageConf.title === "string" &&
			input.packageConf.title.trim() !== ""
				? input.packageConf.title
				: packageId,
		schemaVersion: input.packageConf.schemaVersion,
		chapterCount: input.packageConf.chapters.length,
		entryChapterId: input.packageConf.entryChapterId,
		cardCount,
		characterCount: entryConfRaw
			? listDerivedReferencedAgentIds({
					conf: entryConfRaw,
					cards: entryCards,
				}).length
			: 0,
		assetCount: entryConfRaw?.assetRefs?.length ?? 0,
		entryCardId: entryConfRaw?.entryCardId ?? "",
		lastEditedAt,
	};
}

async function tryReadPackageSummary(
	root: string,
	name: string,
): Promise<DiskStoryPackageSummary | null> {
	const pkgDir = path.join(root, name);
	if ((await migratePackageOrSkip(pkgDir, name)) === "skip") {
		return null;
	}
	try {
		const raw = JSON.parse(await readFile(packageConfPath(name), "utf8"));
		const parsed = PackageConfSchema.safeParse(raw);
		if (!parsed.success) return null;
		return await buildPackageSummary({
			pkgDir,
			name,
			packageConf: parsed.data,
		});
	} catch {
		return null;
	}
}
