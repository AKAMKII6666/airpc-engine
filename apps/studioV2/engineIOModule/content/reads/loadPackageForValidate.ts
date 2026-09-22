/**
	* 模块名称：本机 Content validate 装载
	* 模块说明：从 contentReads 拆出，压低单函数有效行。
	*/
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import {
	CallCardDefinitionSchema,
	ChapterConfSchema,
	CharacterDefSchema,
	type CharacterDef,
	type PackageValidateBundle,
} from "@airpc/rpg-engine";
import { findChapterDir } from "../snapshot/workspaceSnapshot";

async function readJsonFile(filePath: string): Promise<unknown> {
	const text = await readFile(filePath, "utf8");
	return JSON.parse(text) as unknown;
}

async function loadAllCharacters(workspaceKey: string): Promise<CharacterDef[]> {
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

async function listDiskCardIds(cardsDir: string): Promise<string[]> {
	try {
		const diskFiles = await readdir(cardsDir);
		return diskFiles
			.filter((f) => f.endsWith(".s-card.json"))
			.map((f) => f.replace(/\.s-card\.json$/, ""));
	} catch {
		return [];
	}
}

async function loadIndexedCards(
	cardsDir: string,
	indexedIds: string[],
): Promise<PackageValidateBundle["cards"]> {
	const cards: PackageValidateBundle["cards"] = [];
	for (const cardId of indexedIds) {
		const cardPath = path.join(cardsDir, `${cardId}.s-card.json`);
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
	return cards;
}

function emptyBundle(
	chapterId: string,
	characters: CharacterDef[],
	containerPackageId?: string,
): PackageValidateBundle {
	const base: PackageValidateBundle = {
		chapterId,
		conf: null,
		confRaw: null,
		cards: [],
		diskCardIds: [],
		characters,
	};
	if (containerPackageId !== undefined) {
		base.containerPackageId = containerPackageId;
	}
	return base;
}

/** 按章装载 validate 所需 conf / cards / characters。 */
export async function loadPackageForValidateFromFs(input: {
	workspaceKey: string;
	chapterId: string;
}): Promise<PackageValidateBundle> {
	const { workspaceKey, chapterId } = input;
	const characters = await loadAllCharacters(workspaceKey);
	const found = await findChapterDir(workspaceKey, chapterId);
	if (!found) {
		return emptyBundle(chapterId, characters);
	}

	const confPath = path.join(found.dir, "story.conf.json");
	let confRaw: unknown | null = null;
	try {
		confRaw = await readJsonFile(confPath);
	} catch {
		return emptyBundle(chapterId, characters, found.containerPackageId);
	}

	const confParsed = ChapterConfSchema.safeParse(confRaw);
	const conf = confParsed.success ? confParsed.data : null;
	const cardsDir = path.join(found.dir, "cards");
	const diskCardIds = await listDiskCardIds(cardsDir);
	const indexedIds = conf?.cards.map((c) => c.cardId) ?? [];
	const cards = await loadIndexedCards(cardsDir, indexedIds);

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
