/**
	* 故事包 BFF：包容器读 / 写 / 建 / 删；章 API 见 chapterFs.server。
	* 读章前 ensureFlatPackageMigrated；仅 Next API 调用。
	*/
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm } from "node:fs/promises";
import {
	type CallCardDefinition,
	type ChapterConf,
	type PackageConf,
} from "@airpc/rpg-engine";
import { ensureFlatPackageMigrated } from "@studio-v2/engineIOModule/content/migrate/packageMigrate";
import { listDiskStoryPackages } from "@studio-v2/src/utils/server/packages/list/packagesList.server";
import { readWorkspaceConfig } from "@studio-v2/src/utils/server/workspace/workspaceFs.server";
import { buildNewPackageCanvasLayout } from "../../layout/newPackageCanvasLayout.server";
import {
	isValidChapterId,
	isValidPackageId,
	packageConfPath,
	packageDir,
	packageFail,
	pathExists,
} from "../../paths/packagesPaths.server";
import type {
	DiskChapterBundle,
	DiskPackageContainer,
} from "@studio-v2/src/utils/server/types/diskStoryPackage.server";
import {
	chapterExists,
	createDiskChapter,
	deleteDiskChapter,
	listDiskChapterIds,
	listDiskChapterSummaries,
	readDiskChapterBundle,
	readDiskStoryPackage,
	writeDiskChapterBundle,
	writeDiskStoryPackage,
} from "../chapter/chapterFs.server";
import {
	ensurePackageReady,
	parsePackageConfOrFail,
	writeJson,
} from "./packageFsShared.server";

export {
	chapterExists,
	createDiskChapter,
	deleteDiskChapter,
	listDiskChapterIds,
	listDiskChapterSummaries,
	readDiskChapterBundle,
	readDiskStoryPackage,
	writeDiskChapterBundle,
	writeDiskStoryPackage,
};

/** 读 package.conf.json */
export async function readDiskPackageConf(
	packageId: string,
): Promise<PackageConf> {
	await ensurePackageReady(packageId);
	try {
		const raw = JSON.parse(
			await readFile(packageConfPath(packageId), "utf8"),
		);
		return parsePackageConfOrFail(packageId, raw);
	} catch (err) {
		if (err && typeof err === "object" && "code" in err) throw err;
		packageFail("NOT_FOUND", `package not found: ${packageId}`);
	}
}

/** 读整包容器（全章） */
export async function readDiskPackageContainer(
	packageId: string,
): Promise<DiskPackageContainer> {
	const packageConf = await readDiskPackageConf(packageId);
	const chapters: DiskChapterBundle[] = [];
	for (const ref of packageConf.chapters) {
		chapters.push(await readDiskChapterBundle(packageId, ref.chapterId));
	}
	return { packageConf, chapters };
}

/** 写整包容器（导入/覆盖） */
export async function writeDiskPackageContainer(
	packageId: string,
	container: {
		packageConf: unknown;
		chapters: Array<{
			conf: unknown;
			cards: unknown[];
			layout?: unknown | null;
		}>;
	},
): Promise<DiskPackageContainer> {
	if (!isValidPackageId(packageId)) {
		packageFail("VALIDATION_FAILED", "invalid packageId");
	}
	const packageConf = parsePackageConfOrFail(packageId, {
		...(container.packageConf as object),
		packageId,
	});
	await mkdir(packageDir(packageId), { recursive: true });
	await writeJson(packageConfPath(packageId), packageConf);

	const chapters: DiskChapterBundle[] = [];
	for (const ch of container.chapters) {
		const confObj = ch.conf as { chapterId?: string };
		const chapterId = confObj.chapterId;
		if (!chapterId || !isValidChapterId(chapterId)) {
			packageFail("VALIDATION_FAILED", "chapter bundle missing chapterId");
		}
		chapters.push(
			await writeDiskChapterBundle(packageId, chapterId, ch),
		);
	}
	return { packageConf, chapters };
}

