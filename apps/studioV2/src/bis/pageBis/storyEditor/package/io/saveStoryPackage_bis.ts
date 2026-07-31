/**
	* 编辑器章保存：会话图 → bundle → PUT chapter API（含 validate 闸门）。
	*/
import {
	editorGraphToBundle,
	type EditorGraphSeed,
} from "@studio-v2/src/bis/pageBis/storyEditor/package/graph/diskBundleGraph";
import { putDiskChapterBundle } from "@studio-v2/src/utils/ajaxProxy/packages/api/storiesApi";
import type { Edge, Node } from "@xyflow/react";
import type { DiskStoryPackageBundle } from "@studio-v2/typeFiles/story/package/diskStoryPackage";
import type { PutStoryPackageResult } from "@studio-v2/typeFiles/story/editor/validate/packageValidationDto";

/** 章保存入参；由编辑器壳层在顶栏保存时组装 */
export type SaveStoryPackageInput = {
	/** 目标故事包容器键 */
	packageId: string;
	/** 目标章 id；对应 PUT /api/stories/:pkg/chapters/:id */
	chapterId: string;
	/** 打开时的 bundle 快照；用于保留 conf 等未在画布编辑的字段 */
	baseBundle: DiskStoryPackageBundle;
	/** 当前画布节点；保存时写回 layout+cards */
	nodes: readonly Node[];
	/** 当前画布边；保存时写回 layout.edges */
	edges: readonly Edge[];
};

/** 章 bundle 写回；服务端 validate 失败抛 StudioApiError（details.report） */
export async function saveStoryPackageToDisk(
	input: SaveStoryPackageInput,
): Promise<PutStoryPackageResult> {
	const bundle = editorGraphToBundle(
		input.baseBundle,
		input.nodes,
		input.edges,
	);
	return putDiskChapterBundle(input.packageId, input.chapterId, bundle);
}

export type { EditorGraphSeed };
