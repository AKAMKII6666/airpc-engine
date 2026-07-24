/**
	* attach/unmount 效果边与 exit.effects[] 的双向同步纯函数（会话图内）。
	* 一条 attach_call_card / unmount_call_card 行 ↔ 画布上一条效果边（§2.3）：
	* source=承载 exit 的卡节点、sourceHandle=exitId、target=目标卡节点（=cardId）。
	* 效果边视觉区别于故事流转边（虚线 + 「挂载」/「卸载」标签 + 异色）；
	* 会话内改 nodes/edges；整包保存先 flush→flushedGraph，再经 editorGraphToBundle 落盘 layout+cards，不改引擎。
	*/
import type { Edge, Node } from "@xyflow/react";
import type {
	EditorCallCardExitProjection,
	EditorCallCardProjection,
} from "@studio-v2/typeFiles/story/editor/callCard/editorCallCardProjection";
import type { EditorEdgeKind } from "@studio-v2/src/bis/pageBis/storyEditor/role/roleConnection";
import { readCallCardData } from "@studio-v2/src/bis/pageBis/storyEditor/role/roleConnection";
import { nextEffectId } from "@studio-v2/src/bis/pageBis/storyEditor/form/exitList/exitListForm";

/** 效果边子类；attach=挂载、unmount=卸载 */
export type EditorEffectEdgeKind = "attach" | "unmount";

/**
	* 效果边 data；edgeKind 固定 "effect"，effectKind 区分挂载/卸载。
	* exitId/effectId 回指 exit.effects[] 具体行，供反向删边定位并移除 effect 行。
	*/
export type EffectEdgeData = {
	/** 边大类；与 role/story 分流 */
	edgeKind: Extract<EditorEdgeKind, "effect">;
	/** 效果子类；驱动样式与「挂载/卸载」标签 */
	effectKind: EditorEffectEdgeKind;
	/** 承载该效果的出口 id（= sourceHandle） */
	exitId: string;
	/** 对应 exit.effects[] 行 id；反向删边据此移除 */
	effectId: string;
};

/** 挂载效果边视觉：绿色虚线，区别于故事流转线（实线蓝）与角色线（灰点线） */
export const ATTACH_EFFECT_EDGE_STYLE = {
	stroke: "#37c98a",
	strokeWidth: 1.75,
	strokeDasharray: "6 3",
} as const;

/** 卸载效果边视觉：橙红短虚线，进一步区别于挂载绿线 */
export const UNMOUNT_EFFECT_EDGE_STYLE = {
	stroke: "#e2725b",
	strokeWidth: 1.75,
	strokeDasharray: "2 4",
} as const;

/** effect 名 → 效果边子类；非 attach/unmount 返回 null（不画效果边） */
export function effectEdgeKindForEffect(
	effect: string,
): EditorEffectEdgeKind | null {
	if (effect === "attach_call_card") return "attach";
	if (effect === "unmount_call_card") return "unmount";
	return null;
}

/** 生成稳定效果边 id；保证 reconcile 幂等 */
export function effectEdgeId(
	sourceNodeId: string,
	exitId: string,
	effectId: string,
): string {
	return `effect_${sourceNodeId}_${exitId}_${effectId}`;
}

/** 是否为效果边 */
export function isEffectEdge(edge: Edge): boolean {
	return (edge.data as { edgeKind?: EditorEdgeKind } | undefined)?.edgeKind === "effect";
}

/** 读取效果边 data；非效果边返回 null */
export function readEffectEdgeData(edge: Edge): EffectEdgeData | null {
	const data = edge.data as EffectEdgeData | undefined;
	if (!data || data.edgeKind !== "effect") return null;
	if (data.effectKind !== "attach" && data.effectKind !== "unmount") return null;
	if (typeof data.exitId !== "string" || typeof data.effectId !== "string") {
		return null;
	}
	return data;
}

/** 按 cardId 查找画布 CallCard 节点 id；找不到返回 null */
export function findCallCardNodeIdByCardId(
	nodes: readonly Node[],
	cardId: string,
): string | null {
	const found = nodes.find((node) => readCallCardData(node)?.cardId === cardId);
	return found?.id ?? null;
}

/** 构造一条效果边；样式与标签按 effectKind 派生 */
export function buildEffectEdge(args: {
	sourceNodeId: string;
	exitId: string;
	effectId: string;
	targetNodeId: string;
	effectKind: EditorEffectEdgeKind;
}): Edge {
	const { sourceNodeId, exitId, effectId, targetNodeId, effectKind } = args;
	const isAttach = effectKind === "attach";
	const data: EffectEdgeData = {
		edgeKind: "effect",
		effectKind,
		exitId,
		effectId,
	};
	return {
		id: effectEdgeId(sourceNodeId, exitId, effectId),
		source: sourceNodeId,
		target: targetNodeId,
		sourceHandle: exitId,
		targetHandle: "parent",
		label: isAttach ? "挂载" : "卸载",
		style: {
			...(isAttach ? ATTACH_EFFECT_EDGE_STYLE : UNMOUNT_EFFECT_EDGE_STYLE),
		},
		data,
	};
}

/** 去掉某源卡节点发出的全部效果边；reconcile / 删卡前清理用 */
export function withoutEffectEdgesFromSource(
	edges: readonly Edge[],
	sourceNodeId: string,
): Edge[] {
	return edges.filter((edge) => {
		if (!isEffectEdge(edge)) return true;
		return edge.source !== sourceNodeId;
	});
}

