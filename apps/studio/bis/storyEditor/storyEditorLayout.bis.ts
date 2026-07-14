/**
 * 模块名称：故事编辑器布局辅助（泳道 Y 映射／Start·End 虚拟节点 id）
 */
import type { IStoryEditorLayout } from "@studio/types/frontEnd/store/studioStore.types";

export const LANE_BAND_HEIGHT = 200;
export const LANE_ORIGIN_Y = 40;
export const START_NODE_ID = "__start__";
export const END_NODE_ID = "__end__";

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
