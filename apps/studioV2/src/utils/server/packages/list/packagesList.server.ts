/**
	* 扫描 data/storis-packages 下各包 story.conf.json 为列表摘要。
	* characterCount = 本包派生引用角色数（读 cards），非 participants.length。
	*/
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import {
	CallCardDefinitionSchema,
	type CallCardDefinition,
	type StoryPackageConf,
} from "@airpc/rpg-engine";
import { listDerivedReferencedAgentIds } from "@studio-v2/src/utils/server/packages/conf/referencedAgentsDerive.server";
import type { DiskStoryPackageSummary } from "@studio-v2/src/utils/server/types/diskStoryPackage.server";
import { isValidPackageId, packagesRoot } from "../paths/packagesPaths.server";

/**
	* 扫描含 story.conf.json 的包目录；破损目录跳过。
	*/
export async function listDiskStoryPackages(): Promise<
	DiskStoryPackageSummary[]
> {
	const root = packagesRoot();
	let names: string[];
	try {
		names = await readdir(root);
	} catch {
		return [];
	}
	const out: DiskStoryPackageSummary[] = [];
	for (const name of names) {
		if (!isValidPackageId(name)) continue;
		const summary = await tryReadPackageSummary(root, name);
		if (summary) out.push(summary);
	}
	return out.sort(function (a, b) {
		return a.packageId.localeCompare(b.packageId);
	});
}

async function tryLoadCardsSoft(
	root: string,
	packageId: string,
	cardRefs: readonly { cardId?: unknown }[],
): Promise<CallCardDefinition[]> {
	const cards: CallCardDefinition[] = [];
	for (const ref of cardRefs) {
		if (typeof ref.cardId !== "string" || ref.cardId.trim() === "") continue;
		const cardPath = path.join(
			root,
			packageId,
			"cards",
			`${ref.cardId}.s-card.json`,
		);
		try {
			const raw = JSON.parse(await readFile(cardPath, "utf8")) as unknown;
			const parsed = CallCardDefinitionSchema.safeParse(raw);
			if (parsed.success) cards.push(parsed.data);
		} catch {
			/* 列表摘要：单卡破损跳过，不拖垮整包行 */
		}
	}
	return cards;
}

async function tryReadPackageSummary(
	root: string,
	name: string,
): Promise<DiskStoryPackageSummary | null> {
	const confPath = path.join(root, name, "story.conf.json");
	try {
		const raw = JSON.parse(await readFile(confPath, "utf8")) as {
			packageId?: string;
			title?: string;
			schemaVersion?: number;
			cards?: unknown[];
			assetRefs?: unknown[];
			entryCardId?: string;
		};
		const packageId =
			typeof raw.packageId === "string" && raw.packageId.length > 0
				? raw.packageId
				: name;
		const cardRefs = Array.isArray(raw.cards)
			? (raw.cards as { cardId?: unknown }[])
			: [];
		const cards = await tryLoadCardsSoft(root, packageId, cardRefs);
		const confStub = {
			schemaVersion:
				typeof raw.schemaVersion === "number" ? raw.schemaVersion : 1,
			packageId,
			cards: cardRefs
				.filter(function (r) {
					return typeof r.cardId === "string";
				})
				.map(function (r) {
					return { cardId: r.cardId as string };
				}),
		} as StoryPackageConf;
		let lastEditedAt = "";
		try {
			const st = await stat(path.join(root, name));
			lastEditedAt = st.mtime.toISOString();
		} catch {
			lastEditedAt = "";
		}
		return {
			packageId,
			title:
				typeof raw.title === "string" && raw.title.trim() !== ""
					? raw.title
					: packageId,
			schemaVersion: confStub.schemaVersion,
			cardCount: cardRefs.length,
			characterCount: listDerivedReferencedAgentIds({
				conf: confStub,
				cards,
			}).length,
			assetCount: Array.isArray(raw.assetRefs) ? raw.assetRefs.length : 0,
			entryCardId:
				typeof raw.entryCardId === "string" ? raw.entryCardId : "",
			lastEditedAt,
		};
	} catch {
		return null;
	}
}
