/**
	* 模块名称：本机 Content 按需读
	* 模块说明：路径仅本模块知道（storis-packages / characters / assets）。
	*/
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import {
	AssetMetaSchema,
	CallCardDefinitionSchema,
	FREE_CHAPTER_ID,
	SCHEDULE_CHAPTER_ID,
	engineError,
	type AssetMeta,
	type CallCardDefinition,
	type ChapterConf,
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
