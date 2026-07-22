/**
	* 编辑器整包保存：会话图 → bundle → PUT /api/stories/:id。
	*/
import {
	editorGraphToBundle,
	type EditorGraphSeed,
} from "@studio-v2/src/bis/pageBis/storyEditor/package/graph/diskBundleGraph";
import { putDiskStoryPackage } from "@studio-v2/src/utils/ajaxProxy/packages/api/storiesApi";
import type { Edge, Node } from "@xyflow/react";
import type { DiskStoryPackageBundle } from "@studio-v2/typeFiles/story/package/diskStoryPackage";

/** 整包保存入参；由编辑器壳层在顶栏保存时组装 */
export type SaveStoryPackageInput = {
	/** 目标故事包目录键；对应 PUT /api/stories/:packageId */
	packageId: string;
	/** 打开时的 bundle 快照；用于保留 conf 等未在画布编辑的字段 */
	baseBundle: DiskStoryPackageBundle;
	/** 当前画布节点；保存时写回 layout+cards */
	nodes: readonly Node[];
	/** 当前画布边；保存时写回 layout.edges */
	edges: readonly Edge[];
};

/** 整包写回 data/storis-packages；响应为写后回读 */
export async function saveStoryPackageToDisk(
	input: SaveStoryPackageInput,
): Promise<DiskStoryPackageBundle> {
	const bundle = editorGraphToBundle(
		input.baseBundle,
		input.nodes,
		input.edges,
	);
	return putDiskStoryPackage(input.packageId, bundle);
}

export type { EditorGraphSeed };
