/**
	* 故事包整包读 / 整包写（conf + cards + layout）。
	* 仅 Next API 门面调用；禁止 client 直引。
	*/
import { mkdir, readdir, readFile, rm, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import {
	CallCardDefinitionSchema,
	StoryPackageConfSchema,
	type CallCardDefinition,
	type StoryPackageConf,
} from "@airpc/rpg-engine";
import {
	deriveLayoutLanes,
	listDerivedReferencedAgentIds,
	omitParticipantsForDiskWrite,
} from "@studio-v2/src/utils/server/packages/conf/referencedAgentsDerive.server";
import { listDiskStoryPackages } from "@studio-v2/src/utils/server/packages/list/packagesList.server";
import { readWorkspaceConfig } from "@studio-v2/src/utils/server/workspace/workspaceFs.server";
import { buildDefaultCanvasLayout } from "../layout/defaultCanvasLayout.server";
import {
	isValidPackageId,
	packageDir,
	packageFail,
	pathExists,
} from "../paths/packagesPaths.server";
import type {
	DiskStoryPackageBundle,
	StudioCanvasLayout,
} from "@studio-v2/src/utils/server/types/diskStoryPackage.server";

async function readConfRaw(packageId: string): Promise<unknown> {
	if (!isValidPackageId(packageId)) {
		packageFail("VALIDATION_FAILED", "invalid packageId");
	}
	const confPath = path.join(packageDir(packageId), "story.conf.json");
	try {
		return JSON.parse(await readFile(confPath, "utf8"));
	} catch {
		packageFail("NOT_FOUND", `package not found: ${packageId}`);
	}
}

async function readCardFile(
	packageId: string,
	cardId: string,
): Promise<unknown> {
	const cardPath = path.join(
		packageDir(packageId),
		"cards",
		`${cardId}.s-card.json`,
	);
	try {
		return JSON.parse(await readFile(cardPath, "utf8"));
	} catch {
		packageFail("NOT_FOUND", `card not found: ${packageId}/${cardId}`);
	}
}

async function readLayoutFile(
	packageId: string,
): Promise<StudioCanvasLayout | null> {
	const layoutPath = path.join(packageDir(packageId), "canvas.layout.json");
	try {
		const raw = JSON.parse(await readFile(layoutPath, "utf8")) as unknown;
		if (!raw || typeof raw !== "object") return null;
		const obj = raw as StudioCanvasLayout;
		if (!Array.isArray(obj.nodes)) return null;
		return obj;
	} catch {
		return null;
	}
}

function parseConfOrFail(
	packageId: string,
	confRaw: unknown,
): StoryPackageConf {
	const confParsed = StoryPackageConfSchema.safeParse(confRaw);
	if (!confParsed.success) {
		packageFail(
			"VALIDATION_FAILED",
			`story.conf.json invalid: ${packageId}`,
		);
	}
	const conf = confParsed.data;
	if (conf.schemaVersion !== 1) {
		packageFail(
			"SCHEMA_UNSUPPORTED",
			`package ${packageId} schemaVersion ${conf.schemaVersion} unsupported`,
		);
	}
	if (conf.packageId !== packageId) {
		packageFail(
			"VALIDATION_FAILED",
			`conf.packageId mismatch: ${conf.packageId} vs ${packageId}`,
		);
	}
	return conf;
}

async function loadCardsInConfOrder(
	packageId: string,
	conf: StoryPackageConf,
): Promise<CallCardDefinition[]> {
	const cards: CallCardDefinition[] = [];
	for (const ref of conf.cards) {
		const cardRaw = await readCardFile(packageId, ref.cardId);
		const cardParsed = CallCardDefinitionSchema.safeParse(cardRaw);
		if (!cardParsed.success) {
			packageFail(
				"VALIDATION_FAILED",
				`card invalid: ${packageId}/${ref.cardId}`,
			);
		}
		if (cardParsed.data.cardId !== ref.cardId) {
			packageFail(
				"VALIDATION_FAILED",
				`cardId mismatch in file: ${ref.cardId}`,
			);
		}
		cards.push(cardParsed.data);
	}
	return cards;
}

/**
	* 读整包：conf + cards[] + layout；无 layout 时填安全默认坐标。
	*/
export async function readDiskStoryPackage(
	packageId: string,
): Promise<DiskStoryPackageBundle> {
	const conf = parseConfOrFail(packageId, await readConfRaw(packageId));
	const cards = await loadCardsInConfOrder(packageId, conf);
	const diskLayout = await readLayoutFile(packageId);
	const layout =
		diskLayout ??
		buildDefaultCanvasLayout(
			packageId,
			conf.cards.map(function (c) {
				return c.cardId;
			}),
			listDerivedReferencedAgentIds({ conf, cards }),
		);
	return { conf, cards, layout };
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
	await mkdir(path.dirname(filePath), { recursive: true });
	const text = JSON.stringify(value, null, 2) + "\n";
	await writeFile(filePath, text, "utf8");
}

async function listCardIdsOnDisk(packageId: string): Promise<string[]> {
	const cardsDir = path.join(packageDir(packageId), "cards");
	try {
		const names = await readdir(cardsDir);
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
		byId.set(parsed.data.cardId, parsed.data);
	}
	return byId;
}

function resolveWriteLayout(
	packageId: string,
	conf: StoryPackageConf,
	cards: CallCardDefinition[],
	layoutRaw: unknown | null | undefined,
): StudioCanvasLayout {
	if (layoutRaw && typeof layoutRaw === "object") {
		const layoutObj = layoutRaw as StudioCanvasLayout;
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
			packageId,
		};
	}
	return buildDefaultCanvasLayout(
		packageId,
		conf.cards.map(function (c) {
			return c.cardId;
		}),
		listDerivedReferencedAgentIds({ conf, cards }),
	);
}

