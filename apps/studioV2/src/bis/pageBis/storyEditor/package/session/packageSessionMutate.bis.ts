/**
	* 包会话 conf 写回与整包保存：写 `storyEditor` store；不自拉列表。
	* 保存契约：先 sync flush 画布→store，再以 flushedGraph 组 bundle。
	*/
"use client";

import type { FactMeta, StoryPackageMeta } from "@studio-v2/typeFiles/story/callCard/engineCallCard";
import type { DiskStoryPackageBundle } from "@studio-v2/typeFiles/story/package/diskStoryPackage";
import {
	usePackageSessionMutateStoreSlice,
	usePackageSessionMutations,
} from "./packageSessionMutate.helpers";

/** 画布命令口最小面：校验定位选卡；避免 value import pageComponents */
export type PackageSessionCanvasApi = {
	/** 按业务 cardId 选中；找不到返回 false */
	selectCallCardByCardId: (cardId: string) => boolean;
};

type PackageSessionMutateBisArgs = {
	/** 路由包键；PUT 目标 */
	packageId: string;
	/** 路由章键；PUT 目标 */
	chapterId: string;
	/**
		* 同步 flush 画布→store。
		* 保存必须先成功；失败则中止（画布未挂载）。
		*/
	flushCanvasToStore: () => boolean;
};

/**
	* 保存 + conf 字段写回；一律 `apply*Result` 进 store。
	*/
export function usePackageSessionMutateBis(
	args: PackageSessionMutateBisArgs,
): {
	bundle: DiskStoryPackageBundle | null;
	onSave: () => Promise<void>;
	onEntryCardIdChange: (cardId: string) => void;
	onAssetRefsChange: (assetRefs: readonly string[]) => void;
	onWorldFactsChange: (worldFacts: readonly FactMeta[] | undefined) => void;
	onPackageMetaChange: (meta: StoryPackageMeta | undefined) => void;
	dismissSaveValidation: () => void;
} {
	const slice = usePackageSessionMutateStoreSlice();
	return usePackageSessionMutations(args, slice);
}
