/**
	* 故事包单章磁盘读 / 章管理（建 / 删 / 摘要）。
	*/
import { randomUUID } from "node:crypto";
import { readFile, rm, stat } from "node:fs/promises";
import path from "node:path";
import {
	CallCardDefinitionSchema,
	type CallCardDefinition,
	type ChapterConf,
	type PackageConf,
} from "@airpc/rpg-engine";
import {
	ensureFlatPackageMigrated,
	listChapterIds,
} from "@studio-v2/engineIOModule/content/migrate/packageMigrate";
import { listDerivedReferencedAgentIds } from "@studio-v2/src/utils/server/packages/conf/referencedAgentsDerive.server";
import { buildDefaultCanvasLayout } from "../../layout/defaultCanvasLayout.server";
import { buildNewPackageCanvasLayout } from "../../layout/newPackageCanvasLayout.server";
import {
	chapterCardsDir,
	chapterConfPath,
	chapterDir,
	chapterLayoutPath,
	isValidChapterId,
	isValidPackageId,
	packageConfPath,
	packageDir,
	packageFail,
	pathExists,
} from "../../paths/packagesPaths.server";
import type {
	DiskChapterBundle,
	DiskChapterSummary,
	DiskStoryPackageBundle,
	StudioCanvasLayout,
} from "@studio-v2/src/utils/server/types/diskStoryPackage.server";
import {
	normalizeLayoutChapterId,
	parseChapterConfOrFail,
	writeDiskChapterBundle,
} from "./chapterFsWrite.server";
import {
	ensurePackageReady,
	parsePackageConfOrFail,
	writeJson,
} from "../package/packageFsShared.server";

export { writeDiskChapterBundle, writeDiskStoryPackage } from "./chapterFsWrite.server";

async function packageConfExists(packageId: string): Promise<boolean> {
	if (!isValidPackageId(packageId)) return false;
	const dir = packageDir(packageId);
	await ensureFlatPackageMigrated(dir, packageId);
	return pathExists(packageConfPath(packageId));
}

