/**
	* 包配置浮窗投影：由 mock 包摘要 + 静态种子拼出 StoryPackageConf 对齐字段。
	* 仅会话只读；禁止写 storis-packages / Host。
	*/
import {
	findMockPackage,
	listMockPackages,
} from "@studio-v2/src/utils/ajaxProxy/packages/mockWorkbenchData";
import type { CallCardLabelOption } from "@studio-v2/typeFiles/story/callCardLabels";
import type { EditorStoryPackageConfProjection } from "@studio-v2/typeFiles/story/editor/editorStoryPackageConf";

/**
	* 与画布初始卡对齐的包级种子；按 packageId 覆盖，缺省用 DEFAULT。
	* 不从磁盘读 story.conf.json。
	*/
type PackageConfSeed = {
	participants: readonly string[];
	entryCardId: string;
	assetRefs: readonly string[];
	cards: readonly { cardId: string; title?: string }[];
};

const DEFAULT_PACKAGE_CONF_SEED: PackageConfSeed = {
	participants: ["doubao-sister", "xiaoyu"],
	entryCardId: "doubao_intro_outbound",
	assetRefs: ["asset_wav_intro_1", "asset_doc_memo_3"],
	cards: [
		{ cardId: "doubao_intro_outbound", title: "澜星开场外呼" },
		{ cardId: "xiaoyu_delay_confirm", title: "小雨延迟确认" },
		{ cardId: "xiaoyu_stock_callback", title: "库存回电" },
	],
};

const PACKAGE_CONF_SEEDS: Readonly<Record<string, PackageConfSeed>> = {
	pkg_memory_bar_1: DEFAULT_PACKAGE_CONF_SEED,
	pkg_night_shift_2: {
		participants: ["xiaoyu"],
		entryCardId: "night_shift_open",
		assetRefs: ["asset_wav_night_1"],
		cards: [
			{ cardId: "night_shift_open", title: "夜班开场" },
			{ cardId: "night_handoff_check", title: "交接核对" },
		],
	},
	pkg_handoff_demo: {
		participants: ["doubao-sister", "xiaoyu"],
		entryCardId: "doubao_intro_outbound",
		assetRefs: ["asset_wav_intro_1"],
		cards: [
			{ cardId: "doubao_intro_outbound", title: "澜星开场外呼" },
			{ cardId: "xiaoyu_stock_callback", title: "库存回电" },
		],
	},
	pkg_quiet_prologue: {
		participants: ["doubao-sister"],
		entryCardId: "quiet_free_open",
		assetRefs: [],
		cards: [{ cardId: "quiet_free_open", title: "静音序章 Free" }],
	},
};

function seedForPackage(packageId: string): PackageConfSeed {
	return PACKAGE_CONF_SEEDS[packageId] ?? DEFAULT_PACKAGE_CONF_SEED;
}

/**
	* 按路由 packageId 投影包配置浮窗数据。
	* 找不到列表摘要时仍返回可展示的只读壳（标题回落「未命名故事包」）。
	*/
export function projectEditorPackageConf(
	packageId: string,
): EditorStoryPackageConfProjection {
	const pkg = findMockPackage(packageId);
	const seed = seedForPackage(packageId);
	return {
		schemaVersion: 1,
		packageId,
		title: pkg?.title?.trim() ? pkg.title : "未命名故事包",
		participants: seed.participants,
		entryCardId: seed.entryCardId,
		assetRefs: seed.assetRefs,
		cards: seed.cards.map((card) => ({ cardId: card.cardId })),
	};
}

/**
	* 章节结束「下一故事包」Select 选项；label 用人话包名，value 为 packageId。
	* 仅 mock 列表；禁止自由文本手填 packageId。
	*/
export function listChapterNextPackageOptions(): readonly CallCardLabelOption[] {
	return listMockPackages().map((pkg) => ({
		label: pkg.title.trim() !== "" ? pkg.title : pkg.packageId,
		value: pkg.packageId,
	}));
}

/**
	* 章节结束「下一章起点卡」Select 选项；随 nextPackageId 变化。
	* label 优先卡标题，否则 cardId；禁止自由文本手填。
	*/
export function listChapterEntryCardOptions(
	packageId: string | undefined,
): readonly CallCardLabelOption[] {
	if (!packageId || packageId.trim() === "") return [];
	const seed = seedForPackage(packageId);
	return seed.cards.map((card) => ({
		label:
			typeof card.title === "string" && card.title.trim() !== ""
				? card.title
				: card.cardId,
		value: card.cardId,
	}));
}

/**
	* 包变更后解析合法 nextEntryCardId。
	* 仍在新包集合内则保留；否则回退该包默认 entryCardId。
	*/
export function resolveChapterEntryCardId(
	packageId: string | undefined,
	currentEntryCardId: string | undefined,
): string | undefined {
	if (!packageId || packageId.trim() === "") return undefined;
	const options = listChapterEntryCardOptions(packageId);
	if (
		typeof currentEntryCardId === "string" &&
		currentEntryCardId.trim() !== "" &&
		options.some((opt) => opt.value === currentEntryCardId)
	) {
		return currentEntryCardId;
	}
	return seedForPackage(packageId).entryCardId;
}
