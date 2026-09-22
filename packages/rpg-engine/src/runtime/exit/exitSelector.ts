/**
 * 模块名称：ExitSelector（静态 ∪ 动态候选）
 */
import type { CallCardDefinition, CallCardExit } from "../../schema/call/callCard.js";
import type { Outcome, Effect } from "../../schema/call/outcome.js";
import type { RuntimeExitCandidate } from "../../tools/types.js";
import { evaluateExitCondition } from "./evaluateCondition.js";

export interface SelectedExit {
  exit: CallCardExit;
  source: "static" | "dynamic";
  priority: number;
  candidateId?: string;
}

type MatchedExit = SelectedExit & { staticOrder: number };

function collectStaticExits(
  card: CallCardDefinition,
  outcome: Outcome,
): MatchedExit[] {
  const matched: MatchedExit[] = [];
  card.exits.forEach(function (exit, index) {
    if (!evaluateExitCondition(exit.condition, outcome, card)) return;
    matched.push({
      exit,
      source: "static",
      priority: exit.priority,
      staticOrder: index,
    });
  });
  return matched;
}

function matchDynamicCandidate(
  card: CallCardDefinition,
  outcome: Outcome,
  candidate: RuntimeExitCandidate,
): MatchedExit | null {
  if (candidate.exitId) {
    const staticExit = card.exits.find((exit) => exit.exitId === candidate.exitId);
    if (
      !staticExit ||
      !evaluateExitCondition(staticExit.condition, outcome, card)
    ) {
      return null;
    }
    const priority = Math.max(staticExit.priority, candidate.priority);
    return {
      exit: {
        ...staticExit,
        effects:
          candidate.effects.length > 0 ? candidate.effects : staticExit.effects,
        priority,
      },
      source: "dynamic",
      priority,
      candidateId: candidate.candidateId,
      staticOrder: Number.MAX_SAFE_INTEGER,
    };
  }
  if (candidate.effects.length === 0) return null;
  return {
    exit: {
      exitId: `dynamic:${candidate.candidateId}`,
      exitKind: "dynamic",
      title: candidate.toolId,
      priority: candidate.priority,
      condition: { op: "always" },
      effects: candidate.effects as Effect[],
    },
    source: "dynamic",
    priority: candidate.priority,
    candidateId: candidate.candidateId,
    staticOrder: Number.MAX_SAFE_INTEGER,
  };
}

function compareMatchedExit(a: MatchedExit, b: MatchedExit): number {
  if (b.priority !== a.priority) return b.priority - a.priority;
  if (a.source !== b.source) return a.source === "static" ? -1 : 1;
  return a.staticOrder - b.staticOrder;
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
  const matched = collectStaticExits(card, outcome);
  for (const candidate of candidates) {
    const dynamic = matchDynamicCandidate(card, outcome, candidate);
    if (dynamic) matched.push(dynamic);
  }
  if (matched.length === 0) return null;
  const storyProgress = matched.filter(function (item) {
    return !item.exit.exitId.startsWith("dynamic:");
  });
  const pool = storyProgress.length > 0 ? storyProgress : matched;
  pool.sort(compareMatchedExit);
  const top = pool[0]!;
  return {
    exit: top.exit,
    source: top.source,
    priority: top.priority,
    candidateId: top.candidateId,
  };
}
