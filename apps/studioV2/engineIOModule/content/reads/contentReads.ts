/**
	* 模块名称：本机 Content 按需读
	* 模块说明：路径仅本模块知道（storis-packages / characters / assets）。
	*/
import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import {
	AssetMetaSchema,
	CallCardDefinitionSchema,
	CharacterDefSchema,
	ChapterConfSchema,
	FREE_CHAPTER_ID,
	SCHEDULE_CHAPTER_ID,
	engineError,
	type AssetMeta,
	type CallCardDefinition,
	type CharacterDef,
	type ChapterConf,
	type PackageValidateBundle,
} from "@airpc/rpg-engine";
import { findChapterDir } from "../snapshot/workspaceSnapshot";

async function readJsonFile(filePath: string): Promise<unknown> {
	const text = await readFile(filePath, "utf8");
	return JSON.parse(text) as unknown;
}

function parseCardOrThrow(raw: unknown, label: string): CallCardDefinition {
	try {
		return CallCardDefinitionSchema.parse(raw);
	} catch (err) {
		throw engineError("VALIDATION_FAILED", `${label} parse failed`, err);
	}
}

export async function readCardFromFs(input: {
	workspaceKey: string;
	chapterId: string;
	cardId: string;
}): Promise<CallCardDefinition | null> {
	const { workspaceKey, chapterId, cardId } = input;
	if (chapterId === FREE_CHAPTER_ID) {
		return readSideCard(workspaceKey, "free-cards", cardId);
	}
	if (chapterId === SCHEDULE_CHAPTER_ID) {
		return readSideCard(workspaceKey, "schedule-cards", cardId);
	}
	const found = await findChapterDir(workspaceKey, chapterId);
	if (!found) {
		return null;
	}
	const cardPath = path.join(found.dir, "cards", `${cardId}.s-card.json`);
	try {
		const raw = await readJsonFile(cardPath);
		return parseCardOrThrow(raw, `card ${chapterId}/${cardId}`);
	} catch (err) {
		if (
			typeof err === "object" &&
			err !== null &&
			"code" in err &&
			(err as { code?: string }).code === "VALIDATION_FAILED"
		) {
			throw err;
		}
		return null;
	}
}

async function readSideCard(
	workspaceKey: string,
	subdir: "free-cards" | "schedule-cards",
	cardId: string,
): Promise<CallCardDefinition | null> {
	const dir = path.join(workspaceKey, "characters", subdir);
	const candidates = [
		path.join(dir, `${cardId}.s-card.json`),
		path.join(dir, `${cardId}.json`),
	];
	for (const cardPath of candidates) {
		try {
			const raw = await readJsonFile(cardPath);
			return parseCardOrThrow(raw, `${subdir}/${cardId}`);
		} catch (err) {
			if (
				typeof err === "object" &&
				err !== null &&
				"code" in err &&
				(err as { code?: string }).code === "VALIDATION_FAILED"
			) {
				throw err;
			}
		}
	}
	return null;
}

export async function readChapterConfFromFs(input: {
	workspaceKey: string;
	chapterId: string;
}): Promise<ChapterConf | null> {
	const found = await findChapterDir(input.workspaceKey, input.chapterId);
	return found?.conf ?? null;
}

function assetMetaPath(workspaceKey: string, assetId: string): string {
	return path.join(workspaceKey, "assets", "meta", `${assetId}.json`);
}

export async function assetMetaExistsFromFs(input: {
	workspaceKey: string;
	assetId: string;
}): Promise<boolean> {
	try {
		await access(assetMetaPath(input.workspaceKey, input.assetId));
		return true;
	} catch {
		return false;
	}
}

export async function readAssetMetaFromFs(input: {
	workspaceKey: string;
	assetId: string;
}): Promise<AssetMeta | null> {
	try {
		const raw = await readJsonFile(
			assetMetaPath(input.workspaceKey, input.assetId),
		);
		const parsed = AssetMetaSchema.safeParse(raw);
		return parsed.success ? parsed.data : null;
	} catch {
		return null;
	}
}

export async function assetUriExistsFromFs(input: {
	workspaceKey: string;
	uri: string;
}): Promise<boolean> {
	const uriRel = input.uri.replace(/^\.?\//, "");
	if (
		uriRel.includes("..") ||
		path.isAbsolute(uriRel) ||
		uriRel.startsWith("~")
	) {
		return false;
	}
	try {
		await access(path.join(input.workspaceKey, "assets", uriRel));
		return true;
	} catch {
		return false;
	}
}

async function loadAllCharacters(
	workspaceKey: string,
): Promise<CharacterDef[]> {
	const charactersRoot = path.join(workspaceKey, "characters");
	let charFiles: string[] = [];
	try {
		charFiles = await readdir(charactersRoot);
	} catch {
		return [];
	}
	const out: CharacterDef[] = [];
	for (const name of charFiles) {
		if (!name.endsWith(".json")) continue;
		try {
			const raw = await readJsonFile(path.join(charactersRoot, name));
			out.push(CharacterDefSchema.parse(raw));
		} catch {
			// validate 规则侧再报
		}
	}
	return out;
}

export async function loadPackageForValidateFromFs(input: {
	workspaceKey: string;
	chapterId: string;
}): Promise<PackageValidateBundle> {
	const { workspaceKey, chapterId } = input;
	const characters = await loadAllCharacters(workspaceKey);
	const found = await findChapterDir(workspaceKey, chapterId);

	if (!found) {
		return {
			chapterId,
			conf: null,
			confRaw: null,
			cards: [],
			diskCardIds: [],
			characters,
		};
	}

	const confPath = path.join(found.dir, "story.conf.json");
	let confRaw: unknown | null = null;
	try {
		confRaw = await readJsonFile(confPath);
	} catch {
		return {
			chapterId,
			containerPackageId: found.containerPackageId,
			conf: null,
			confRaw: null,
			cards: [],
			diskCardIds: [],
			characters,
		};
	}

	const confParsed = ChapterConfSchema.safeParse(confRaw);
	const conf = confParsed.success ? confParsed.data : null;

	let diskCardIds: string[] = [];
	try {
		const diskFiles = await readdir(path.join(found.dir, "cards"));
		diskCardIds = diskFiles
			.filter((f) => f.endsWith(".s-card.json"))
			.map((f) => f.replace(/\.s-card\.json$/, ""));
	} catch {
		diskCardIds = [];
	}

	const cards: PackageValidateBundle["cards"] = [];
	const indexedIds = conf?.cards.map((c) => c.cardId) ?? [];
	for (const cardId of indexedIds) {
		const cardPath = path.join(found.dir, "cards", `${cardId}.s-card.json`);
		try {
			const cardRaw = await readJsonFile(cardPath);
			const parsed = CallCardDefinitionSchema.safeParse(cardRaw);
			cards.push({
				cardId,
				card: parsed.success ? parsed.data : null,
				cardRaw,
			});
		} catch {
			cards.push({ cardId, card: null, cardRaw: null });
		}
	}

	return {
		chapterId,
		containerPackageId: found.containerPackageId,
		conf,
		confRaw,
		cards,
		diskCardIds,
		characters,
	};
}
