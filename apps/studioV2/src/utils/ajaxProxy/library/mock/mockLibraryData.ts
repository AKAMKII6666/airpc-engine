/**
	* 资源库会话可变 mock（本步允许暂留）。
	* 禁止在此发起 Host 写口或读写 data 目录；刷新丢失。
	* 角色 / 玩家已切 /api/*；本文件不再持 MOCK_CHARACTERS / MOCK_USER_PROFILES。
	*/
import type { AssetSummary } from "@studio-v2/typeFiles/library/assets/assetSummary";
import type { AssetPickerItem } from "@studio-v2/typeFiles/library/assets/assetSummary";

/** 资源库可变 mock；新建 / 详情编辑会 mutate，供会话内列表与详情一致 */
export const MOCK_ASSETS: AssetSummary[] = [
	{
		assetId: "asset_wav_intro_1",
		displayName: "开场提示音",
		kind: "wav",
		format: "wav",
		measureValue: 4200,
		measureUnit: "duration_ms",
		refCount: 2,
		lastEditedAt: "2026-07-15T10:00:00.000Z",
		availability: "ready",
		note: "澜星开场过场用短音效。",
		referenceLines: [
			"被「澜星姐姐开场」过场播放卡引用",
			"被「静音开场」章节入口引用",
		],
	},
	{
		assetId: "asset_bgm_night_2",
		displayName: "夜班氛围 BGM",
		kind: "bgm",
		format: "mp3",
		measureValue: 128_000,
		measureUnit: "duration_ms",
		refCount: 1,
		lastEditedAt: "2026-07-14T18:00:00.000Z",
		availability: "ready",
		note: "夜班交接场景循环氛围。",
		referenceLines: ["被「值班员回拨」过场播放卡引用"],
	},
	{
		assetId: "asset_avatar_lanxing",
		displayName: "澜星头像",
		kind: "image",
		format: "webp",
		measureValue: 24_576,
		measureUnit: "size_bytes",
		refCount: 3,
		lastEditedAt: "2026-07-13T12:00:00.000Z",
		availability: "ready",
		note: "",
		referenceLines: ["被角色「澜星姐姐」头像引用"],
	},
	{
		assetId: "asset_doc_memo_3",
		displayName: "内存条核对备忘",
		kind: "text",
		format: "md",
		measureValue: 2048,
		measureUnit: "size_bytes",
		refCount: 1,
		lastEditedAt: "2026-07-11T08:00:00.000Z",
		availability: "missing",
		note: "静态阶段缺本地文件，导出前需补齐。",
		referenceLines: ["被「张老板回拨」剧情卡资料引用"],
	},
];

/** 编辑器资源浮窗 mock */
export const MOCK_ASSET_PICKER: readonly AssetPickerItem[] = [
	{
		assetId: "asset_wav_intro_1",
		displayName: "开场提示音",
		kind: "wav",
		availability: "ready",
	},
	{
		assetId: "asset_bgm_night_2",
		displayName: "夜班氛围 BGM",
		kind: "bgm",
		availability: "ready",
	},
	{
		assetId: "asset_doc_memo_3",
		displayName: "内存条核对备忘",
		kind: "text",
		availability: "missing",
	},
];

/** 当前会话可见的资源快照（浅拷贝）。 */
export function listMockAssets(): AssetSummary[] {
	return MOCK_ASSETS.slice();
}

/**
	* 会话内前置一条资源；不写 data/。
	* 调用方应触发列表重渲染。
	*/
export function appendMockAsset(asset: AssetSummary): void {
	MOCK_ASSETS.unshift(asset);
}

/**
	* 按 assetId 覆盖会话内资源投影；找不到返回 false。
	* 引用行与 refCount 由调用方决定是否保留。
	*/
export function updateMockAsset(
	assetId: string,
	next: AssetSummary,
): boolean {
	const index = MOCK_ASSETS.findIndex((a) => a.assetId === assetId);
	if (index < 0) return false;
	MOCK_ASSETS[index] = next;
	return true;
}

/**
	* 按 assetId 从会话内列表移除资源；找不到返回 false。
	* 不写盘；调用方负责刷新选中态。
	*/
export function removeMockAsset(assetId: string): boolean {
	const index = MOCK_ASSETS.findIndex((a) => a.assetId === assetId);
	if (index < 0) return false;
	MOCK_ASSETS.splice(index, 1);
	return true;
}
