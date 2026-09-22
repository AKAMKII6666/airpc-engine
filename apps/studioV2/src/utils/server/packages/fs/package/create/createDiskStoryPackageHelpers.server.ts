/**
	* createDiskStoryPackage：校验 id 并组装默认章 + package.conf。
	*/
import type {
	CallCardDefinition,
	ChapterConf,
	PackageConf,
} from "@airpc/rpg-engine";
import {
	isValidChapterId,
	isValidPackageId,
	packageFail,
} from "../../../paths/packagesPaths.server";
import { buildDefaultStartCard } from "../../chapter/startCard/chapterStartCard.server";

export function resolveNewPackageIds(input: {
	packageId: string;
	entryChapterId?: string;
}): { packageId: string; chapterId: string } {
	const packageId = input.packageId.trim();
	if (!isValidPackageId(packageId)) {
		packageFail("VALIDATION_FAILED", "invalid packageId");
	}
	const chapterId = (input.entryChapterId?.trim() || packageId).slice(0, 64);
	if (!isValidChapterId(chapterId)) {
		packageFail("VALIDATION_FAILED", "invalid entryChapterId");
	}
	return { packageId, chapterId };
}

export function buildNewPackageChapterBundle(input: {
	packageId: string;
	chapterId: string;
	title: string;
	description?: string;
	withStartCard: boolean;
}): {
	chapterConf: ChapterConf;
	packageConf: PackageConf;
	cards: CallCardDefinition[];
	entryCardId?: string;
	title: string;
} {
	const title = input.title.trim() || input.packageId;
	const cards: CallCardDefinition[] = [];
	let entryCardId: string | undefined;
	if (input.withStartCard) {
		const start = buildDefaultStartCard(input.description?.trim() ?? "");
		entryCardId = start.cardId;
		cards.push(start);
	}

	const chapterConf: ChapterConf = {
		schemaVersion: 1,
		chapterId: input.chapterId,
		title,
		participants: [],
		cards: cards.map(function (c) {
			return { cardId: c.cardId };
		}),
		...(entryCardId ? { entryCardId } : {}),
	};

	const packageConf: PackageConf = {
		schemaVersion: 1,
		packageId: input.packageId,
		title,
		entryChapterId: input.chapterId,
		chapters: [{ chapterId: input.chapterId }],
	};

	return { chapterConf, packageConf, cards, entryCardId, title };
}
