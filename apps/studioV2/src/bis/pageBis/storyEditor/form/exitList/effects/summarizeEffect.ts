/**
	* 由 effect + params 自动派生「人话」摘要（列表预览）。
	* 供出口列表预览 / 节点 Tooltip；用户手改后不再覆盖（dirty 判定见 ExitEffectsList）。
	* 纯函数：不 import 引擎值；可选 sources 仅用于把 id 换成显示名。
	*/
import type { KnownEffectName } from "@studio-v2/typeFiles/story/callCard/engineOutcome";
import type {
	EditorEffectParams,
	EffectPanelSources,
} from "@studio-v2/typeFiles/story/editor/callCard/editorEffectParams";
import type { CallCardLabelOption } from "@studio-v2/typeFiles/story/callCardLabels";
import { effectNameLabel } from "@studio-v2/typeFiles/story/callCardLabels";

/** 在候选项里把 id 换成 label；无候选或未命中时回落原 id */
function labelOf(
	options: readonly CallCardLabelOption[] | undefined,
	value: string | undefined,
): string {
	if (!value) return "";
	const hit = options?.find((opt) => opt.value === value);
	return hit?.label ?? value;
}

/** 两位补零；供时/分展示 */
function pad2(n: number): string {
	return String(n).padStart(2, "0");
}

/** 目标角色短语；有则「 给<角色>」，无则空串 */
function agentPhrase(
	agentId: string | undefined,
	sources: EffectPanelSources | undefined,
): string {
	const label = labelOf(sources?.characters, agentId);
	return label ? ` 给${label}` : "";
}

/**
	* 派生摘要主入口。为压低圈复杂度，按 effect 查表分发到各自 formatter。
	* 未登记的 effect 回落中文名；空 params 也应给出可读默认。
	*/
export function summarizeEffect(
	effect: KnownEffectName,
	params: EditorEffectParams | undefined,
	sources?: EffectPanelSources,
): string {
	const formatter = SUMMARY_BY_EFFECT[effect];
	if (!formatter) return effectNameLabel(effect);
	return formatter(params, sources);
}

/** 单 effect 摘要 formatter；params 判别键已由调用方保证一致 */
type SummaryFormatter = (
	params: EditorEffectParams | undefined,
	sources: EffectPanelSources | undefined,
) => string;

const SUMMARY_BY_EFFECT: Partial<Record<KnownEffectName, SummaryFormatter>> = {
	set_character_unlocked: (params, sources) => {
		if (params?.effect !== "set_character_unlocked") return "解锁角色";
		const who = labelOf(sources?.characters, params.agentId) || "（未选角色）";
		return params.unlocked === false ? `锁定 ${who}` : `解锁 ${who}`;
	},
	attach_call_card: (params, sources) => {
		if (params?.effect !== "attach_call_card") return "挂载通话卡";
		const card = labelOf(sources?.cards, params.cardId) || "（未选卡）";
		const who = agentPhrase(params.agentId, sources);
		// 目标 voicemail → 进信箱，与引擎 attach 分流对齐（不写 Board.pending）
		if (params.cardId && sources?.cardKindById?.[params.cardId] === "voicemail") {
			return `进信箱「${card}」${who}`.trim();
		}
		return `挂载「${card}」${who}`.trim();
	},
	unmount_call_card: (params, sources) => {
		if (params?.effect !== "unmount_call_card") return "卸载通话卡";
		const card = params.cardId
			? labelOf(sources?.cards, params.cardId)
			: "当前卡";
		return `卸载「${card}」${agentPhrase(params.agentId, sources)}`.trim();
	},
	set_redial_slot: (params, sources) => {
		if (params?.effect !== "set_redial_slot") return "设置重拨槽";
		const who = labelOf(sources?.characters, params.agentId) || "（未选角色）";
		const card = params.cardId ? labelOf(sources?.cards, params.cardId) : "";
		return card ? `重拨默认接通 ${who}（${card}）` : `重拨默认接通 ${who}`;
	},
	keep_card_pending: () => "保持当前卡待处理",
	schedule_call_card: (params, sources) => {
		if (params?.effect !== "schedule_call_card") return "调度通话卡";
		const card = labelOf(sources?.cards, params.cardId) || "（未选卡）";
		const delay = params.delayMinutes ?? 5;
		const who = agentPhrase(params.agentId, sources);
		// 目标 voicemail → 延迟进信箱，禁止写成「外呼」以免与响铃语义混淆
		if (params.cardId && sources?.cardKindById?.[params.cardId] === "voicemail") {
			return `${delay} 分钟后进信箱「${card}」${who}`.trim();
		}
		return `${delay} 分钟后外呼「${card}」${who}`.trim();
	},
	schedule_recurring_call: (params, sources) => {
		if (params?.effect !== "schedule_recurring_call") return "登记重复外呼";
		const when = `${pad2(params.hour ?? 9)}:${pad2(params.minute ?? 0)}`;
		const cycle = params.scheduleMode === "weekly" ? "每周" : "每日";
		return `${cycle} ${when} 循环外呼${agentPhrase(params.agentId, sources)}`.trim();
	},
	create_research_commitment: (params) => {
		if (params?.effect !== "create_research_commitment") return "创建研究承诺";
		return params.question ? `研究承诺：${params.question}` : "创建研究承诺";
	},
	update_user_profile: (params) => {
		if (params?.effect !== "update_user_profile") return "更新用户档案";
		return params.nickname ? `更新用户称呼为「${params.nickname}」` : "更新用户档案";
	},
	patch_memory: (params, sources) => {
		if (params?.effect !== "patch_memory") return "补丁记忆";
		const who = labelOf(sources?.characters, params.agentId) || "当前角色";
		return params.text ? `给${who}写记忆：${params.text}` : `给${who}写记忆`;
	},
	set_world_fact: (params) => {
		if (params?.effect !== "set_world_fact") return "写入世界事实";
		return params.factId
			? `世界事实 ${params.factId} = ${params.value ?? "true"}`
			: "写入世界事实";
	},
	update_npc_knowledge: (params, sources) => {
		if (params?.effect !== "update_npc_knowledge") return "更新 NPC 知识";
		const who = labelOf(sources?.characters, params.agentId) || "（未选角色）";
		const verb = params.known === false ? "忘记" : "知道";
		return params.factId ? `让${who}${verb} ${params.factId}` : `更新 ${who} 知识`;
	},
	end_story: (params, sources) => {
		if (params?.effect !== "end_story") return "结束故事";
		const nextPkg = params.next
			? labelOf(sources?.packages, params.next.packageId)
			: "";
		return nextPkg ? `结束本章，下一章：${nextPkg}` : "结束本章";
	},
	play_system_prompt: (params, sources) => {
		if (params?.effect !== "play_system_prompt") return "播放系统提示";
		const clip = labelOf(sources?.clips, params.clipId);
		return clip ? `播放系统提示「${clip}」` : "播放系统提示";
	},
};
