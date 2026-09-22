/**
	* 调试通话 start 族命令实现（从 callSessionCommands 拆出控行数）。
	*/
import {
	postDebuggerCallStart,
	postDebuggerChapterEntryRing,
} from "@studio-v2/src/utils/ajaxProxy/debugger/api/callSession/http/callSessionApi";
import { isStudioApiErrorCode } from "@studio-v2/src/utils/ajaxHelper/studioApiClient";
import type { DebuggerCallSessionView } from "@studio-v2/typeFiles/debugger/callSession/callSession";
import type { DebuggerChapterEntryRingView } from "@studio-v2/typeFiles/debugger/callSession/callSessionResponses";
import type { StartDebuggerCallBody } from "@studio-v2/typeFiles/debugger/callSession/callSession";
import {
	errorMessage,
	type CallCommandActions,
	applyStaleCallSession,
	isStaleCallSessionError,
} from "./callSessionCommands.bis";

/** 新通话只能在无活动 session 时开始；冲突由用户显式处理。 */
async function startCallWithConflictGuard(
	actions: CallCommandActions,
	body: StartDebuggerCallBody,
): Promise<DebuggerCallSessionView | null> {
	actions.applyStarted();
	try {
		const session = await postDebuggerCallStart(body);
		actions.applyResult(session);
		return session;
	} catch (err) {
		if (isStaleCallSessionError(err)) {
			applyStaleCallSession(actions);
			return null;
		}
		if (isStudioApiErrorCode(err, "CONFLICT_ACTIVE_CALL")) {
			actions.applyFailed("已有活动通话，请先返回或显式挂断当前通话");
			return null;
		}
		if (isStudioApiErrorCode(err, "AGENT_POST_CALL_BUSY")) {
			actions.applyFailed("该角色正在处理挂机后事务，请稍后再拨");
			return null;
		}
		actions.applyFailed(errorMessage(err));
		return null;
	}
}

/** 外部电话入口：拨角色 free card，并处理挂机后占线错误 */
export async function runStartFreeCall(
	actions: CallCommandActions,
	userId: string,
	agentId: string,
): Promise<DebuggerCallSessionView | null> {
	return startCallWithConflictGuard(actions, {
		mode: "free_call",
		userId,
		agentId,
	});
}

/** 编辑器定点入口：按章节+卡启动 simulate_start */
export async function runStartSimulateCall(
	actions: CallCommandActions,
	userId: string,
	chapterId: string,
	cardId: string,
): Promise<DebuggerCallSessionView | null> {
	return startCallWithConflictGuard(actions, {
		mode: "simulate_start",
		userId,
		chapterId,
		cardId,
	});
}

/** 编辑器章节入口：按 chapter entryCardId 启动 */
export async function runStartSimulateChapterCall(
	actions: CallCommandActions,
	userId: string,
	chapterId: string,
): Promise<DebuggerCallSessionView | null> {
	return startCallWithConflictGuard(actions, {
		mode: "simulate_chapter_start",
		userId,
		chapterId,
	});
}

/**
	* 编辑器「运行调试」：outbound_auto 入口走 delay=0 来电；否则回落 simulate。
	* 不写 dialing；来电由 IncomingCallModal 消费。
	*/
export async function runStartChapterEntryRing(
	actions: CallCommandActions,
	userId: string,
	chapterId: string,
): Promise<DebuggerChapterEntryRingView | null> {
	actions.applyStarted();
	try {
		const ring = await postDebuggerChapterEntryRing({ userId, chapterId });
		if (ring.mode === "simulate_start") {
			const session = await startCallWithConflictGuard(actions, {
				mode: "simulate_chapter_start",
				userId,
				chapterId,
			});
			if (!session) return null;
			return ring;
		}
		if (ring.mode === "already_active") {
			actions.applyResult(ring.session);
			return ring;
		}
		if (ring.mode === "blocked") {
			actions.applyFailed("已有另一通来电等待处理，请先接听或拒接");
			return ring;
		}
		// 外呼未 beginCall：清 busy，保持待机等 modal
		actions.resetActiveCall();
		return ring;
	} catch (err) {
		actions.applyFailed(errorMessage(err));
		return null;
	}
}
