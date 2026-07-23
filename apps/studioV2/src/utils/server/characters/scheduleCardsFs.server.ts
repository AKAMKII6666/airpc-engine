/**
	* 角色日常 ScheduleCard 读写：data/characters/schedule-cards/<cardId>.s-card.json。
	* 与故事包内 cardKind=schedule 剧情节点分工；仅 Next API 门面调用，禁止 client 直引。
	* 口径见需求 01 §8.1 / 技术设计 19 §3.4。
	*/
import {
	access,
	mkdir,
	readdir,
	readFile,
	writeFile,
} from "node:fs/promises";
import path from "node:path";
import { getStudioV2DataRoot } from "../data/dataRoot.server";

/** cardId：小写开头，允许数字 / _ / - */
const CARD_ID_RE = /^[a-z][a-z0-9_-]{0,63}$/;

export function isValidScheduleCardId(cardId: string): boolean {
	return CARD_ID_RE.test(cardId);
}

function scheduleCardsRoot(): string {
	return path.join(getStudioV2DataRoot(), "characters", "schedule-cards");
}

function scheduleCardPath(cardId: string): string {
	return path.join(scheduleCardsRoot(), `${cardId}.s-card.json`);
}

async function pathExists(p: string): Promise<boolean> {
	try {
		await access(p);
		return true;
	} catch {
		return false;
	}
}

/**
	* 列出 schedule-cards 目录下的 cardId（跳过破损文件名）。
	*/
export async function listScheduleCardIds(): Promise<string[]> {
	const root = scheduleCardsRoot();
	if (!(await pathExists(root))) {
		return [];
	}
	const names = await readdir(root);
	const out: string[] = [];
	for (const name of names) {
		if (!name.endsWith(".s-card.json")) continue;
		const cardId = name.slice(0, -".s-card.json".length);
		if (!isValidScheduleCardId(cardId)) continue;
		out.push(cardId);
	}
	return out.sort(function (a, b) {
		return a.localeCompare(b);
	});
}

export async function scheduleCardExists(cardId: string): Promise<boolean> {
	if (!isValidScheduleCardId(cardId)) return false;
	return pathExists(scheduleCardPath(cardId));
}

export async function readScheduleCardJson(cardId: string): Promise<unknown> {
	if (!isValidScheduleCardId(cardId)) {
		throw Object.assign(new Error("invalid schedule cardId"), {
			code: "VALIDATION_FAILED",
		});
	}
	const text = await readFile(scheduleCardPath(cardId), "utf8");
	return JSON.parse(text) as unknown;
}

/**
	* 写入日常 ScheduleCard；调用方须已用 CallCardDefinitionSchema 校验且 cardKind=schedule。
	*/
export async function writeScheduleCardJson(
	cardId: string,
	body: unknown,
): Promise<void> {
	if (!isValidScheduleCardId(cardId)) {
		throw Object.assign(new Error("invalid schedule cardId"), {
			code: "VALIDATION_FAILED",
		});
	}
	const root = scheduleCardsRoot();
	await mkdir(root, { recursive: true });
	await writeFile(
		scheduleCardPath(cardId),
		JSON.stringify(body, null, 2) + "\n",
		"utf8",
	);
}
