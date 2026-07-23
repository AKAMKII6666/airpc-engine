/**
	* 路径 B：本包引用角色派生（lanes / 包配置 / 列表 characterCount）。
	* 算法对齐引擎 collectReferencedAgentIds；仅 import type，禁止值导入 @airpc/rpg-engine
	*（否则 Next client 会拉 better-sqlite3 / fs）。
	*/
import type { CallCardDefinition, StoryPackageConf } from "@studio-v2/typeFiles/story/callCard/engineCallCard";
/** conf+cards 切片；layout 不参与派生 */
export type ReferencedAgentsBundleSlice = {
	/** 包 conf；仅作壳字段，派生不读 participants */
	conf: StoryPackageConf;
	/** 本包已加载 CallCard；owner/effects 为引用真源 */
	cards: readonly CallCardDefinition[];
};

function addAgentIdField(raw: unknown, ids: Set<string>): void {
	if (typeof raw !== "object" || raw === null) return;
	const agentId = (raw as { agentId?: unknown }).agentId;
	if (typeof agentId === "string" && agentId.length > 0) {
		ids.add(agentId);
	}
}

/** 与引擎 collectFromEffect 同构：顶层 agentId + end_story.next.agentId */
function collectFromEffect(
	effect: { effect?: unknown; agentId?: unknown; next?: unknown },
	ids: Set<string>,
): void {
	addAgentIdField(effect, ids);
	if (effect.effect === "end_story") {
		addAgentIdField(effect.next, ids);
	}
}

/**
	* Studio 侧 collectReferencedAgentIds 镜像（纯函数）。
	* 变更时须与 packages/rpg-engine/src/validation/collectReferencedAgentIds.ts 同步。
	*/
function collectReferencedAgentIdsLocal(
	cards: readonly CallCardDefinition[],
): Set<string> {
	const ids = new Set<string>();
	for (const card of cards) {
		if (card.ownerAgentId) {
			ids.add(card.ownerAgentId);
		}
		for (const exit of card.exits ?? []) {
			for (const effect of exit.effects ?? []) {
				collectFromEffect(effect, ids);
			}
		}
	}
	return ids;
}

/** 有挂卡（owner）者排前，其余引用角色随后；稳定去重 */
function sortUsedOwnersFirst(
	agentIds: readonly string[],
	cards: readonly CallCardDefinition[],
): string[] {
	const used: string[] = [];
	const unused: string[] = [];
	for (const agentId of agentIds) {
		const hasOwnerCard = cards.some(function (c) {
			return c.ownerAgentId === agentId;
		});
		if (hasOwnerCard) used.push(agentId);
		else unused.push(agentId);
	}
	return [...used, ...unused];
}

/**
	* 本包内容引用的 agentId 列表（有卡者优先）。
	* 与引擎 validate 口径一致；遗留 participants 不入集。
	*/
export function listDerivedReferencedAgentIds(
	bundle: ReferencedAgentsBundleSlice,
): string[] {
	const ids = [...collectReferencedAgentIdsLocal(bundle.cards)];
	return sortUsedOwnersFirst(ids, bundle.cards);
}

/** Studio layout.lanes：按派生引用角色写序；引擎忽略 */
export function deriveLayoutLanes(
	bundle: ReferencedAgentsBundleSlice,
): Array<{ agentId: string; order: number }> {
	return listDerivedReferencedAgentIds(bundle).map(function (agentId, order) {
		return { agentId, order };
	});
}

/**
	* 保存写盘：去掉遗留 participants，避免再落白名单字段。
	* 内存/Zod 解析仍可有缺省 []；磁盘推荐省略键。
	*/
export function omitParticipantsForDiskWrite(
	conf: StoryPackageConf,
): Omit<StoryPackageConf, "participants"> & {
	participants?: undefined;
} {
	const { participants: _legacy, ...rest } = conf;
	void _legacy;
	return rest;
}
