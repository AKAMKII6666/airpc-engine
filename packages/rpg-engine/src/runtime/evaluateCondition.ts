/**
 * 模块名称：出口条件求值（P1 子集）
 */
import type { CallCardDefinition } from "../schema/callCard.js";
import type { ExitCondition, Outcome } from "../schema/outcome.js";

export function evaluateExitCondition(
  condition: ExitCondition,
  outcome: Outcome,
  card: CallCardDefinition,
): boolean {
  switch (condition.op) {
    case "always":
      return true;
    case "and":
      return condition.items.every(function (item) {
        return evaluateExitCondition(item, outcome, card);
      });
    case "or":
      return condition.items.some(function (item) {
        return evaluateExitCondition(item, outcome, card);
      });
    case "not":
      return !evaluateExitCondition(condition.item, outcome, card);
    case "outcome_flag":
      return (outcome.flags[condition.flag] ?? false) === condition.equals;
    case "beat_completed":
      return outcome.completedBeats.includes(condition.beatId);
    case "beat_missing":
      return !outcome.completedBeats.includes(condition.beatId);
    case "all_required_beats_completed": {
      const required = card.objectives?.requiredBeats ?? [];
      return required.every(function (beatId) {
        return outcome.completedBeats.includes(beatId);
      });
    }
    default:
      return false;
  }
}
