/**
	* 故事包打开时的角色锚点投影：角色库全量 + 本包挂卡统计。
	* 路径 B：不以 conf.participants 裁剪锚点；API 不可用时回落 lanes / 派生引用。
	*/
import type { Node } from "@xyflow/react";
import type { CallCardDefinition } from "@studio-v2/typeFiles/story/callCard/engineCallCard";
import { listDerivedReferencedAgentIds } from "@studio-v2/src/bis/pageBis/storyEditor/package/conf/referencedAgentsDerive";
import type { CharacterAnchorNodeData } from "@studio-v2/typeFiles/story/editor/mock/storyEditorMock";
import type { DiskStoryPackageBundle } from "@studio-v2/typeFiles/story/package/diskStoryPackage";

/** agentId → 展示名 + 可选头像；打开包时由角色库 BFF 注入，不写回故事包 */
export type CharacterDisplayLookup = Readonly<
	Record<string, { displayName: string; avatarAssetId?: string | null }>
>;

function anchorNodeId(agentId: string): string {
	return `anchor_${agentId}`;
}

function pendingCountForAgent(
	agentId: string,
	cards: readonly CallCardDefinition[],
): number {
	return cards.filter(function (c) {
		return c.ownerAgentId === agentId;
	}).length;
}

/** 有卡 →「本包 · N 卡」；无 →「本章未挂卡」（需求 §2.5 statusLabel） */
export function characterAnchorStatusLabel(pendingCardCount: number): string {
	return pendingCardCount > 0
		? `本包 · ${pendingCardCount} 卡`
		: "本章未挂卡";
}

function collectOwnerExtras(
	bundle: DiskStoryPackageBundle,
	names: CharacterDisplayLookup,
): string[] {
	const extras: string[] = [];
	for (const card of bundle.cards) {
		const owner = card.ownerAgentId?.trim();
		if (owner && !names[owner] && !extras.includes(owner)) {
			extras.push(owner);
		}
	}
	return extras;
}

/** API 不可用时：lanes 优先，否则本包派生引用（不读 participants 白名单） */
function fallbackAnchorAgentIds(bundle: DiskStoryPackageBundle): string[] {
	const fromLanes = bundle.layout.lanes?.map(function (l) {
		return l.agentId;
	});
	if (fromLanes && fromLanes.length > 0) {
		return [...new Set(fromLanes)];
	}
	return listDerivedReferencedAgentIds(bundle);
}

/** 有挂卡者排前，便于全库列表中先看到本包在用角色 */
function sortUsedFirst(
	agentIds: readonly string[],
	cards: readonly CallCardDefinition[],
): string[] {
	const used: string[] = [];
	const unused: string[] = [];
	for (const agentId of agentIds) {
		if (pendingCountForAgent(agentId, cards) > 0) {
			used.push(agentId);
		} else {
			unused.push(agentId);
		}
	}
	return [...used, ...unused];
}

/**
	* 锚点 agentId 序：角色库全量优先；空 lookup 时回落 lanes / 派生引用。
	*/
function listAnchorAgentIds(
	bundle: DiskStoryPackageBundle,
	names: CharacterDisplayLookup,
): string[] {
	const libraryIds = Object.keys(names);
	const base =
		libraryIds.length > 0
			? [...libraryIds, ...collectOwnerExtras(bundle, names)]
			: fallbackAnchorAgentIds(bundle);
	return sortUsedFirst(base, bundle.cards);
}

/** 由整包 + 角色库 lookup 生成左侧 characterAnchor 节点 */
export function buildCharacterAnchorNodes(
	bundle: DiskStoryPackageBundle,
	names: CharacterDisplayLookup,
): Node[] {
	const unique = listAnchorAgentIds(bundle, names);
	return unique.map(function (agentId, index) {
		const rawName = names[agentId]?.displayName?.trim();
		const displayName =
			rawName !== undefined && rawName !== "" ? rawName : agentId;
		const pendingCardCount = pendingCountForAgent(agentId, bundle.cards);
		const avatarRaw = names[agentId]?.avatarAssetId;
		const avatarAssetId =
			typeof avatarRaw === "string" && avatarRaw.trim().length > 0
				? avatarRaw.trim()
				: null;
		const data: CharacterAnchorNodeData = {
			agentId,
			displayName,
			statusLabel: characterAnchorStatusLabel(pendingCardCount),
			pendingCardCount,
			avatarAssetId,
		};
		return {
			id: anchorNodeId(agentId),
			type: "characterAnchor" as const,
			position: { x: -40, y: 40 + index * 110 },
			data,
			draggable: false,
			selectable: true,
		};
	});
}

/** layout role 边 target 可能是裸 agentId；统一成 anchor_* 节点 id */
export function resolveAnchorTarget(target: string): string {
	if (target.startsWith("anchor_")) return target;
	return anchorNodeId(target);
}

/** 卡投影用展示名：优先角色库 lookup，缺省回落 agentId */
export function ownerDisplayNameForCard(
	card: CallCardDefinition,
	names: CharacterDisplayLookup,
): string {
	const agentId = card.ownerAgentId ?? "";
	if (agentId && names[agentId]?.displayName) {
		return names[agentId]!.displayName;
	}
	return agentId;
}
