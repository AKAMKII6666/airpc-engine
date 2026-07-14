/**
 * 模块名称：ExitSelector（静态 ∪ 动态候选）
 */
import type { CallCardDefinition, CallCardExit } from "../schema/callCard.js";
import type { Outcome, Effect } from "../schema/outcome.js";
import type { RuntimeExitCandidate } from "../tools/types.js";
import { evaluateExitCondition } from "./evaluateCondition.js";

export interface SelectedExit {
  exit: CallCardExit;
  source: "static" | "dynamic";
  priority: number;
  candidateId?: string;
}

/**
 * 候选池 = 静态 exits ∪ 动态 candidates。
 * 同 priority：静态定义序优先于动态。
 */
export function selectExit(
  card: CallCardDefinition,
  outcome: Outcome,
  candidates: RuntimeExitCandidate[] = [],
): SelectedExit | null {
  const matched: Array<SelectedExit & { staticOrder: number }> = [];

  card.exits.forEach(function (exit, index) {
    if (evaluateExitCondition(exit.condition, outcome, card)) {
      matched.push({
        exit,
        source: "static",
        priority: exit.priority,
        staticOrder: index,
      });
    }
  });

  for (const cand of candidates) {
    if (cand.exitId) {
      const staticExit = card.exits.find(function (e) {
        return e.exitId === cand.exitId;
      });
      if (!staticExit) continue;
      if (!evaluateExitCondition(staticExit.condition, outcome, card)) {
        continue;
      }
      matched.push({
        exit: {
          ...staticExit,
          effects:
            cand.effects.length > 0 ? cand.effects : staticExit.effects,
          priority: Math.max(staticExit.priority, cand.priority),
        },
        source: "dynamic",
        priority: Math.max(staticExit.priority, cand.priority),
        candidateId: cand.candidateId,
        staticOrder: Number.MAX_SAFE_INTEGER,
      });
      continue;
    }

    // 纯动态：隐式条件 = candidate 仍有效（v1：挂机即有效）
    if (cand.effects.length === 0) continue;
    const synthetic: CallCardExit = {
      exitId: `dynamic:${cand.candidateId}`,
      exitKind: "dynamic",
      title: cand.toolId,
      priority: cand.priority,
      condition: { op: "always" },
      effects: cand.effects as Effect[],
    };
    matched.push({
      exit: synthetic,
      source: "dynamic",
      priority: cand.priority,
      candidateId: cand.candidateId,
      staticOrder: Number.MAX_SAFE_INTEGER,
    });
  }

  if (matched.length === 0) return null;

  matched.sort(function (a, b) {
    if (b.priority !== a.priority) return b.priority - a.priority;
    if (a.source !== b.source) {
      return a.source === "static" ? -1 : 1;
    }
    return a.staticOrder - b.staticOrder;
  });

  const top = matched[0]!;
  return {
    exit: top.exit,
    source: top.source,
    priority: top.priority,
    candidateId: top.candidateId,
  };
}