async function readPackageConfForChapterOps(
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

async function readConfRaw(
	packageId: string,
	chapterId: string,
): Promise<unknown> {
	await ensurePackageReady(packageId);
	try {
		return JSON.parse(
			await readFile(chapterConfPath(packageId, chapterId), "utf8"),
		);
	} catch {
		packageFail("NOT_FOUND", `chapter not found: ${packageId}/${chapterId}`);
	}
}

async function readCardFile(
	packageId: string,
	chapterId: string,
	cardId: string,
): Promise<unknown> {
	const cardPath = path.join(
		chapterCardsDir(packageId, chapterId),
		`${cardId}.s-card.json`,
	);
	try {
		return JSON.parse(await readFile(cardPath, "utf8"));
	} catch {
		packageFail(
			"NOT_FOUND",
			`card not found: ${packageId}/${chapterId}/${cardId}`,
		);
	}
}

async function readLayoutFile(
	packageId: string,
	chapterId: string,
): Promise<StudioCanvasLayout | null> {
	const tryParseLayout = function (raw: unknown): StudioCanvasLayout | null {
		if (!raw || typeof raw !== "object") return null;
		const obj = raw as StudioCanvasLayout;
		if (!Array.isArray(obj.nodes)) return null;
		return normalizeLayoutChapterId(obj, chapterId);
	};

	try {
		const raw = JSON.parse(
			await readFile(chapterLayoutPath(packageId, chapterId), "utf8"),
		) as unknown;
		const parsed = tryParseLayout(raw);
		if (parsed) return parsed;
	} catch {
		/* 章级 layout 不存在时回落包根 legacy */
	}

	try {
		const legacyPath = path.join(packageDir(packageId), "canvas.layout.json");
		const raw = JSON.parse(await readFile(legacyPath, "utf8")) as unknown;
		return tryParseLayout(raw);
	} catch {
		return null;
	}
}

async function loadCardsInConfOrder(
	packageId: string,
	chapterId: string,
	conf: ChapterConf,
): Promise<CallCardDefinition[]> {
	const cards: CallCardDefinition[] = [];
	for (const ref of conf.cards) {
		const cardRaw = await readCardFile(packageId, chapterId, ref.cardId);
		const cardParsed = CallCardDefinitionSchema.safeParse(cardRaw);
		if (!cardParsed.success) {
			packageFail(
				"VALIDATION_FAILED",
				`card invalid: ${chapterId}/${ref.cardId}`,
			);
		}
		if (cardParsed.data.cardId !== ref.cardId) {
			packageFail("VALIDATION_FAILED", `cardId mismatch: ${ref.cardId}`);
		}
		cards.push(cardParsed.data);
	}
	return cards;
}

/** 读单章 bundle */
export async function readDiskChapterBundle(
	packageId: string,
	chapterId: string,
): Promise<DiskChapterBundle> {
	if (!isValidChapterId(chapterId)) {
		packageFail("VALIDATION_FAILED", "invalid chapterId");
	}
	const conf = parseChapterConfOrFail(
		chapterId,
		await readConfRaw(packageId, chapterId),
	);
	const cards = await loadCardsInConfOrder(packageId, chapterId, conf);
	const diskLayout = await readLayoutFile(packageId, chapterId);
	const layout =
		diskLayout ??
		buildDefaultCanvasLayout(
			chapterId,
			conf.cards.map(function (c) {
				return c.cardId;
			}),
			listDerivedReferencedAgentIds({ conf, cards }),
		);
	return { conf, cards, layout };
}

/** 读入口章（兼容旧 readDiskStoryPackage 名） */
export async function readDiskStoryPackage(
	packageId: string,
): Promise<DiskStoryPackageBundle> {
	const packageConf = await readPackageConfForChapterOps(packageId);
	return readDiskChapterBundle(packageId, packageConf.entryChapterId);
}

/** 章是否存在 */
export async function chapterExists(
	packageId: string,
	chapterId: string,
): Promise<boolean> {
	if (!isValidPackageId(packageId) || !isValidChapterId(chapterId)) {
		return false;
	}
	return pathExists(chapterConfPath(packageId, chapterId));
}

/** 列包内章摘要 */
export async function listDiskChapterSummaries(
	packageId: string,
): Promise<DiskChapterSummary[]> {
	await ensurePackageReady(packageId);
	const packageConf = await readPackageConfForChapterOps(packageId);
	const out: DiskChapterSummary[] = [];
	for (const ref of packageConf.chapters) {
		const summary = await tryReadChapterSummary(packageId, ref.chapterId);
		if (summary) out.push(summary);
	}
	return out;
}

async function tryReadChapterSummary(
	packageId: string,
	chapterId: string,
): Promise<DiskChapterSummary | null> {
	try {
		const bundle = await readDiskChapterBundle(packageId, chapterId);
		const { conf, cards } = bundle;
		let lastEditedAt = "";
		try {
			const st = await stat(chapterDir(packageId, chapterId));
			lastEditedAt = st.mtime.toISOString();
		} catch {
			lastEditedAt = "";
		}
		return {
			chapterId,
			packageId,
			title: conf.title?.trim() ? conf.title : chapterId,
			cardCount: conf.cards.length,
			characterCount: listDerivedReferencedAgentIds({ conf, cards }).length,
			assetCount: conf.assetRefs?.length ?? 0,
			entryCardId: conf.entryCardId ?? "",
			lastEditedAt,
		};
	} catch {
		return null;
	}
}

/** 在已有包内新建章 */
export async function createDiskChapter(input: {
	packageId: string;
	chapterId: string;
	title: string;
	withStartCard?: boolean;
}): Promise<DiskChapterBundle> {
	const { packageId, chapterId } = input;
	if (!isValidPackageId(packageId) || !isValidChapterId(chapterId)) {
		packageFail("VALIDATION_FAILED", "invalid packageId or chapterId");
	}
	if (!(await packageConfExists(packageId))) {
		packageFail("NOT_FOUND", `package not found: ${packageId}`);
	}
	if (await chapterExists(packageId, chapterId)) {
		packageFail("CONFLICT", `chapter already exists: ${chapterId}`);
	}

	const title = input.title.trim() || chapterId;
	const cards: CallCardDefinition[] = [];
	let entryCardId: string | undefined;
	if (input.withStartCard !== false) {
		entryCardId = `card_${randomUUID().replace(/-/g, "").toLowerCase()}`;
		cards.push({
			cardId: entryCardId,
			cardKind: "story",
			title: "第一张通话卡",
			ownerAgentId: "",
			entryMode: "inbound_user_dial",
			interactionMode: "realtime_dialogue",
			context: { privateBrief: "", speakableBrief: "" },
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

	const packageConf = await readPackageConfForChapterOps(packageId);
	const nextPackageConf: PackageConf = {
		...packageConf,
		chapters: [...packageConf.chapters, { chapterId }],
	};
	await writeJson(packageConfPath(packageId), nextPackageConf);

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

/** 删章；至少保留一章 */
export async function deleteDiskChapter(
	packageId: string,
	chapterId: string,
): Promise<{ chapterId: string }> {
	if (!isValidPackageId(packageId) || !isValidChapterId(chapterId)) {
		packageFail("VALIDATION_FAILED", "invalid packageId or chapterId");
	}
	const packageConf = await readPackageConfForChapterOps(packageId);
	if (packageConf.chapters.length <= 1) {
		packageFail("VALIDATION_FAILED", "不能删除包的最后一章");
	}
	if (packageConf.entryChapterId === chapterId) {
		packageFail(
			"VALIDATION_FAILED",
			"不能删除入口章；请先设定其它章为入口",
		);
	}
	if (!(await chapterExists(packageId, chapterId))) {
		packageFail("NOT_FOUND", `chapter not found: ${chapterId}`);
	}

	await rm(chapterDir(packageId, chapterId), { recursive: true, force: true });
	const nextPackageConf: PackageConf = {
		...packageConf,
		chapters: packageConf.chapters.filter(function (c) {
			return c.chapterId !== chapterId;
		}),
	};
	await writeJson(packageConfPath(packageId), nextPackageConf);
	return { chapterId };
}

/** 扫描包内章 id（迁移后） */
export async function listDiskChapterIds(
	packageId: string,
): Promise<string[]> {
	await ensurePackageReady(packageId);
	return listChapterIds(packageDir(packageId));
}
