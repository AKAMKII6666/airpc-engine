/**
	* 出口 Effect 面板 id 下拉数据源装配：把画布/包/资源投影收敛为 EffectPanelSources。
	* 纯映射：仅取 value/label，不改契约、不写盘；空源交由面板走 helperText 提示。
	*/
import type { CallCardLabelOption } from "@studio-v2/typeFiles/story/callCardLabels";
import type { EffectPanelSources } from "@studio-v2/typeFiles/story/editor/callCard/editorEffectParams";
import type {
	CharacterAnchorNodeData,
	EditorCallCardProjection,
} from "@studio-v2/typeFiles/story/editor/mock/storyEditorMock";
import type { StoryPackageSummary } from "@studio-v2/typeFiles/story/summary/storyPackageSummary";
import type { AssetSummary } from "@studio-v2/typeFiles/library/assets/assetSummary";

/** 装配入参：四类候选各自的会话投影来源；均只读，缺省为空数组 */
export type BuildEffectPanelSourcesArgs = {
	/** 画布角色锚点；映射为角色候选（value=agentId） */
	characterAnchors: readonly CharacterAnchorNodeData[];
	/** 画布 CallCard 节点投影；映射为卡候选（value=cardId） */
	callCards: readonly EditorCallCardProjection[];
	/** 工作台故事包列表；映射为包候选（value=packageId） */
	packages: readonly StoryPackageSummary[];
	/** 会话内资源列表；映射为片段候选（value=assetId） */
	assets: readonly AssetSummary[];
};

/**
	* 从画布/包/资源投影装配 EffectPanelSources。
	* label 优先取显示名，缺省回落 id，避免下拉出现空白项。
	*/
export function buildEffectPanelSources(
	args: BuildEffectPanelSourcesArgs,
): EffectPanelSources {
	const { characterAnchors, callCards, packages, assets } = args;
	const characters: CallCardLabelOption[] = characterAnchors.map((anchor) => ({
		value: anchor.agentId,
		label: anchor.displayName || anchor.agentId,
	}));
	const cards: CallCardLabelOption[] = callCards.map((card) => ({
		value: card.cardId,
		label: card.title || card.cardId,
	}));
	const packageOptions: CallCardLabelOption[] = packages.map((pkg) => ({
		value: pkg.packageId,
		label: pkg.title || pkg.packageId,
	}));
	const clips: CallCardLabelOption[] = assets.map((asset) => ({
		value: asset.assetId,
		label: asset.displayName || asset.assetId,
	}));
	// cardId → 归属 agentId：供 attach/unmount 选定目标卡后默认回填角色；空归属不入表
	const cardOwnerAgentId: Record<string, string> = {};
	for (const card of callCards) {
		if (card.ownerAgentId) {
			cardOwnerAgentId[card.cardId] = card.ownerAgentId;
		}
	}
	return {
		characters,
		cards,
		packages: packageOptions,
		clips,
		cardOwnerAgentId,
	};
}