/** 包是否存在（package.conf.json） */
export async function packageExists(packageId: string): Promise<boolean> {
	if (!isValidPackageId(packageId)) return false;
	const dir = packageDir(packageId);
	await ensureFlatPackageMigrated(dir, packageId);
	return pathExists(packageConfPath(packageId));
}

/** 更新 entryChapterId */
export async function setDiskEntryChapterId(
	packageId: string,
	entryChapterId: string,
): Promise<PackageConf> {
	const packageConf = await readDiskPackageConf(packageId);
	if (
		!packageConf.chapters.some(function (c) {
			return c.chapterId === entryChapterId;
		})
	) {
		packageFail("VALIDATION_FAILED", "entryChapterId not in package chapters");
	}
	const next = { ...packageConf, entryChapterId };
	await writeJson(packageConfPath(packageId), next);
	return next;
}

/**
	* 新建故事包：package.conf + 默认章 + chapter_start/end layout。
	*/
export async function createDiskStoryPackage(input: {
	packageId: string;
	title: string;
	description?: string;
	withStartCard: boolean;
	/** 默认章 id；缺省与 packageId 同形 */
	entryChapterId?: string;
}): Promise<DiskChapterBundle> {
	const packageId = input.packageId.trim();
	if (!isValidPackageId(packageId)) {
		packageFail("VALIDATION_FAILED", "invalid packageId");
	}
	if (await packageExists(packageId)) {
		packageFail("CONFLICT", `package already exists: ${packageId}`);
	}

	const chapterId = (input.entryChapterId?.trim() || packageId).slice(0, 64);
	if (!isValidChapterId(chapterId)) {
		packageFail("VALIDATION_FAILED", "invalid entryChapterId");
	}

	const title = input.title.trim() || packageId;
	const cards: CallCardDefinition[] = [];
	let entryCardId: string | undefined;
	if (input.withStartCard) {
		entryCardId = `card_${randomUUID().replace(/-/g, "").toLowerCase()}`;
		cards.push({
			cardId: entryCardId,
			cardKind: "story",
			title: "第一张通话卡",
			ownerAgentId: "",
			entryMode: "inbound_user_dial",
			interactionMode: "realtime_dialogue",
			context: {
				privateBrief: input.description?.trim() ?? "",
				speakableBrief: "",
			},
			objectives: { requiredBeats: [] },
			toolPolicy: { mode: "inherit_free" },
			exits: [],
		});
	}

	const chapterConf: ChapterConf = {
		schemaVersion: 1,
		chapterId,
		title,
		participants: [],
		cards: cards.map(function (c) {
			return { cardId: c.cardId };
		}),
		...(entryCardId ? { entryCardId } : {}),
	};

	const packageConf: PackageConf = {
		schemaVersion: 1,
		packageId,
		title,
		entryChapterId: chapterId,
		chapters: [{ chapterId }],
	};

	await mkdir(packageDir(packageId), { recursive: true });
	await writeJson(packageConfPath(packageId), packageConf);
	return writeDiskChapterBundle(packageId, chapterId, {
		conf: chapterConf,
		cards,
		layout: buildNewPackageCanvasLayout({
			chapterId,
			chapterTitle: title,
			entryCardId,
		}),
	});
}

/** 删整包 */
export async function deleteDiskStoryPackage(
	packageId: string,
): Promise<{ packageId: string }> {
	const id = packageId.trim();
	if (!isValidPackageId(id)) {
		packageFail("VALIDATION_FAILED", "invalid packageId");
	}
	if (!(await packageExists(id))) {
		packageFail("NOT_FOUND", `package not found: ${id}`);
	}
	const packages = await listDiskStoryPackages();
	if (packages.length <= 1) {
		packageFail(
			"VALIDATION_FAILED",
			"不能删除工作区最后一个故事包（须至少保留一个首故事）",
		);
	}
	const workspace = await readWorkspaceConfig();
	if (workspace.startupPackageId.trim() === id) {
		packageFail(
			"VALIDATION_FAILED",
			"不能删除当前首故事；请先将其它包设定为首故事",
		);
	}
	await rm(packageDir(id), { recursive: true, force: true });
	return { packageId: id };
}
