/**
 * 模块名称：ExitSelector（静态出口；P1 无动态候选）
 */
import type { CallCardDefinition, CallCardExit } from "../schema/callCard.js";
import type { Outcome } from "../schema/outcome.js";
import { evaluateExitCondition } from "./evaluateCondition.js";

export interface SelectedExit {
  exit: CallCardExit;
  source: "static";
  priority: number;
}

/**
 * 在匹配出口中取 priority 最高者；同 priority 取定义序更靠前的静态出口。
 */
export function selectExit(
  card: CallCardDefinition,
  outcome: Outcome,
): SelectedExit | null {
  const matched: SelectedExit[] = [];
  for (const exit of card.exits) {
    if (evaluateExitCondition(exit.condition, outcome, card)) {
      matched.push({
        exit,
        source: "static",
        priority: exit.priority,
      });
    }
  }
  if (matched.length === 0) {
    return null;
  }
  matched.sort(function (a, b) {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    return 0;
  });
  return matched[0] ?? null;
}
