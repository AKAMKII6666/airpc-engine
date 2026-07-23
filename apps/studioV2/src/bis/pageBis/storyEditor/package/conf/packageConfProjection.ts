/**
	* 包配置浮窗与 chapter_end 下拉：由已加载磁盘 bundle / 列表投影。
	* entryCardId / assetRefs / worldFacts / meta 可经 PackageConfigFloat 写会话。
	* participants 字段 = 本包引用角色派生，非 conf.participants 白名单。
	*/
import { listDerivedReferencedAgentIds } from "@studio-v2/src/bis/pageBis/storyEditor/package/conf/referencedAgentsDerive";
import type { CallCardLabelOption } from "@studio-v2/typeFiles/story/callCardLabels";
import type { EditorStoryPackageConfProjection } from "@studio-v2/typeFiles/story/editor/package/editorStoryPackageConf";
import type { DiskStoryPackageBundle } from "@studio-v2/typeFiles/story/package/diskStoryPackage";
import type { StoryPackageSummary } from "@studio-v2/typeFiles/story/summary/storyPackageSummary";

/** 由整包 conf 投影只读浮窗字段 */
export function projectEditorPackageConfFromBundle(
	bundle: DiskStoryPackageBundle,
): EditorStoryPackageConfProjection {
	const conf = bundle.conf;
	return {
		schemaVersion: conf.schemaVersion,
		packageId: conf.packageId,
		title: conf.title?.trim() ? conf.title : conf.packageId,
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

/** 章节结束「下一故事包」Select；label 用人话包名 */
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
	* cardIndex：packageId → 该包 conf.cards 与标题；由编辑器加载时构建。
	*/
export function listChapterEntryCardOptions(
	packageId: string | undefined,
	cardIndex: Readonly<
		Record<string, readonly { cardId: string; title?: string }[]>
	>,
): readonly CallCardLabelOption[] {
	if (!packageId || packageId.trim() === "") return [];
	const cards = cardIndex[packageId] ?? [];
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

/** 包变更后解析合法 nextEntryCardId */
export function resolveChapterEntryCardId(
	packageId: string | undefined,
	currentEntryCardId: string | undefined,
	cardIndex: Readonly<
		Record<string, readonly { cardId: string; title?: string }[]>
	>,
	entryCardIdByPackage: Readonly<Record<string, string>>,
): string | undefined {
	if (!packageId || packageId.trim() === "") return undefined;
	const options = listChapterEntryCardOptions(packageId, cardIndex);
	if (
		typeof currentEntryCardId === "string" &&
		currentEntryCardId.trim() !== "" &&
		options.some(function (opt) {
			return opt.value === currentEntryCardId;
		})
	) {
		return currentEntryCardId;
	}
	return entryCardIdByPackage[packageId];
}

/** 从已加载包列表构建 cardIndex 与默认 entryCardId 表 */
export function buildPackageCardIndex(
	bundles: readonly DiskStoryPackageBundle[],
): {
	cardIndex: Record<string, readonly { cardId: string; title?: string }[]>;
	entryCardIdByPackage: Record<string, string>;
} {
	const cardIndex: Record<
		string,
		readonly { cardId: string; title?: string }[]
	> = {};
	const entryCardIdByPackage: Record<string, string> = {};
	for (const bundle of bundles) {
		const pid = bundle.conf.packageId;
		entryCardIdByPackage[pid] = bundle.conf.entryCardId ?? "";
		cardIndex[pid] = bundle.conf.cards.map(function (ref) {
			const card = bundle.cards.find(function (c) {
				return c.cardId === ref.cardId;
			});
			return { cardId: ref.cardId, title: card?.title };
		});
	}
	return { cardIndex, entryCardIdByPackage };
}
