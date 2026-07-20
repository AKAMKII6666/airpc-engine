/**
 * 模块名称：故事编辑器布局辅助（泳道 Y 映射／Start·End 虚拟节点 id／自动布局）
 */
import type {
  IStoryEditorConf,
  IStoryEditorLayout,
} from "@studio/types/frontEnd/store/studioStore.types";

export const LANE_BAND_HEIGHT = 200;
export const LANE_ORIGIN_Y = 40;
export const START_NODE_ID = "__start__";
export const END_NODE_ID = "__end__";
export const AUTO_LAYOUT_ORIGIN_X = 200;
export const AUTO_LAYOUT_COL_GAP = 260;

export function buildDefaultStoryLayout(conf: {
  packageId: string;
  participants: string[];
  cards: Array<{ cardId: string }>;
}): IStoryEditorLayout {
  return {
    schemaVersion: 1,
    packageId: conf.packageId,
    lanes: conf.participants.map(function (agentId, order) {
      return { agentId, order };
    }),
    nodes: conf.cards.map(function (c, index) {
      const laneOrder = 0;
      return {
        cardId: c.cardId,
        x: 200 + (index % 3) * 260,
        y: yForLaneOrder(laneOrder),
      };
    }),
  };
}

export function resolveStoryLayout(
  conf: {
    packageId: string;
    participants: string[];
    cards: Array<{ cardId: string }>;
  },
  layout: IStoryEditorLayout | null,
): IStoryEditorLayout {
  if (layout && layout.packageId === conf.packageId) {
    return layout;
  }
  return buildDefaultStoryLayout(conf);
}

export function laneOrderForY(y: number, laneCount: number): number {
  if (laneCount <= 0) return 0;
  const order = Math.floor((y - LANE_ORIGIN_Y) / LANE_BAND_HEIGHT);
  return Math.max(0, Math.min(laneCount - 1, order));
}

export function yForLaneOrder(order: number): number {
  return LANE_ORIGIN_Y + order * LANE_BAND_HEIGHT + 48;
}

export function agentIdForLaneY(
  y: number,
  lanes: Array<{ agentId: string; order: number }>,
): string | null {
  if (lanes.length === 0) return null;
  const sorted = lanes.slice().sort(function (a, b) {
    return a.order - b.order;
  });
  const order = laneOrderForY(y, sorted.length);
  return sorted[order]?.agentId ?? null;
}

export function laneBandStyle(order: number): {
  top: number;
  height: number;
} {
  return {
    top: LANE_ORIGIN_Y + order * LANE_BAND_HEIGHT,
    height: LANE_BAND_HEIGHT,
  };
}

/**
 * 按泳道 + conf.cards 顺序简易分层重排，只改 nodes 坐标。
 */
export function computeSwimLaneAutoLayout(
  layout: IStoryEditorLayout,
  conf: IStoryEditorConf,
  cards: Record<string, unknown>,
): IStoryEditorLayout {
  const sortedLanes = layout.lanes.slice().sort(function (a, b) {
    return a.order - b.order;
  });
  const laneOrderByAgent = new Map<string, number>();
  for (const lane of sortedLanes) {
    laneOrderByAgent.set(lane.agentId, lane.order);
  }
  const confOrder = new Map<string, number>();
  conf.cards.forEach(function (c, index) {
    confOrder.set(c.cardId, index);
  });

  const columnsByLane = new Map<number, string[]>();
  for (const { cardId } of conf.cards) {
    const card = cards[cardId];
    const owner =
      card && typeof card === "object" && "ownerAgentId" in card
        ? String((card as { ownerAgentId?: string }).ownerAgentId ?? "")
        : "";
    const laneOrder =
      (owner ? laneOrderByAgent.get(owner) : undefined) ??
      sortedLanes[0]?.order ??
      0;
    const list = columnsByLane.get(laneOrder) ?? [];
    list.push(cardId);
    columnsByLane.set(laneOrder, list);
  }

  for (const list of columnsByLane.values()) {
    list.sort(function (a, b) {
      return (confOrder.get(a) ?? 0) - (confOrder.get(b) ?? 0);
    });
  }

  const colIndexByCard = new Map<string, number>();
  for (const list of columnsByLane.values()) {
    list.forEach(function (cardId, col) {
      colIndexByCard.set(cardId, col);
    });
  }

  const nextNodes = layout.nodes.map(function (n) {
    const card = cards[n.cardId];
    const owner =
      card && typeof card === "object" && "ownerAgentId" in card
        ? String((card as { ownerAgentId?: string }).ownerAgentId ?? "")
        : "";
    const laneOrder =
      (owner ? laneOrderByAgent.get(owner) : undefined) ??
      sortedLanes[0]?.order ??
      0;
    const col = colIndexByCard.get(n.cardId) ?? 0;
    return {
      cardId: n.cardId,
      x: AUTO_LAYOUT_ORIGIN_X + col * AUTO_LAYOUT_COL_GAP,
      y: yForLaneOrder(laneOrder),
    };
  });

  return { ...layout, nodes: nextNodes };
}