/**
	* 整包写回：覆盖 conf、全量卡、layout；删除 conf 未引用的卡文件。
	*/
export async function writeDiskStoryPackage(
	packageId: string,
	bundle: {
		conf: unknown;
		cards: unknown[];
		layout?: unknown | null;
	},
): Promise<DiskStoryPackageBundle> {
	if (!isValidPackageId(packageId)) {
		packageFail("VALIDATION_FAILED", "invalid packageId");
	}
	if (!bundle.conf || typeof bundle.conf !== "object") {
		packageFail("VALIDATION_FAILED", "conf object required");
	}
	if (!Array.isArray(bundle.cards)) {
		packageFail("VALIDATION_FAILED", "cards array required");
	}

	const conf = parseConfOrFail(packageId, {
		...(bundle.conf as object),
		packageId,
	});
	const byId = parseCardsPayload(bundle.cards);
	for (const ref of conf.cards) {
		if (!byId.has(ref.cardId)) {
			packageFail(
				"VALIDATION_FAILED",
				`cards missing definition for conf cardId: ${ref.cardId}`,
			);
		}
	}

	const ordered = conf.cards.map(function (ref) {
		return byId.get(ref.cardId)!;
	});
	const layout = resolveWriteLayout(packageId, conf, ordered, bundle.layout);
	const dir = packageDir(packageId);
	await mkdir(path.join(dir, "cards"), { recursive: true });
	/** 路径 B：磁盘不写 participants 白名单键 */
	await writeJson(
		path.join(dir, "story.conf.json"),
		omitParticipantsForDiskWrite(conf),
	);

	const keep = new Set(
		conf.cards.map(function (c) {
			return c.cardId;
		}),
	);
	for (const cardId of keep) {
		const card = byId.get(cardId);
		if (!card) continue;
		await writeJson(path.join(dir, "cards", `${cardId}.s-card.json`), card);
	}

	const onDisk = await listCardIdsOnDisk(packageId);
	for (const orphan of onDisk) {
		if (keep.has(orphan)) continue;
		await unlink(path.join(dir, "cards", `${orphan}.s-card.json`));
	}

	await writeJson(path.join(dir, "canvas.layout.json"), layout);
	return { conf, cards: ordered, layout };
}

/** 包目录是否已有 story.conf.json（未校验 schema） */
export async function packageExists(packageId: string): Promise<boolean> {
	if (!isValidPackageId(packageId)) return false;
	return pathExists(path.join(packageDir(packageId), "story.conf.json"));
}

/**
	* 新建最小故事包：conf（可无 participants）+ 可选默认入口卡 + layout。
	* 目录已存在则 CONFLICT；不接会话 mock。
	*/
export async function createDiskStoryPackage(input: {
	packageId: string;
	title: string;
	description?: string;
	/** true 时写一张空 owner 起点卡并设 entryCardId */
	withStartCard: boolean;
}): Promise<DiskStoryPackageBundle> {
	const packageId = input.packageId.trim();
	if (!isValidPackageId(packageId)) {
		packageFail("VALIDATION_FAILED", "invalid packageId");
	}
	if (await packageExists(packageId)) {
		packageFail("CONFLICT", `package already exists: ${packageId}`);
	}

	const title = input.title.trim() || packageId;
	const cards: CallCardDefinition[] = [];
	let entryCardId: string | undefined;
	if (input.withStartCard) {
		entryCardId = `card_${packageId}_start`;
		cards.push({
			cardId: entryCardId,
			cardKind: "story",
			title: "起点卡",
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

	const conf: StoryPackageConf = {
		schemaVersion: 1,
		packageId,
		title,
		participants: [],
		cards: cards.map(function (c) {
			return { cardId: c.cardId };
		}),
		...(entryCardId ? { entryCardId } : {}),
	};

	return writeDiskStoryPackage(packageId, {
		conf,
		cards,
		layout: buildDefaultCanvasLayout(
			packageId,
			conf.cards.map(function (c) {
				return c.cardId;
			}),
			[],
		),
	});
}

/**
	* 删除故事包目录（递归）。
	* 拒删：不存在 / 当前首故事 / 工作区仅剩一包（须保留首故事）。
	*/
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
