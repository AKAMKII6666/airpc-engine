/**
	* 章 conf 软读：列表摘要用，单卡破损跳过。
	*/
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
	CallCardDefinitionSchema,
	type CallCardDefinition,
	type ChapterConf,
} from "@airpc/rpg-engine";
import {
	chapterCardsDir,
	chapterConfPath,
} from "@studio-v2/src/utils/server/packages/paths/packagesPaths.server";

function readOptionalString(
	raw: unknown,
	key: "title" | "entryCardId",
): string | undefined {
	if (!raw || typeof raw !== "object") return undefined;
	const value = (raw as Record<string, unknown>)[key];
	return typeof value === "string" ? value : undefined;
}

function readOptionalStringArray(
	raw: unknown,
	key: "assetRefs",
): string[] | undefined {
	if (!raw || typeof raw !== "object") return undefined;
	const value = (raw as Record<string, unknown>)[key];
	return Array.isArray(value) ? (value as string[]) : undefined;
}

function readCardRefs(raw: unknown): { cardId?: unknown }[] {
	if (!raw || typeof raw !== "object") return [];
	const cards = (raw as { cards?: unknown }).cards;
	return Array.isArray(cards) ? (cards as { cardId?: unknown }[]) : [];
}

async function tryLoadChapterCardsSoft(
	packageId: string,
	chapterId: string,
	cardRefs: readonly { cardId?: unknown }[],
): Promise<CallCardDefinition[]> {
	const cards: CallCardDefinition[] = [];
	for (const ref of cardRefs) {
		if (typeof ref.cardId !== "string" || ref.cardId.trim() === "") {
			continue;
		}
		const cardPath = path.join(
			chapterCardsDir(packageId, chapterId),
			`${ref.cardId}.s-card.json`,
		);
		try {
			const raw = JSON.parse(await readFile(cardPath, "utf8")) as unknown;
			const parsed = CallCardDefinitionSchema.safeParse(raw);
			if (parsed.success) cards.push(parsed.data);
		} catch {
			/* 列表摘要：单卡破损跳过 */
		}
	}
	return cards;
}

export async function tryReadChapterConfSoft(
	packageId: string,
	chapterId: string,
): Promise<(ChapterConf & { _cardsLoaded: CallCardDefinition[] }) | null> {
	try {
		const raw = JSON.parse(
			await readFile(chapterConfPath(packageId, chapterId), "utf8"),
		) as unknown;
		const resolvedId =
			raw &&
			typeof raw === "object" &&
			typeof (raw as { chapterId?: unknown }).chapterId === "string"
				? (raw as { chapterId: string }).chapterId
				: chapterId;
		const cardRefs = readCardRefs(raw);
		const cards = await tryLoadChapterCardsSoft(
			packageId,
			resolvedId,
			cardRefs,
		);
		return {
			schemaVersion: 1,
			chapterId: resolvedId,
			participants: [],
			cards: cardRefs
				.filter(function (r) {
					return typeof r.cardId === "string";
				})
				.map(function (r) {
					return { cardId: r.cardId as string };
				}),
			title: readOptionalString(raw, "title"),
			entryCardId: readOptionalString(raw, "entryCardId"),
			assetRefs: readOptionalStringArray(raw, "assetRefs"),
			_cardsLoaded: cards,
		};
	} catch {
		return null;
	}
}