/**
	* 正向同步：按某源卡的 exits[].effects[] 重建其全部效果边。
	* 仅为「有可解析目标卡」的 attach/unmount 行建边（unmount 缺省=当前卡时无独立目标，不画边）。
	* 幂等：先清掉该源卡旧效果边再重建，避免残留。
	*/
export function reconcileEffectEdgesForCard(args: {
	edges: readonly Edge[];
	nodes: readonly Node[];
	sourceNodeId: string;
	exits: readonly EditorCallCardExitProjection[];
}): Edge[] {
	const { edges, nodes, sourceNodeId, exits } = args;
	const base = withoutEffectEdgesFromSource(edges, sourceNodeId);
	const built: Edge[] = [];
	for (const exit of exits) {
		for (const fx of exit.effects) {
			const effectKind = effectEdgeKindForEffect(fx.effect);
			if (!effectKind) continue;
			const params = fx.params;
			const cardId =
				params && "cardId" in params && typeof params.cardId === "string"
					? params.cardId
					: "";
			if (!cardId) continue;
			const targetNodeId = findCallCardNodeIdByCardId(nodes, cardId);
			if (!targetNodeId) continue;
			built.push(
				buildEffectEdge({
					sourceNodeId,
					exitId: exit.exitId,
					effectId: fx.id,
					targetNodeId,
					effectKind,
				}),
			);
		}
	}
	return [...base, ...built];
}

/** 反向同步单元：被删效果边回指的 effect 行坐标 */
export type RemovedEffectRef = {
	/** 源卡节点 id */
	sourceNodeId: string;
	/** 出口 id */
	exitId: string;
	/** effect 行 id */
	effectId: string;
};

/** 从「删除的边 id 集合」+ 当前边表收集被删效果边坐标；供反向移除 effect 行 */
export function collectRemovedEffectRefs(
	removedEdgeIds: readonly string[],
	edges: readonly Edge[],
): RemovedEffectRef[] {
	const idSet = new Set(removedEdgeIds);
	const out: RemovedEffectRef[] = [];
	for (const edge of edges) {
		if (!idSet.has(edge.id)) continue;
		const data = readEffectEdgeData(edge);
		if (!data) continue;
		out.push({
			sourceNodeId: edge.source,
			exitId: data.exitId,
			effectId: data.effectId,
		});
	}
	return out;
}

/**
	* 批量把被删效果边回指的 effect 行从各源卡移除（反向同步核心）。
	* 返回新 nodes 与「选中卡若受影响则的新投影」，供画布同步 selection。
	*/
export function applyEffectRemovalsToNodes(args: {
	nodes: readonly Node[];
	refs: readonly RemovedEffectRef[];
	selectedNodeId: string | null;
}): { nodes: Node[]; selectionData: EditorCallCardProjection | null } {
	const { nodes, refs, selectedNodeId } = args;
	let selectionData: EditorCallCardProjection | null = null;
	const nextNodes = nodes.map((node) => {
		const card = readCallCardData(node);
		if (!card) return node;
		let updated = card;
		for (const ref of refs) {
			if (ref.sourceNodeId !== node.id) continue;
			updated = removeEffectRowFromCard(updated, ref.exitId, ref.effectId);
		}
		if (updated === card) return node;
		if (selectedNodeId === node.id) selectionData = updated;
		return { ...node, data: updated };
	});
	return { nodes: nextNodes, selectionData };
}

/** 从卡投影移除指定出口下的某 effect 行；返回新投影（引用变更表示有改动） */
export function removeEffectRowFromCard(
	card: EditorCallCardProjection,
	exitId: string,
	effectId: string,
): EditorCallCardProjection {
	let changed = false;
	const exits = card.exits.map((exit) => {
		if (exit.exitId !== exitId) return exit;
		const kept = exit.effects.filter((fx) => fx.id !== effectId);
		if (kept.length === exit.effects.length) return exit;
		changed = true;
		return { ...exit, effects: kept };
	});
	return changed ? { ...card, exits } : card;
}

/**
	* 反向同步：拖出效果边到目标卡时，向源卡对应出口追加一条 attach/unmount 行。
	* agentId 默认取目标卡归属（cardOwnerAgentId）；返回新投影与新 effectId（供建边）。
	* 出口不存在时不改动（返回原投影 + null）。
	*/
export function appendMountEffectRow(args: {
	card: EditorCallCardProjection;
	exitId: string;
	targetCardId: string;
	effectKind: EditorEffectEdgeKind;
	ownerAgentId?: string;
}): { card: EditorCallCardProjection; effectId: string | null } {
	const { card, exitId, targetCardId, effectKind, ownerAgentId } = args;
	const exitIndex = card.exits.findIndex((exit) => exit.exitId === exitId);
	if (exitIndex < 0) return { card, effectId: null };
	const exit = card.exits[exitIndex]!;
	const effectId = nextEffectId(exit.effects);
	const effectName =
		effectKind === "attach" ? "attach_call_card" : "unmount_call_card";
	const params =
		effectKind === "attach"
			? { effect: "attach_call_card" as const, cardId: targetCardId, agentId: ownerAgentId }
			: { effect: "unmount_call_card" as const, cardId: targetCardId, agentId: ownerAgentId };
	const nextExit: EditorCallCardExitProjection = {
		...exit,
		effects: [
			...exit.effects,
			{ id: effectId, effect: effectName, params },
		],
	};
	const exits = card.exits.map((row, i) => (i === exitIndex ? nextExit : row));
	return { card: { ...card, exits }, effectId };
}
