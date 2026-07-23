/**
	* 包会话加载/入口卡变更纯步骤：从 hook 拆出以压行数硬上限。
	*/
import type { FactMeta, StoryPackageMeta } from "@studio-v2/typeFiles/story/callCard/engineCallCard";
import {
	buildPackageCardIndex,
} from "@studio-v2/src/bis/pageBis/storyEditor/package/conf/packageConfProjection";
import { loadStoryPackageForEditor } from "@studio-v2/src/bis/pageBis/storyEditor/package/io/loadStoryPackage_bis";
import { listStoryPackagesFromDisk } from "@studio-v2/src/bis/pageBis/packages/list/listStoryPackages_bis";
import type { EditorGraphSeed } from "@studio-v2/src/bis/pageBis/storyEditor/package/graph/diskBundleGraph";
import type { DiskStoryPackageBundle } from "@studio-v2/typeFiles/story/package/diskStoryPackage";
import type { StoryPackageSummary } from "@studio-v2/typeFiles/story/summary/storyPackageSummary";

/**
	* 包会话加载成功载荷；供 hook 一次性灌入 state，避免 reload 内嵌重循环。
	*/
export type PackageSessionLoadOk = {
	/** 判别成功分支；恒为 true */
	ok: true;
	/** 磁盘包列表摘要；用于 chapter_end 下一包下拉 */
	packages: StoryPackageSummary[];
	/** 当前打开整包；会话内可改 entryCardId，顶栏保存写回 */
	bundle: DiskStoryPackageBundle;
	/** 画布初始图；仅打开时生成，保存不重建 */
	graphSeed: EditorGraphSeed;
	/** packageId → 包内卡摘要；chapter / 入口 Select 共享 */
	cardIndex: Record<string, readonly { cardId: string; title?: string }[]>;
	/** packageId → 默认入口卡；包变更后解析 nextEntryCardId */
	entryCardIdByPackage: Record<string, string>;
};

/**
	* 包会话加载失败；message 已人话化，可直接进 loadError。
	*/
export type PackageSessionLoadFail = {
	/** 判别失败分支；恒为 false */
	ok: false;
	/** 人话错误；空串不应出现 */
	message: string;
};

/** 打开当前包并尽量补齐其它包 cardIndex（失败不阻断） */
export async function loadPackageEditorSession(
	packageId: string,
	errorMessage: (error: unknown, fallback: string) => string,
): Promise<PackageSessionLoadOk | PackageSessionLoadFail> {
	try {
		const [packages, session] = await Promise.all([
			listStoryPackagesFromDisk(),
			loadStoryPackageForEditor(packageId),
		]);
		const indexParts = buildPackageCardIndex([session.bundle]);
		let cardIndex = { ...indexParts.cardIndex };
		let entryCardIdByPackage = { ...indexParts.entryCardIdByPackage };
		for (const pkg of packages) {
			if (cardIndex[pkg.packageId]) continue;
			try {
				const other = await loadStoryPackageForEditor(pkg.packageId);
				const extra = buildPackageCardIndex([other.bundle]);
				cardIndex = { ...cardIndex, ...extra.cardIndex };
				entryCardIdByPackage = {
					...entryCardIdByPackage,
					...extra.entryCardIdByPackage,
				};
			} catch {
				// 其它包读失败不阻断当前包打开
			}
		}
		return {
			ok: true,
			packages,
			bundle: session.bundle,
			graphSeed: session.graphSeed,
			cardIndex,
			entryCardIdByPackage,
		};
	} catch (error) {
		return {
			ok: false,
			message: errorMessage(error, "无法从磁盘加载故事包"),
		};
	}
}

/** 会话内改入口卡；空串忽略并返回 null */
export function withEntryCardId(
	bundle: DiskStoryPackageBundle,
	cardId: string,
): DiskStoryPackageBundle | null {
	const next = cardId.trim();
	if (next === "") return null;
	return {
		...bundle,
		conf: { ...bundle.conf, entryCardId: next },
	};
}

/**
	* 会话内改 conf.assetRefs；去重保序；空数组表示清空引用。
	* 候选须来自 /api/assets；调用方负责只写入合法 assetId。
	*/
export function withAssetRefs(
	bundle: DiskStoryPackageBundle,
	assetRefs: readonly string[],
): DiskStoryPackageBundle {
	const seen = new Set<string>();
	const next: string[] = [];
	for (const raw of assetRefs) {
		const id = raw.trim();
		if (id === "" || seen.has(id)) continue;
		seen.add(id);
		next.push(id);
	}
	return {
		...bundle,
		conf: {
			...bundle.conf,
			assetRefs: next.length > 0 ? next : undefined,
		},
	};
}

/**
	* 会话内改 conf.worldFacts；undefined 表示清空可选键。
	* 调用方须先经 parseWorldFactsJson；本函数不再二次校验。
	*/
export function withWorldFacts(
	bundle: DiskStoryPackageBundle,
	worldFacts: readonly FactMeta[] | undefined,
): DiskStoryPackageBundle {
	return {
		...bundle,
		conf: {
			...bundle.conf,
			worldFacts:
				worldFacts && worldFacts.length > 0
					? [...worldFacts]
					: undefined,
		},
	};
}

/**
	* 会话内改 conf.meta；undefined 表示清空可选键。
	* 调用方须先经 parsePackageMetaJson。
	*/
export function withPackageMeta(
	bundle: DiskStoryPackageBundle,
	meta: StoryPackageMeta | undefined,
): DiskStoryPackageBundle {
	return {
		...bundle,
		conf: {
			...bundle.conf,
			meta,
		},
	};
}
