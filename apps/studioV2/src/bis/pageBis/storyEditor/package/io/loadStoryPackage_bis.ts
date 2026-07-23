/**
	* 编辑器打开：读盘整包 + 角色库全量 displayName + 画布 seed。
	* 锚点真源 = fetchCharacterDefs()（路径 B）；不再按 conf.participants 裁剪。
	*/
import { bundleToEditorGraph } from "@studio-v2/src/bis/pageBis/storyEditor/package/graph/diskBundleGraph";
import { fetchCharacterDefs } from "@studio-v2/src/utils/ajaxProxy/library/api/charactersApi";
import { fetchDiskStoryPackage } from "@studio-v2/src/utils/ajaxProxy/packages/api/storiesApi";
import type { CharacterDisplayLookup } from "@studio-v2/src/bis/pageBis/storyEditor/package/graph/diskBundleGraph";
import type { EditorGraphSeed } from "@studio-v2/src/bis/pageBis/storyEditor/package/graph/diskBundleGraph";
import type { DiskStoryPackageBundle } from "@studio-v2/typeFiles/story/package/diskStoryPackage";

/** 编辑器打开故事包后的会话载荷；bundle 为磁盘真源，graphSeed 为画布初始投影 */
export type LoadedStoryPackageSession = {
	/** 当前打开的磁盘整包；保存时作为 baseBundle */
	bundle: DiskStoryPackageBundle;
	/** 由 bundle 投影的 React Flow 初始图；会话内可编辑 */
	graphSeed: EditorGraphSeed;
};

/**
	* GET /api/characters → agentId→displayName；供全库锚点投影。
	* 失败时回落空表，由 diskBundleGraph 用 lanes / 派生引用降级。
	*/
async function buildCharacterLibraryLookup(): Promise<CharacterDisplayLookup> {
	const lookup: Record<string, { displayName: string }> = {};
	try {
		const defs = await fetchCharacterDefs();
		for (const def of defs) {
			const name = def.displayName?.trim() || def.agentId;
			lookup[def.agentId] = { displayName: name };
		}
	} catch {
		return lookup;
	}
	return lookup;
}

/** GET /api/stories/:id 并投影画布初始图（锚点 = 角色库全量） */
export async function loadStoryPackageForEditor(
	packageId: string,
): Promise<LoadedStoryPackageSession> {
	const bundle = await fetchDiskStoryPackage(packageId);
	const names = await buildCharacterLibraryLookup();
	const graphSeed = bundleToEditorGraph(bundle, names);
	return { bundle, graphSeed };
}
