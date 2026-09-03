/**
 * 第一方包贡献的可执行类型（相对 types.ts 的 unknown 收窄）。
 * L1-C/D 使用；与 25 entry 语义对齐但不做动态加载。
 */
import type { PromptProvider, PromptProviderContext } from "../runtime/composer.js";
import type { PlayerProfile } from "../schema/profile.js";

export type UserLocationSnapshot = {
	country: string;
	province: string;
	city: string;
	district?: string;
};

/** begin.softExtras：返回要追加的 soft 块；null/空则跳过 */
export type SoftExtraEnricher = {
	enricherId: string;
	apply(input: {
		profile: PlayerProfile | undefined;
		userId: string;
		agentId: string;
	}): string | null;
};

/** schedule.gates：false = 推迟外呼；全部 true 才放行 */
export type ScheduleGate = {
	gateId: string;
	allow(input: {
		profile: PlayerProfile;
		nowIso: string;
	}): boolean;
};

/** call.afterHangup：endCall 同步段前部钩子（outcome 后、Free/Story 分支前；L1-D） */
export type AfterHangupHook = {
	hookId: string;
	run(input: {
		userId: string;
		sessionId: string;
		agentId: string;
		profile: PlayerProfile;
	}): void | Promise<void>;
};

/** tasks.register：包加载或挂机后向宿主登记任务（L1 仅形状；完整宿主定时属后续） */
export type TaskRegistrar = {
	taskId: string;
	register(input: { packId: string }): void;
};

/** tasks.onTick：任务到期回调形状 */
export type TaskTickHandler = {
	taskId: string;
	onTick(input: { nowIso: string; packId: string }): void | Promise<void>;
};

/** commit.context：组装 MemoryCommitInput 时的 enricher 形状 */
export type CommitContextEnricher = {
	enricherId: string;
	enrich(input: {
		userId: string;
		agentId: string;
		sessionId: string;
	}): Record<string, unknown> | null;
};

/** commit.extract：Studio 挂机抽取编排贡献点形状（server 侧） */
export type CommitExtractContributor = {
	contributorId: string;
	contribute(input: {
		userId: string;
		agentId: string;
		sessionId: string;
	}): Record<string, unknown> | null;
};

export type { PromptProvider, PromptProviderContext };
