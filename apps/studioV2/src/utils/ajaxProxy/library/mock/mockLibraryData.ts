/**
	* 角色 / 资源 / 玩家配置静态 mock。
	* 禁止在此发起 Host 写口或读写 data 目录。
	* 角色/资源/玩家列表会话内可增删改（append/update/remove）；刷新丢失。
	*/
import type { CharacterSummary } from "@studio-v2/typeFiles/library/characters/form/characterSummary";
import type { AssetSummary } from "@studio-v2/typeFiles/library/assets/assetSummary";
import type { UserProfileSummary } from "@studio-v2/typeFiles/library/users/userProfileSummary";
import type { CharacterPickerItem } from "@studio-v2/typeFiles/library/characters/form/characterSummary";
import type { AssetPickerItem } from "@studio-v2/typeFiles/library/assets/assetSummary";
import { MOCK_CHARACTERS } from "./mockCharactersData";

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

/** 玩家档案可变 mock；新建 / 详情编辑会 mutate，供会话内列表与详情一致 */
export const MOCK_USER_PROFILES: UserProfileSummary[] = [
	{
		userId: "user_demo_a",
		nickname: "小明",
		fullName: "张小明",
		gender: "male",
		birthday: "1998-03-12",
		age: 28,
		outboundWindow: { from: 9, to: 22 },
		location: {
			country: "中国",
			province: "广东省",
			city: "深圳市",
			district: "南山区",
		},
		createdAt: "2026-07-01T10:00:00.000Z",
		updatedAt: "2026-07-15T19:01:00.000Z",
	},
	{
		userId: "user_demo_b",
		nickname: "小雨",
		fullName: "李小雨",
		gender: "female",
		birthday: "2001-08-20",
		age: 24,
		outboundWindow: { from: 9, to: 22 },
		location: {
			country: "中国",
			province: "上海市",
			city: "上海市",
			district: "徐汇区",
		},
		createdAt: "2026-07-02T12:00:00.000Z",
		updatedAt: "2026-07-14T22:18:00.000Z",
	},
	{
		userId: "user_archive_c",
		nickname: "旧档",
		fullName: "王旧档",
		gender: "male",
		birthday: "1990-01-01",
		age: 36,
		outboundWindow: { from: 8, to: 21 },
		location: {
			country: "中国",
			province: "北京市",
			city: "北京市",
			district: "朝阳区",
		},
		createdAt: "2026-06-01T08:00:00.000Z",
		updatedAt: "2026-06-20T08:00:00.000Z",
	},
];

/** 编辑器角色浮窗 mock（本包视角）；agentId 与画布锚点对齐以便同步归属线 */
export const MOCK_CHARACTER_PICKER: readonly CharacterPickerItem[] = [
	{
		agentId: "agent_lanxing",
		displayName: "澜星姐姐",
		pendingCardCount: 2,
		avatarAssetId: "asset_avatar_lanxing",
	},
	{
		agentId: "agent_zhang",
		displayName: "张老板",
		pendingCardCount: 1,
		avatarAssetId: null,
	},
	{
		agentId: "agent_xiaoyu_4",
		displayName: "小雨",
		pendingCardCount: 0,
		avatarAssetId: null,
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

/** 当前会话可见的角色快照（浅拷贝）。 */
export function listMockCharacters(): CharacterSummary[] {
	return MOCK_CHARACTERS.slice();
}

/**
	* 会话内前置一条角色；不写 data/。
	* 调用方应触发列表重渲染。
	*/
export function appendMockCharacter(character: CharacterSummary): void {
	MOCK_CHARACTERS.unshift(character);
}

/**
	* 按 agentId 覆盖会话内角色投影；找不到返回 false。
	* 引用行与 packageRefCount 由调用方决定是否保留。
	*/
export function updateMockCharacter(
	agentId: string,
	next: CharacterSummary,
): boolean {
	const index = MOCK_CHARACTERS.findIndex((c) => c.agentId === agentId);
	if (index < 0) return false;
	MOCK_CHARACTERS[index] = next;
	return true;
}

/**
	* 按 agentId 从会话内列表移除角色；找不到返回 false。
	* 不写盘；调用方负责刷新选中态。
	*/
export function removeMockCharacter(agentId: string): boolean {
	const index = MOCK_CHARACTERS.findIndex((c) => c.agentId === agentId);
	if (index < 0) return false;
	MOCK_CHARACTERS.splice(index, 1);
	return true;
}

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

/** 当前会话可见的用户档案快照（浅拷贝）。 */
export function listMockUserProfiles(): UserProfileSummary[] {
	return MOCK_USER_PROFILES.slice();
}

/**
	* 会话内前置一条用户档案；不写 data/。
	* 调用方应触发列表重渲染。
	*/
export function appendMockUserProfile(profile: UserProfileSummary): void {
	MOCK_USER_PROFILES.unshift(profile);
}

/**
	* 按 userId 覆盖会话内玩家投影；找不到返回 false。
	*/
export function updateMockUserProfile(
	userId: string,
	next: UserProfileSummary,
): boolean {
	const index = MOCK_USER_PROFILES.findIndex((u) => u.userId === userId);
	if (index < 0) return false;
	MOCK_USER_PROFILES[index] = next;
	return true;
}

/**
	* 按 userId 从会话内列表移除用户档案；找不到返回 false。
	* 不写盘；调用方负责刷新选中态。
	*/
export function removeMockUserProfile(userId: string): boolean {
	const index = MOCK_USER_PROFILES.findIndex((u) => u.userId === userId);
	if (index < 0) return false;
	MOCK_USER_PROFILES.splice(index, 1);
	return true;
}
