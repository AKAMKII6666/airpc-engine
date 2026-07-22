/**
	* 出口 Effect 专属面板分发器：按 effect 名路由到具体参数面板。
	* 已覆盖全部 14 种 effect（含 attach/unmount 连线子型走 MountEffectPanel）；未知名回落占位面板。
	* 用查表替代 switch，避免圈复杂度堆叠。
	*/
"use client";

import type { FC } from "react";
import type { KnownEffectName } from "@airpc/rpg-engine";
import type { EffectPanelSlotProps } from "@studio-v2/src/pageComponents/storyEditor/com/panel/ExitListEditor/com/effects/effectPanelSlot";
// 引用了KeepCardPendingEffectPanel组件，用于 keep_card_pending 无参说明
import { KeepCardPendingEffectPanel } from "@studio-v2/src/pageComponents/storyEditor/com/panel/ExitListEditor/com/effects/KeepCardPendingEffectPanel";
// 引用了PendingEffectPanel组件，用于未落地 effect 的占位
import { PendingEffectPanel } from "@studio-v2/src/pageComponents/storyEditor/com/panel/ExitListEditor/com/effects/PendingEffectPanel";
// 引用了ScheduleCallCardEffectPanel组件，用于 schedule_call_card 面板
import { ScheduleCallCardEffectPanel } from "@studio-v2/src/pageComponents/storyEditor/com/panel/ExitListEditor/com/effects/ScheduleCallCardEffectPanel";
// 引用了CreateResearchCommitmentEffectPanel组件，用于 create_research_commitment 面板
import { CreateResearchCommitmentEffectPanel } from "@studio-v2/src/pageComponents/storyEditor/com/panel/ExitListEditor/com/effects/CreateResearchCommitmentEffectPanel";
// 引用了UpdateUserProfileEffectPanel组件，用于 update_user_profile 面板
import { UpdateUserProfileEffectPanel } from "@studio-v2/src/pageComponents/storyEditor/com/panel/ExitListEditor/com/effects/UpdateUserProfileEffectPanel";
// 引用了SetWorldFactEffectPanel组件，用于 set_world_fact 面板
import { SetWorldFactEffectPanel } from "@studio-v2/src/pageComponents/storyEditor/com/panel/ExitListEditor/com/effects/SetWorldFactEffectPanel";
// 引用了CreateVoicemailEffectPanel组件，用于 create_voicemail 面板
import { CreateVoicemailEffectPanel } from "@studio-v2/src/pageComponents/storyEditor/com/panel/ExitListEditor/com/effects/CreateVoicemailEffectPanel";
// 引用了PlaySystemPromptEffectPanel组件，用于 play_system_prompt 面板
import { PlaySystemPromptEffectPanel } from "@studio-v2/src/pageComponents/storyEditor/com/panel/ExitListEditor/com/effects/PlaySystemPromptEffectPanel";
// 引用了ScheduleRecurringCallEffectPanel组件，用于 schedule_recurring_call 面板
import { ScheduleRecurringCallEffectPanel } from "@studio-v2/src/pageComponents/storyEditor/com/panel/ExitListEditor/com/effects/ScheduleRecurringCallEffectPanel";
// 引用了EndStoryEffectPanel组件，用于 end_story 复合面板
import { EndStoryEffectPanel } from "@studio-v2/src/pageComponents/storyEditor/com/panel/ExitListEditor/com/effects/EndStoryEffectPanel";
// 引用了SetCharacterUnlockedEffectPanel组件，用于 set_character_unlocked 面板
import { SetCharacterUnlockedEffectPanel } from "@studio-v2/src/pageComponents/storyEditor/com/panel/ExitListEditor/com/effects/SetCharacterUnlockedEffectPanel";
// 引用了SetRedialSlotEffectPanel组件，用于 set_redial_slot 面板
import { SetRedialSlotEffectPanel } from "@studio-v2/src/pageComponents/storyEditor/com/panel/ExitListEditor/com/effects/SetRedialSlotEffectPanel";
// 引用了PatchMemoryEffectPanel组件，用于 patch_memory 面板
import { PatchMemoryEffectPanel } from "@studio-v2/src/pageComponents/storyEditor/com/panel/ExitListEditor/com/effects/PatchMemoryEffectPanel";
// 引用了UpdateNpcKnowledgeEffectPanel组件，用于 update_npc_knowledge 面板
import { UpdateNpcKnowledgeEffectPanel } from "@studio-v2/src/pageComponents/storyEditor/com/panel/ExitListEditor/com/effects/UpdateNpcKnowledgeEffectPanel";
// 引用了MountEffectPanel组件，用于 attach_call_card / unmount_call_card 连线同步面板
import { MountEffectPanel } from "@studio-v2/src/pageComponents/storyEditor/com/panel/ExitListEditor/com/effects/mount/MountEffectPanel";

export type ExitEffectPanelProps = EffectPanelSlotProps;

/** 已落地专属面板的 effect → 组件；未知名回落占位面板 */
const EFFECT_PANEL_BY_NAME: Partial<
	Record<KnownEffectName, FC<EffectPanelSlotProps>>
> = {
	attach_call_card: MountEffectPanel,
	unmount_call_card: MountEffectPanel,
	schedule_call_card: ScheduleCallCardEffectPanel,
	schedule_recurring_call: ScheduleRecurringCallEffectPanel,
	create_research_commitment: CreateResearchCommitmentEffectPanel,
	update_user_profile: UpdateUserProfileEffectPanel,
	set_world_fact: SetWorldFactEffectPanel,
	create_voicemail: CreateVoicemailEffectPanel,
	play_system_prompt: PlaySystemPromptEffectPanel,
	end_story: EndStoryEffectPanel,
	set_character_unlocked: SetCharacterUnlockedEffectPanel,
	set_redial_slot: SetRedialSlotEffectPanel,
	patch_memory: PatchMemoryEffectPanel,
	update_npc_knowledge: UpdateNpcKnowledgeEffectPanel,
};

export const ExitEffectPanel: FC<ExitEffectPanelProps> =
	function ExitEffectPanel({
		// effect 是当前行 effect 名，用于选择专属面板
		effect,
		// params 是当前行参数投影，用于透传给面板
		params,
		// sources 是 id 下拉候选源，用于透传给面板
		sources,
		// onParamsChange 是参数写回，用于透传给面板
		onParamsChange,
	}) {
		if (effect === "keep_card_pending") {
			// 引用了KeepCardPendingEffectPanel组件，用于无参说明
			return <KeepCardPendingEffectPanel />;
		}
		const Panel = EFFECT_PANEL_BY_NAME[effect];
		if (!Panel) {
			// 引用了PendingEffectPanel组件，用于未落地面板占位
			return <PendingEffectPanel effect={effect} />;
		}
		return (
			// 引用了Panel组件，用于渲染当前 effect 的专属面板
			<Panel
				effect={effect}
				params={params}
				sources={sources}
				onParamsChange={onParamsChange}
			/>
		);
	};
