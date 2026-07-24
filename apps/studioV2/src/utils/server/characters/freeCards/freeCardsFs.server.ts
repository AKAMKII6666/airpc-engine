/**
	* FreeCallCard 读写：data/characters/free-cards/<cardId>.s-card.json。
	* 仅 Next API 门面调用；禁止 client 直引。口径见需求 01 §7 / 11 §4。
	*/
import {
	access,
	mkdir,
	readdir,
	readFile,
	unlink,
	writeFile,
} from "node:fs/promises";
import path from "node:path";
import { getStudioV2DataRoot } from "../../data/dataRoot.server";

/** cardId：小写开头，允许数字 / _ / - */
const CARD_ID_RE = /^[a-z][a-z0-9_-]{0,63}$/;

export function isValidFreeCardId(cardId: string): boolean {
	return CARD_ID_RE.test(cardId);
}

function freeCardsRoot(): string {
	return path.join(getStudioV2DataRoot(), "characters", "free-cards");
}

function freeCardPath(cardId: string): string {
	return path.join(freeCardsRoot(), `${cardId}.s-card.json`);
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
	* 列出 free-cards 目录下的 cardId（跳过破损文件名）。
	*/
export async function listFreeCardIds(): Promise<string[]> {
	const root = freeCardsRoot();
	if (!(await pathExists(root))) {
		return [];
	}
	const names = await readdir(root);
	const out: string[] = [];
	for (const name of names) {
		if (!name.endsWith(".s-card.json")) continue;
		const cardId = name.slice(0, -".s-card.json".length);
		if (!isValidFreeCardId(cardId)) continue;
		out.push(cardId);
	}
	return out.sort(function (a, b) {
		return a.localeCompare(b);
	});
}

export async function freeCardExists(cardId: string): Promise<boolean> {
	if (!isValidFreeCardId(cardId)) return false;
	return pathExists(freeCardPath(cardId));
}

export async function readFreeCardJson(cardId: string): Promise<unknown> {
	if (!isValidFreeCardId(cardId)) {
		throw Object.assign(new Error("invalid free cardId"), {
			code: "VALIDATION_FAILED",
		});
	}
	try {
		const text = await readFile(freeCardPath(cardId), "utf8");
		return JSON.parse(text) as unknown;
	} catch {
		throw Object.assign(new Error(`free card not found: ${cardId}`), {
			code: "NOT_FOUND",
		});
	}
}

/**
	* 写入 FreeCallCard；调用方须已校验 cardKind=free，且 exits 强制为空。
	*/
export async function writeFreeCardJson(
	cardId: string,
	body: unknown,
): Promise<void> {
	if (!isValidFreeCardId(cardId)) {
		throw Object.assign(new Error("invalid free cardId"), {
			code: "VALIDATION_FAILED",
		});
	}
	const root = freeCardsRoot();
	await mkdir(root, { recursive: true });
	await writeFile(
		freeCardPath(cardId),
		JSON.stringify(body, null, 2) + "\n",
		"utf8",
	);
}

/**
	* 删除 Free 卡文件；文件不存在时静默成功（删除角色时幂等）。
	*/
export async function deleteFreeCardJson(cardId: string): Promise<void> {
	if (!isValidFreeCardId(cardId)) {
		throw Object.assign(new Error("invalid free cardId"), {
			code: "VALIDATION_FAILED",
		});
	}
	if (!(await pathExists(freeCardPath(cardId)))) {
		return;
	}
	await unlink(freeCardPath(cardId));
}

/**
	* 新建角色用的默认 Free 卡骨架；exits 恒空，toolPolicy 默认 inherit_free。
	*/
export function buildDefaultFreeCardJson(input: {
	freeCardId: string;
	agentId: string;
	displayName: string;
}): Record<string, unknown> {
	const titleBase = input.displayName.trim() || input.agentId;
	return {
		cardId: input.freeCardId,
		cardKind: "free",
		title: `${titleBase}·自由通话`,
		ownerAgentId: input.agentId,
		entryMode: "either",
		interactionMode: "realtime_dialogue",
		context: {
			privateBrief: "自由闲聊；无强制剧情目标。",
			speakableBrief: "随便聊聊。",
			background: "",
			premise: "",
			emotion: "",
			objective: "自然陪伴闲聊",
			forbidden: [],
		},
		objectives: { requiredBeats: [] },
		toolPolicy: { mode: "inherit_free" },
		exits: [],
	};
}
