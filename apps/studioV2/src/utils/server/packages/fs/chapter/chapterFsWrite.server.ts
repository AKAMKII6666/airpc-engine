/**
	* 故事包单章磁盘写。
	*/
import { mkdir, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import {
	CallCardDefinitionSchema,
	ChapterConfSchema,
	normalizeCallCardToolPolicy,
	type CallCardDefinition,
	type ChapterConf,
	type PackageConf,
} from "@airpc/rpg-engine";
import {
	deriveLayoutLanes,
	listDerivedReferencedAgentIds,
	omitParticipantsForDiskWrite,
} from "@studio-v2/src/utils/server/packages/conf/referencedAgentsDerive.server";
import { buildDefaultCanvasLayout } from "../../layout/defaultCanvasLayout.server";
import {
	chapterCardsDir,
	chapterLayoutPath,
	packageConfPath,
	packageFail,
} from "../../paths/packagesPaths.server";
import type {
	DiskChapterBundle,
	DiskStoryPackageBundle,
	StudioCanvasLayout,
} from "@studio-v2/src/utils/server/types/diskStoryPackage.server";
import {
	ensurePackageReady,
	parsePackageConfOrFail,
	writeJson,
} from "../package/packageFsShared.server";
import {
	assertChapterBundleShape,
	assertConfCardsPresent,
	assertValidChapterIds,
	writeChapterCardsAndPrune,
} from "./chapterFsWriteSteps.server";

export function parseChapterConfOrFail(
	chapterId: string,
	raw: unknown,
): ChapterConf {
	const parsed = ChapterConfSchema.safeParse(raw);
	if (!parsed.success) {
		packageFail("VALIDATION_FAILED", `story.conf.json invalid: ${chapterId}`);
	}
	const conf = parsed.data;
	const resolvedId = conf.chapterId ?? chapterId;
	if (resolvedId !== chapterId) {
		packageFail(
			"VALIDATION_FAILED",
			`conf.chapterId mismatch: ${resolvedId} vs ${chapterId}`,
		);
	}
	if (conf.schemaVersion !== 1) {
		packageFail(
			"SCHEMA_UNSUPPORTED",
			`chapter ${chapterId} schemaVersion ${conf.schemaVersion} unsupported`,
		);
	}
	return { ...conf, chapterId: resolvedId };
}

export function normalizeLayoutChapterId(
	layout: StudioCanvasLayout,
	chapterId: string,
): StudioCanvasLayout {
	const nodes = layout.nodes.map(function (n) {
		const nextChapterId =
			n.nextChapterId ?? n.nextPackageId ?? undefined;
		const { nextPackageId: _legacy, ...rest } = n;
		return nextChapterId
			? { ...rest, nextChapterId }
			: rest;
	});
	return {
		...layout,
		chapterId: layout.chapterId ?? layout.packageId ?? chapterId,
		packageId: undefined,
		nodes,
	};
}

async function readPackageConfForWrite(
	packageId: string,
): Promise<PackageConf> {
	await ensurePackageReady(packageId);
	try {
		const raw = JSON.parse(
			await readFile(packageConfPath(packageId), "utf8"),
		);
		return parsePackageConfOrFail(packageId, raw);
	} catch (err) {
		if (err && typeof err === "object" && "code" in err) {
			const code = String((err as { code: string }).code);
			if (code !== "ENOENT") throw err;
		}
		packageFail("NOT_FOUND", `package not found: ${packageId}`);
	}
}

async function ensurePackageConfForWrite(
	packageId: string,
	chapterId: string,
	title?: string,
): Promise<PackageConf> {
	try {
		return await readPackageConfForWrite(packageId);
	} catch (err) {
		if (
			!(err && typeof err === "object" && "code" in err) ||
			(err as { code: string }).code !== "NOT_FOUND"
		) {
			throw err;
		}
		const packageConf: PackageConf = {
			schemaVersion: 1,
			packageId,
			title: title?.trim() ? title : packageId,
			entryChapterId: chapterId,
			chapters: [{ chapterId }],
		};
		await mkdir(path.dirname(packageConfPath(packageId)), {
			recursive: true,
		});
		await writeJson(packageConfPath(packageId), packageConf);
		return packageConf;
	}
}

async function listCardIdsOnDisk(
	packageId: string,
	chapterId: string,
): Promise<string[]> {
	try {
		const names = await readdir(chapterCardsDir(packageId, chapterId));
		return names
			.filter(function (n) {
				return n.endsWith(".s-card.json");
			})
			.map(function (n) {
				return n.slice(0, -".s-card.json".length);
			});
	} catch {
		return [];
	}
}

function parseCardsPayload(
	rawCards: unknown[],
): Map<string, CallCardDefinition> {
	const byId = new Map<string, CallCardDefinition>();
	for (const raw of rawCards) {
		const parsed = CallCardDefinitionSchema.safeParse(raw);
		if (!parsed.success) {
			packageFail("VALIDATION_FAILED", "one or more cards invalid");
		}
		const normalized = normalizeCallCardToolPolicy(parsed.data);
		byId.set(normalized.cardId, normalized);
	}
	return byId;
}

function resolveWriteLayout(
	chapterId: string,
	conf: ChapterConf,
	cards: CallCardDefinition[],
	layoutRaw: unknown | null | undefined,
): StudioCanvasLayout {
	if (layoutRaw && typeof layoutRaw === "object") {
		const layoutObj = normalizeLayoutChapterId(
			layoutRaw as StudioCanvasLayout,
			chapterId,
		);
		if (!Array.isArray(layoutObj.nodes)) {
			packageFail("VALIDATION_FAILED", "layout.nodes array required");
		}
		const lanes =
			layoutObj.lanes && layoutObj.lanes.length > 0
				? layoutObj.lanes
				: deriveLayoutLanes({ conf, cards });
		return {
			...layoutObj,
			lanes,
			schemaVersion:
				typeof layoutObj.schemaVersion === "number"
					? layoutObj.schemaVersion
					: 1,
			chapterId,
		};
	}
	return buildDefaultCanvasLayout(
		chapterId,
		conf.cards.map(function (c) {
			return c.cardId;
		}),
		listDerivedReferencedAgentIds({ conf, cards }),
	);
}

function chapterConfForDiskWrite(conf: ChapterConf): Record<string, unknown> {
	const base = omitParticipantsForDiskWrite(
		conf as Parameters<typeof omitParticipantsForDiskWrite>[0],
	) as Record<string, unknown>;
	delete base.packageId;
	return { ...base, chapterId: conf.chapterId };
}

/** 写单章 bundle */
export async function writeDiskChapterBundle(
	packageId: string,
	chapterId: string,
	bundle: {
		conf: unknown;
		cards: unknown[];
		layout?: unknown | null;
	},
): Promise<DiskChapterBundle> {
	assertValidChapterIds(packageId, chapterId);
	await ensurePackageReady(packageId);
	assertChapterBundleShape(bundle);

	const conf = parseChapterConfOrFail(chapterId, {
		...(bundle.conf as object),
		chapterId,
	});
	const byId = parseCardsPayload(bundle.cards);
	assertConfCardsPresent(conf, byId);

	const ordered = conf.cards.map(function (ref) {
		return byId.get(ref.cardId)!;
	});
	const layout = resolveWriteLayout(chapterId, conf, ordered, bundle.layout);
	await writeChapterCardsAndPrune({
		packageId,
		chapterId,
		conf,
		byId,
		confForDisk: chapterConfForDiskWrite(conf),
		listCardIdsOnDisk,
	});

	await writeJson(chapterLayoutPath(packageId, chapterId), layout);
	return { conf, cards: ordered, layout };
}

/** 兼容旧名：写入口章 */
export async function writeDiskStoryPackage(
	packageId: string,
	bundle: {
		conf: unknown;
		cards: unknown[];
		layout?: unknown | null;
	},
): Promise<DiskStoryPackageBundle> {
	const confRaw = bundle.conf as {
		chapterId?: string;
		packageId?: string;
		title?: string;
	};
	const chapterId =
		confRaw.chapterId ?? confRaw.packageId ?? packageId;
	await ensurePackageConfForWrite(
		packageId,
		chapterId,
		confRaw.title,
	);
	return writeDiskChapterBundle(packageId, chapterId, bundle);
}
