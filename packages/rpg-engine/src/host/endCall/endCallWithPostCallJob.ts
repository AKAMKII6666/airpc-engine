/**
 * endCall + PostCallJob 创建/收尾：从 createEngineHost 拆出，Host 装配只转调。
 * Free / Story 分函数，避免单函数超硬上限。
 */
import { engineError, type EngineError } from "../errors.js";
import type {
	CallSession,
	EndCallResult,
	LogRecord,
	PostCallJob,
	SaveReason,
} from "../types.js";
import type { PlayerProfile } from "../../schema/identity/profile.js";
import type { Outcome } from "../../schema/call/outcome.js";
import { OutcomeSchema } from "../../schema/call/outcome.js";
import type { WorkspaceState } from "../../workspace/loadWorkspace.js";
import { sessionIsFreeLike } from "../beginCall/gate/callNarrativeGate.js";
import type { MemoryPort } from "../../memory/types.js";
import type { EffectSink } from "../../runtime/effect/effectSink.js";
import type { EndCallContext } from "./endCallSyncPlans.js";
import {
	endFreeCallWithPostCallJob,
	endStoryCallWithPostCallJob,
} from "./endCallBranches.js";
import type { PostCallJobStorePort } from "../../ports/jobs/postCallJobStorePort.js";
import type { ScheduledCardLookup } from "../../schedule/scheduleCardReferenceResolver.js";
import type { OnVoicemailUnreadChanged } from "../../runtime/voicemail/core/ports/voicemailPorts.js";
import type { AfterHangupHook } from "../../capabilityPacks/types/contributeTypes.js";
import { runAfterHangupHooks } from "../../capabilityPacks/hooks/runAfterHangupHooks.js";

export interface EndCallHandlerDeps {
	sessions: Map<string, CallSession>;
	profiles: Map<string, PlayerProfile>;
	activeByUser: Map<string, string>;
	postCallJobs: Map<string, PostCallJob>;
	postCallJobStore: PostCallJobStorePort | null;
	getMemory: () => MemoryPort | null;
	effectSink: EffectSink;
	lookupCard: ScheduledCardLookup;
	requireWorkspace: () => WorkspaceState;
	enqueueProfileWrite: <T>(userId: string, fn: () => Promise<T>) => Promise<T>;
	saveProfile: (userId: string, reason: SaveReason) => Promise<void>;
	pushLog: (record: LogRecord) => void;
	onVoicemailUnreadChanged: OnVoicemailUnreadChanged | null;
	preloadExitCandidateScheduleTargets: (session: CallSession) => Promise<void>;
	preloadScheduleCallCardTargets: (
		effects: readonly Record<string, unknown>[],
		fallbackChapterId?: string,
	) => Promise<void>;
	mirrorPostCallJob: (job: PostCallJob) => Promise<void>;
	setPostCallJob: (
		jobId: string,
		patch: Partial<PostCallJob>,
	) => Promise<PostCallJob | null>;
	startPostCallBackgroundJob: (jobId: string) => void;
	runPostCallBackgroundJob: (jobId: string) => Promise<void>;
	/** L1 call.afterHangup：endCall outcome 后、Free/Story 分支前；缺省空 */
	afterHangupHooks?: readonly AfterHangupHook[];
	packIdByHookId?: ReadonlyMap<string, string>;
}

const ACTIVE_STATUSES = new Set<CallSession["status"]>([
	"resolving",
	"composing",
	"in_call",
	"evaluating",
	"selecting_exit",
	"executing_effects",
]);

/** 装配 endCall：校验会话后按 Free/Story 分支转调。 */
export function createEndCallHandler(deps: EndCallHandlerDeps) {
	return async function endCall(
		sessionId: string,
		outcomeInput: Outcome,
	): Promise<EndCallResult | EngineError> {
		const session = deps.sessions.get(sessionId);
		if (!session) {
			return engineError("NOT_FOUND", `session not found: ${sessionId}`);
		}
		if (!ACTIVE_STATUSES.has(session.status)) {
			return engineError(
				"ENGINE_INTERNAL",
				`session not endable: ${session.status}`,
			);
		}

		const outcome = OutcomeSchema.parse(outcomeInput);
		session.status = "evaluating";
		session.outcome = outcome;
		session.phoneFlags = { ...session.phoneFlags, ...outcome.flags };
		session.completedBeats = [...outcome.completedBeats];
		outcome.flags = { ...session.phoneFlags };

		const profile = deps.profiles.get(session.userId);
		if (!profile) {
			return engineError("NOT_FOUND", "profile missing for endCall");
		}
		const ctx: EndCallContext = {
			sessionId,
			endSession: session,
			endProfile: profile,
			outcome,
			nowIso: new Date().toISOString(),
		};

		const afterHangupEvents = await runAfterHangupHooks({
			hooks: deps.afterHangupHooks ?? [],
			userId: session.userId,
			sessionId,
			agentId: session.resolve.agentId,
			profile,
			packIdByHookId: deps.packIdByHookId,
		});
		for (const event of afterHangupEvents) {
			deps.pushLog({
				at: ctx.nowIso,
				type: event.type,
				userId: session.userId,
				payload: event,
			});
		}

		const isFree = sessionIsFreeLike({
			chapterId: session.chapterId,
			cardKind: session.frozenCard.cardKind,
			source: session.resolve.source,
		});
		if (isFree) {
			return endFreeCallWithPostCallJob(deps, ctx);
		}
		return endStoryCallWithPostCallJob(deps, ctx);
	};
}
