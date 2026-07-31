/**
	* 章配置浮窗与 chapter_end 下拉：由已加载磁盘 bundle / 列表投影。
	* entryCardId / assetRefs / worldFacts / meta 可经 PackageConfigFloat 写会话。
	* participants 字段 = 本章引用角色派生，非 conf.participants 白名单。
	*/
import { listDerivedReferencedAgentIds } from "@studio-v2/src/bis/pageBis/storyEditor/package/conf/referencedAgentsDerive";
import type { CallCardLabelOption } from "@studio-v2/typeFiles/story/callCardLabels";
import type { EditorStoryPackageConfProjection } from "@studio-v2/typeFiles/story/editor/package/editorStoryPackageConf";
import type { DiskStoryPackageBundle } from "@studio-v2/typeFiles/story/package/diskStoryPackage";
import type { StoryPackageSummary } from "@studio-v2/typeFiles/story/summary/storyPackageSummary";

/** 由章 conf 投影只读浮窗字段；packageId 字段承载 chapterId 供浮窗兼容 */
export function projectEditorPackageConfFromBundle(
	bundle: DiskStoryPackageBundle,
): EditorStoryPackageConfProjection {
	const conf = bundle.conf;
	const chapterId = conf.chapterId;
	return {
		schemaVersion: conf.schemaVersion,
		packageId: chapterId,
		title: conf.title?.trim() ? conf.title : chapterId,
		participants: listDerivedReferencedAgentIds(bundle),
		entryCardId: conf.entryCardId ?? "",
		assetRefs: conf.assetRefs ?? [],
		cards: (conf.cards ?? []).map(function (ref) {
			const card = bundle.cards.find(function (c) {
				return c.cardId === ref.cardId;
			});
			return { cardId: ref.cardId, title: card?.title };
		}),
	};
}

/** chapter_end「下一章」Select；本包内章列表 */
export function listChapterNextChapterOptions(
	chapters: readonly { chapterId: string; title: string }[],
	currentChapterId: string,
): readonly CallCardLabelOption[] {
	return chapters
		.filter(function (ch) {
			return ch.chapterId !== currentChapterId;
		})
		.map(function (ch) {
			return {
				label: ch.title.trim() !== "" ? ch.title : ch.chapterId,
				value: ch.chapterId,
			};
		});
}

/** 章节结束「下一故事包」Select；label 用人话包名（EndStory 跨包保留） */
export function listChapterNextPackageOptions(
	packages: readonly StoryPackageSummary[],
): readonly CallCardLabelOption[] {
	return packages.map(function (pkg) {
		return {
			label: pkg.title.trim() !== "" ? pkg.title : pkg.packageId,
			value: pkg.packageId,
		};
	});
}

/**
	* 章节结束「下一章起点卡」Select。
	* cardIndex：chapterId → 该章 conf.cards 与标题；由编辑器加载时构建。
	*/
export function listChapterEntryCardOptions(
	chapterId: string | undefined,
	cardIndex: Readonly<
		Record<string, readonly { cardId: string; title?: string }[]>
	>,
): readonly CallCardLabelOption[] {
	if (!chapterId || chapterId.trim() === "") return [];
	const cards = cardIndex[chapterId] ?? [];
	return cards.map(function (card) {
		return {
			label:
				typeof card.title === "string" && card.title.trim() !== ""
					? card.title
					: card.cardId,
			value: card.cardId,
		};
	});
}

/** 章变更后解析合法 nextEntryCardId */
export function resolveChapterEntryCardId(
	chapterId: string | undefined,
	currentEntryCardId: string | undefined,
	cardIndex: Readonly<
		Record<string, readonly { cardId: string; title?: string }[]>
	>,
	entryCardIdByChapter: Readonly<Record<string, string>>,
): string | undefined {
	if (!chapterId || chapterId.trim() === "") return undefined;
	const options = listChapterEntryCardOptions(chapterId, cardIndex);
	if (
		typeof currentEntryCardId === "string" &&
		currentEntryCardId.trim() !== "" &&
		options.some(function (opt) {
			return opt.value === currentEntryCardId;
		})
	) {
		return currentEntryCardId;
	}
	return entryCardIdByChapter[chapterId];
}

/** 从已加载章 bundle 列表构建 cardIndex 与默认 entryCardId 表（键 = chapterId） */
export function buildPackageCardIndex(
	bundles: readonly DiskStoryPackageBundle[],
): {
	cardIndex: Record<string, readonly { cardId: string; title?: string }[]>;
	entryCardIdByChapter: Record<string, string>;
} {
	const cardIndex: Record<
		string,
		readonly { cardId: string; title?: string }[]
	> = {};
	const entryCardIdByChapter: Record<string, string> = {};
	for (const bundle of bundles) {
		const cid = bundle.conf.chapterId;
		entryCardIdByChapter[cid] = bundle.conf.entryCardId ?? "";
		cardIndex[cid] = bundle.conf.cards.map(function (ref) {
			const card = bundle.cards.find(function (c) {
				return c.cardId === ref.cardId;
			});
			return { cardId: ref.cardId, title: card?.title };
		});
	}
	return { cardIndex, entryCardIdByChapter };
}
