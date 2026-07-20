/**
 * 模块名称：Debugger Manual / Free 挂机 + 工具 bis
 */
"use client";

import { useCallback } from "react";
import {
  useStudioStore,
  useStudioStoreContext,
  useStudioStoreShallow,
} from "@studio/store/storeContext/studioStoreContext";
import {
  postAdvanceClock,
  postBeginCall,
  postBootstrapLore,
  postCompletePlayback,
  postDebugChat,
  postEndCall,
  postInvokeTool,
  postSimEvent,
} from "@studio/utils/ajaxHelper/studio.ajax";

export function useDebuggerManualCallBis() {
  const storeApi = useStudioStoreContext();
  const {
    callMode,
    packageId,
    cardId,
    agentId,
    sessionId,
    answeredCompleted,
    beatChecked,
    outcomeExtraFlags,
    localTimeOverrideEnabled,
    localNowIsoOverride,
    timeZone,
    toolId,
    toolTargetAgentId,
    memorySearchQuery,
    clockDeltaMinutes,
    chatDraft,
  } = useStudioStoreShallow(function (s) {
    return {
      callMode: s.debugger.callMode,
      packageId: s.debugger.packageId,
      cardId: s.debugger.cardId,
      agentId: s.debugger.agentId,
      sessionId: s.debugger.sessionId,
      answeredCompleted: s.debugger.answeredCompleted,
      beatChecked: s.debugger.beatChecked,
      outcomeExtraFlags: s.debugger.outcomeExtraFlags,
      localTimeOverrideEnabled: s.debugger.localTimeOverrideEnabled,
      localNowIsoOverride: s.debugger.localNowIsoOverride,
      timeZone: s.debugger.timeZone,
      toolId: s.debugger.toolId,
      toolTargetAgentId: s.debugger.toolTargetAgentId,
      memorySearchQuery: s.debugger.memorySearchQuery,
      clockDeltaMinutes: s.debugger.clockDeltaMinutes,
      chatDraft: s.debugger.chatDraft,
    };
  });
  const setDebuggerSessionId = useStudioStore((s) => s.setDebuggerSessionId);
  const setDebuggerEndResult = useStudioStore((s) => s.setDebuggerEndResult);
  const setDebuggerLastToolResult = useStudioStore(
    (s) => s.setDebuggerLastToolResult,
  );
  const setDebuggerLastSimEvent = useStudioStore(
    (s) => s.setDebuggerLastSimEvent,
  );
  const setDebuggerChatTurns = useStudioStore((s) => s.setDebuggerChatTurns);
  const setDebuggerChatDraft = useStudioStore((s) => s.setDebuggerChatDraft);
  const setDebuggerChatStreaming = useStudioStore(
    (s) => s.setDebuggerChatStreaming,
  );
  const setDebuggerError = useStudioStore((s) => s.setDebuggerError);
  const setDebuggerLoading = useStudioStore((s) => s.setDebuggerLoading);
  const bumpDebuggerRefreshStamp = useStudioStore(
    (s) => s.bumpDebuggerRefreshStamp,
  );

  const beginCall = useCallback(
    async function (): Promise<void> {
      setDebuggerLoading(true);
      setDebuggerError(null);
      const localNowIso = localTimeOverrideEnabled
        ? localNowIsoOverride
        : new Date().toISOString();
      const res =
        callMode === "free"
          ? await postBeginCall({
              mode: "free",
              agentId,
              localNowIso,
              timeZone,
            })
          : await postBeginCall({
              mode: "story",
              packageId,
              cardId,
              localNowIso,
              timeZone,
            });
      setDebuggerLoading(false);
      if (!res.ok || !res.data) {
        setDebuggerError(res.message ?? "beginCall failed");
        return;
      }
      setDebuggerSessionId(res.data.sessionId);
      bumpDebuggerRefreshStamp();
    },
    [
      callMode,
      packageId,
      cardId,
      agentId,
      localTimeOverrideEnabled,
      localNowIsoOverride,
      timeZone,
      setDebuggerLoading,
      setDebuggerError,
      setDebuggerSessionId,
      bumpDebuggerRefreshStamp,
    ],
  );

  const invokeTool = useCallback(
    async function (): Promise<void> {
      if (!sessionId) {
        setDebuggerError("no active session");
        return;
      }
      setDebuggerLoading(true);
      setDebuggerError(null);
      const args: Record<string, unknown> =
        toolId === "search_memory"
          ? { text_query: memorySearchQuery, max_results: 5 }
          : toolId === "get_memory_by_id"
            ? { entry_id: memorySearchQuery }
            : toolId === "share_expert_number" || toolId === "refer_to_expert"
              ? { target_agent_id: toolTargetAgentId }
              : {};
      const res = await postInvokeTool({
        sessionId,
        toolId,
        args,
      });
      setDebuggerLoading(false);
      if (!res.ok || !res.data) {
        setDebuggerError(res.message ?? "invokeTool failed");
        bumpDebuggerRefreshStamp();
        return;
      }
      setDebuggerLastToolResult(res.data);
      bumpDebuggerRefreshStamp();
    },
    [
      sessionId,
      toolId,
      toolTargetAgentId,
      memorySearchQuery,
      setDebuggerLoading,
      setDebuggerError,
      setDebuggerLastToolResult,
      bumpDebuggerRefreshStamp,
    ],
  );

  const endCall = useCallback(
    async function (): Promise<void> {
      if (!sessionId) {
        setDebuggerError("no active session");
        return;
      }
      setDebuggerLoading(true);
      setDebuggerError(null);
      const completedBeats =
        callMode === "free"
          ? []
          : beatChecked
            ? cardId === "xiaoyu_waiting_user"
              ? ["first_hello_done"]
              : ["user_knows_to_call_xiaoyu"]
            : [];
      const res = await postEndCall({
        sessionId,
        outcome: {
          flags: {
            answered_completed: answeredCompleted,
            ...outcomeExtraFlags,
          },
          completedBeats,
          missedRequiredBeats:
            callMode === "free"
              ? []
              : beatChecked
                ? []
                : cardId === "xiaoyu_waiting_user"
                  ? ["first_hello_done"]
                  : ["user_knows_to_call_xiaoyu"],
        },
      });
      setDebuggerLoading(false);
      if (!res.ok) {
        setDebuggerError(res.message ?? "endCall failed");
        bumpDebuggerRefreshStamp();
        return;
      }
      setDebuggerEndResult(res.data);
      setDebuggerSessionId(null);
      bumpDebuggerRefreshStamp();
    },
    [
      sessionId,
      callMode,
      beatChecked,
      cardId,
      answeredCompleted,
      outcomeExtraFlags,
      setDebuggerLoading,
      setDebuggerError,
      setDebuggerEndResult,
      setDebuggerSessionId,
      bumpDebuggerRefreshStamp,
    ],
  );

  const completePlayback = useCallback(
    async function (): Promise<void> {
      if (!sessionId) {
        setDebuggerError("no active session");
        return;
      }
      setDebuggerLoading(true);
      setDebuggerError(null);
      const res = await postCompletePlayback({ sessionId });
      setDebuggerLoading(false);
      if (!res.ok) {
        setDebuggerError(res.message ?? "completePlayback failed");
        bumpDebuggerRefreshStamp();
        return;
      }
      bumpDebuggerRefreshStamp();
    },
    [
      sessionId,
      setDebuggerLoading,
      setDebuggerError,
      bumpDebuggerRefreshStamp,
    ],
  );

  const simEvent = useCallback(
    async function (
      kind: "silence_timeout" | "call_duration_threshold" | "pre_hangup_hint",
    ): Promise<void> {
      if (!sessionId) {
        setDebuggerError("no active session");
        return;
      }
      setDebuggerLoading(true);
      setDebuggerError(null);
      const res = await postSimEvent({ sessionId, kind });
      setDebuggerLoading(false);
      if (!res.ok || !res.data) {
        setDebuggerError(res.message ?? "simEvent failed");
        bumpDebuggerRefreshStamp();
        return;
      }
      setDebuggerLastSimEvent(res.data.lastSimEvent);
      bumpDebuggerRefreshStamp();
    },
    [
      sessionId,
      setDebuggerLoading,
      setDebuggerError,
      setDebuggerLastSimEvent,
      bumpDebuggerRefreshStamp,
    ],
  );

  const advanceClock = useCallback(
    async function (): Promise<void> {
      setDebuggerLoading(true);
      setDebuggerError(null);
      const res = await postAdvanceClock({
        deltaMs: Math.max(1, clockDeltaMinutes) * 60_000,
      });
      setDebuggerLoading(false);
      if (!res.ok || !res.data) {
        setDebuggerError(res.message ?? "advanceClock failed");
        return;
      }
      bumpDebuggerRefreshStamp();
    },
    [
      clockDeltaMinutes,
      setDebuggerLoading,
      setDebuggerError,
      bumpDebuggerRefreshStamp,
    ],
  );

  const setClockMs = useCallback(
    async function (toClockMs: number): Promise<void> {
      setDebuggerLoading(true);
      setDebuggerError(null);
      const res = await postAdvanceClock({ toClockMs });
      setDebuggerLoading(false);
      if (!res.ok || !res.data) {
        setDebuggerError(res.message ?? "setClockMs failed");
        return;
      }
      bumpDebuggerRefreshStamp();
    },
    [setDebuggerLoading, setDebuggerError, bumpDebuggerRefreshStamp],
  );

  const advanceClockToNextIntent = useCallback(
    async function (): Promise<void> {
      setDebuggerLoading(true);
      setDebuggerError(null);
      const res = await postAdvanceClock({ toNextIntent: true });
      setDebuggerLoading(false);
      if (!res.ok || !res.data) {
        setDebuggerError(res.message ?? "advanceClockToNextIntent failed");
        return;
      }
      bumpDebuggerRefreshStamp();
    },
    [setDebuggerLoading, setDebuggerError, bumpDebuggerRefreshStamp],
  );

  const bootstrapLore = useCallback(
    async function (): Promise<void> {
      setDebuggerLoading(true);
      setDebuggerError(null);
      const res = await postBootstrapLore({ force: true });
      setDebuggerLoading(false);
      if (!res.ok || !res.data) {
        setDebuggerError(res.message ?? "bootstrapLore failed");
        return;
      }
      bumpDebuggerRefreshStamp();
    },
    [setDebuggerLoading, setDebuggerError, bumpDebuggerRefreshStamp],
  );

  const sendChat = useCallback(
    async function (): Promise<void> {
      if (!sessionId) {
        setDebuggerError("no active session");
        return;
      }
      const text = chatDraft.trim();
      if (!text) {
        setDebuggerError("请输入要发送的文本");
        return;
      }
      setDebuggerLoading(true);
      setDebuggerChatStreaming(true);
      setDebuggerError(null);
      const res = await postDebugChat(
        { sessionId, text },
        {
          onMessage: function (ev): void {
            if (!storeApi) return;
            if (ev.type === "user.transcript") {
              const prev = storeApi.getState().debugger.chatTurns;
              setDebuggerChatTurns([
                ...prev,
                {
                  role: "user",
                  text: ev.text,
                  at: new Date().toISOString(),
                },
              ]);
              return;
            }
            if (ev.type === "assistant.message") {
              const prev = storeApi.getState().debugger.chatTurns;
              setDebuggerChatTurns([
                ...prev,
                {
                  role: "assistant",
                  text: ev.text,
                  at: new Date().toISOString(),
                },
              ]);
            }
          },
        },
      );
      setDebuggerChatStreaming(false);
      setDebuggerLoading(false);
      if (!res.ok || !res.data) {
        setDebuggerError(
          res.message
            ? `${res.code ?? "ERROR"}: ${res.message}`
            : "chat failed",
        );
        bumpDebuggerRefreshStamp();
        return;
      }
      setDebuggerChatTurns(res.data.turns);
      setDebuggerChatDraft("");
      bumpDebuggerRefreshStamp();
    },
    [
      sessionId,
      chatDraft,
      storeApi,
      setDebuggerLoading,
      setDebuggerChatStreaming,
      setDebuggerError,
      setDebuggerChatTurns,
      setDebuggerChatDraft,
      bumpDebuggerRefreshStamp,
    ],
  );

  return {
    beginCall,
    invokeTool,
    endCall,
    completePlayback,
    simEvent,
    advanceClock,
    setClockMs,
    advanceClockToNextIntent,
    bootstrapLore,
    sendChat,
  };
}
