/**
 * 模块名称：collectReferencedAgentIds（路径 B · 派生本包引用角色）
 *
 * 从 conf + cards 扫描 ownerAgentId 与 effects 内 agentId（含 end_story.next），
 * 供 validatePackage 与 Studio 派生 characterCount；不读 conf.participants 白名单。
 */
import type { CallCardDefinition, StoryPackageConf } from "../schema/callCard.js";
import type { Effect } from "../schema/outcome.js";

/** 校验/编辑器共用的故事包内容切片（不含 layout） */
export interface StoryPackageContentBundle {
  conf: StoryPackageConf;
  cards: CallCardDefinition[];
}

function addAgentIdField(raw: unknown, ids: Set<string>): void {
  if (typeof raw !== "object" || raw === null) return;
  const agentId = (raw as { agentId?: unknown }).agentId;
  if (typeof agentId === "string" && agentId.length > 0) {
    ids.add(agentId);
  }
}

/** 单条 Effect：顶层 agentId + end_story.next.agentId */
function collectFromEffect(effect: Effect, ids: Set<string>): void {
  addAgentIdField(effect, ids);
  if (effect.effect === "end_story") {
    addAgentIdField((effect as { next?: unknown }).next, ids);
  }
}

/**
 * 派生本包内容引用的 agentId 集合（去重）。
 * 与 validatePackage 角色校验口径一致；遗留 participants 不参与。
 */
export function collectReferencedAgentIds(
  bundle: StoryPackageContentBundle,
): Set<string> {
  const ids = new Set<string>();
  for (const card of bundle.cards) {
    if (card.ownerAgentId) {
      ids.add(card.ownerAgentId);
    }
    for (const exit of card.exits) {
      for (const effect of exit.effects) {
        collectFromEffect(effect, ids);
      }
    }
  }
  return ids;
}
