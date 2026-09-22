/**
	* 整包写盘前：把跨卡重复的 effect.id 改写成 UUID 形，并同步 layout effect 边。
	* 解决历史 nextEffectId 仅按本出口递增导致的 EFFECT_ID_DUP；Server 区自管 crypto，禁引 Client。
	*/
import { randomUUID } from "node:crypto";
import type { CallCardDefinition } from "@airpc/rpg-engine";
import type {
	StudioCanvasLayout,
	StudioCanvasLayoutEdge,
} from "@studio-v2/src/utils/server/types/diskStoryPackage.server";

type EffectRename = {
	cardId: string;
	exitId: string;
	from: string;
	to: string;
};

function newEffectId(): string {
	return `fx_${randomUUID().replace(/-/g, "").toLowerCase()}`;
}

function rematerializeCardEffects(input: {
	cards: CallCardDefinition[];
	seen: Set<string>;
	renames: EffectRename[];
}): CallCardDefinition[] {
	return input.cards.map(function (card) {
		return rematerializeOneCard(card, input.seen, input.renames);
	});
}

function rematerializeOneCard(
	card: CallCardDefinition,
	seen: Set<string>,
	renames: EffectRename[],
): CallCardDefinition {
	return {
		...card,
		exits: (card.exits ?? []).map(function (exit) {
			return {
				...exit,
				effects: (exit.effects ?? []).map(function (fx) {
					return rematerializeOneEffect({
						fx,
						cardId: card.cardId,
						exitId: exit.exitId,
						seen,
						renames,
					});
				}),
			};
		}) as CallCardDefinition["exits"],
	};
}

function rematerializeOneEffect<T extends { id: string }>(input: {
	fx: T;
	cardId: string;
	exitId: string;
	seen: Set<string>;
	renames: EffectRename[];
}): T {
	const fx = input.fx;
	if (!input.seen.has(fx.id)) {
		input.seen.add(fx.id);
		return fx;
	}
	const to = newEffectId();
	input.renames.push({
		cardId: input.cardId,
		exitId: input.exitId,
		from: fx.id,
		to,
	});
	input.seen.add(to);
	return { ...fx, id: to };
}

function buildCardIdByNodeId(
	layout: StudioCanvasLayout,
): Map<string, string> {
	const cardIdByNodeId = new Map<string, string>();
	for (const node of layout.nodes ?? []) {
		const nodeId = node.nodeId ?? node.cardId;
		if (nodeId && node.cardId) {
			cardIdByNodeId.set(nodeId, node.cardId);
		}
	}
	return cardIdByNodeId;
}

/**
	* 首次出现的 effect.id 保留；后续重复改为新 UUID，并按 cardId+exitId+旧 id 回写 layout。
	*/
export function rematerializeDuplicateEffectIds(input: {
	cards: CallCardDefinition[];
	layout: StudioCanvasLayout | null | undefined;
}): {
	cards: CallCardDefinition[];
	layout: StudioCanvasLayout | null | undefined;
} {
	const seen = new Set<string>();
	const renames: EffectRename[] = [];
	const cards = rematerializeCardEffects({
		cards: input.cards,
		seen,
		renames,
	});

	if (renames.length === 0 || !input.layout) {
		return { cards, layout: input.layout };
	}

	const cardIdByNodeId = buildCardIdByNodeId(input.layout);
	const edges = (input.layout.edges ?? []).map(function (edge) {
		return remapLayoutEdge(edge, renames, cardIdByNodeId);
	});

	return {
		cards,
		layout: {
			...input.layout,
			edges,
		},
	};
}

function remapLayoutEdge(
	edge: StudioCanvasLayoutEdge,
	renames: EffectRename[],
	cardIdByNodeId: Map<string, string>,
): StudioCanvasLayoutEdge {
	if (edge.edgeKind !== "effect" || !edge.effectId || !edge.exitId) {
		return edge;
	}
	const cardId = cardIdByNodeId.get(edge.source) ?? edge.source;
	const hit = renames.find(function (r) {
		return (
			r.cardId === cardId &&
			r.exitId === edge.exitId &&
			r.from === edge.effectId
		);
	});
	if (!hit) return edge;
	const nextEdgeId = edge.edgeId.includes(hit.from)
		? edge.edgeId.split(hit.from).join(hit.to)
		: edge.edgeId;
	return {
		...edge,
		effectId: hit.to,
		edgeId: nextEdgeId,
	};
}
