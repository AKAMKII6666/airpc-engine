/**
	* Effect 参数默认值与按 effect 读取器（会话 mock）。
	* 默认值只镜像引擎 effectExecutor.ts 的缺省语义，不 import 引擎值；供面板首帧与判别键复位。
	*/
import type { KnownEffectName } from "@studio-v2/typeFiles/story/callCard/engineOutcome";
import type {
	EditorEffectParams,
	EffectParamsFor,
} from "@studio-v2/typeFiles/story/editor/callCard/editorEffectParams";

/**
	* 各 effect 的默认参数工厂；键覆盖全部 KnownEffectName（编译期强制齐全）。
	* 只写引擎有明确缺省语义的字段，其余留空表示「未配置」。
	*/
const EFFECT_PARAMS_DEFAULTS: {
	[E in KnownEffectName]: () => EffectParamsFor<E>;
} = {
	set_character_unlocked: () => ({
		effect: "set_character_unlocked",
		unlocked: true,
	}),
	attach_call_card: () => ({ effect: "attach_call_card" }),
	set_redial_slot: () => ({ effect: "set_redial_slot" }),
	unmount_call_card: () => ({ effect: "unmount_call_card" }),
	keep_card_pending: () => ({ effect: "keep_card_pending" }),
	schedule_call_card: () => ({
		effect: "schedule_call_card",
		delayMinutes: 5,
	}),
	schedule_recurring_call: () => ({
		effect: "schedule_recurring_call",
		scheduleMode: "daily",
		hour: 9,
		minute: 0,
	}),
	create_research_commitment: () => ({
		effect: "create_research_commitment",
		notifyMode: "next_call",
	}),
	update_user_profile: () => ({ effect: "update_user_profile" }),
	patch_memory: () => ({
		effect: "patch_memory",
		layer: "semantic",
		kind: "semantic",
	}),
	set_world_fact: () => ({
		effect: "set_world_fact",
		value: "true",
		visibility: "global",
	}),
	update_npc_knowledge: () => ({
		effect: "update_npc_knowledge",
		known: true,
	}),
	end_story: () => ({ effect: "end_story" }),
	play_system_prompt: () => ({ effect: "play_system_prompt" }),
};

/** 取某 effect 的默认参数；用于切换 effect 时复位 params，保证判别键一致 */
export function defaultEffectParams(effect: KnownEffectName): EditorEffectParams {
	return EFFECT_PARAMS_DEFAULTS[effect]();
}

/**
	* 按当前 effect 读取参数并强类型收窄。
	* params 缺失或判别键不匹配（切换 effect 的过渡态）时回落默认值。
	*/
export function readEffectParams<E extends KnownEffectName>(
	effect: E,
	params: EditorEffectParams | undefined,
): EffectParamsFor<E> {
	if (params && params.effect === effect) {
		return params as EffectParamsFor<E>;
	}
	return EFFECT_PARAMS_DEFAULTS[effect]() as EffectParamsFor<E>;
}

/**
	* 解析整数输入框到 [min,max] 闭区间；供 hour/minute/delayMinutes 等标量字段复用。
	* 空串或非纯数字返回 undefined（等同「未配置」）；越界按边界夹紧，避免写入非法值。
	*/
export function parseBoundedInt(
	raw: string,
	min: number,
	max: number,
): number | undefined {
	if (raw === "" || !/^\d+$/.test(raw)) {
		return undefined;
	}
	return Math.min(max, Math.max(min, Number(raw)));
}
