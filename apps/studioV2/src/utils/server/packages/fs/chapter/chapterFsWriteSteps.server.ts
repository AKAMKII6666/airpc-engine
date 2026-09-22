/**
	* writeDiskChapterBundle 的校验与卡文件落盘子步骤。
	*/
import { mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import type { CallCardDefinition, ChapterConf } from "@airpc/rpg-engine";
import {
	chapterCardsDir,
	chapterConfPath,
	isValidChapterId,
	isValidPackageId,
	packageFail,
} from "../../paths/packagesPaths.server";
import { writeJson } from "../package/packageFsShared.server";

export function assertValidChapterIds(
	packageId: string,
	chapterId: string,
): void {
	if (!isValidPackageId(packageId) || !isValidChapterId(chapterId)) {
		packageFail("VALIDATION_FAILED", "invalid packageId or chapterId");
	}
}

export function assertChapterBundleShape(bundle: {
	conf: unknown;
	cards: unknown[];
}): void {
	if (!bundle.conf || typeof bundle.conf !== "object") {
		packageFail("VALIDATION_FAILED", "conf object required");
	}
	if (!Array.isArray(bundle.cards)) {
		packageFail("VALIDATION_FAILED", "cards array required");
	}
}

export function assertConfCardsPresent(
	conf: ChapterConf,
	byId: Map<string, CallCardDefinition>,
): void {
	for (const ref of conf.cards) {
		if (!byId.has(ref.cardId)) {
			packageFail(
				"VALIDATION_FAILED",
				`cards missing definition for conf cardId: ${ref.cardId}`,
			);
		}
	}
}

export async function writeChapterCardsAndPrune(input: {
	packageId: string;
	chapterId: string;
	conf: ChapterConf;
	byId: Map<string, CallCardDefinition>;
	confForDisk: Record<string, unknown>;
	listCardIdsOnDisk: (
		packageId: string,
		chapterId: string,
	) => Promise<string[]>;
}): Promise<void> {
	const cardsDir = chapterCardsDir(input.packageId, input.chapterId);
	await mkdir(cardsDir, { recursive: true });
	await writeJson(
		chapterConfPath(input.packageId, input.chapterId),
		input.confForDisk,
	);

	const keep = new Set(
		input.conf.cards.map(function (c) {
			return c.cardId;
		}),
	);
	for (const cardId of keep) {
		const card = input.byId.get(cardId);
		if (!card) continue;
		await writeJson(path.join(cardsDir, `${cardId}.s-card.json`), card);
	}

	const onDisk = await input.listCardIdsOnDisk(
		input.packageId,
		input.chapterId,
	);
	for (const orphan of onDisk) {
		if (keep.has(orphan)) continue;
		await unlink(path.join(cardsDir, `${orphan}.s-card.json`));
	}
}
