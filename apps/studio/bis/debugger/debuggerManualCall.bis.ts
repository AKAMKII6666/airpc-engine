/**
 * 模块名称：Debugger Manual 挂机 bis
 */
"use client";

import { useCallback } from "react";
import {
  useStudioStore,
  useStudioStoreShallow,
} from "@studio/store/storeContext/studioStoreContext";
import {
  postBeginCall,
  postEndCall,
} from "@studio/utils/ajaxHelper/studio.ajax";

export function useDebuggerManualCallBis() {
  const {
    packageId,
    cardId,
    sessionId,
    answeredCompleted,
    beatChecked,
  } = useStudioStoreShallow(function (s) {
    return {
      packageId: s.debugger.packageId,
      cardId: s.debugger.cardId,
      sessionId: s.debugger.sessionId,
      answeredCompleted: s.debugger.answeredCompleted,
      beatChecked: s.debugger.beatChecked,
    };
  });
  const setDebuggerSessionId = useStudioStore((s) => s.setDebuggerSessionId);
  const setDebuggerEndResult = useStudioStore((s) => s.setDebuggerEndResult);
  const setDebuggerError = useStudioStore((s) => s.setDebuggerError);
  const setDebuggerLoading = useStudioStore((s) => s.setDebuggerLoading);
  const bumpDebuggerRefreshStamp = useStudioStore(
    (s) => s.bumpDebuggerRefreshStamp,
  );

  const beginCall = useCallback(
    async function (): Promise<void> {
      setDebuggerLoading(true);
      setDebuggerError(null);
      const localNowIso = new Date().toISOString();
      const res = await postBeginCall({
        packageId,
        cardId,
        localNowIso,
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
      packageId,
      cardId,
      setDebuggerLoading,
      setDebuggerError,
      setDebuggerSessionId,
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
      const completedBeats = beatChecked
        ? cardId === "xiaoyu_waiting_user"
          ? ["first_hello_done"]
          : ["user_knows_to_call_xiaoyu"]
        : [];
      const res = await postEndCall({
        sessionId,
        outcome: {
          flags: { answered_completed: answeredCompleted },
          completedBeats,
          missedRequiredBeats: beatChecked
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
      beatChecked,
      cardId,
      answeredCompleted,
      setDebuggerLoading,
      setDebuggerError,
      setDebuggerEndResult,
      setDebuggerSessionId,
      bumpDebuggerRefreshStamp,
    ],
  );

  return { beginCall, endCall };
}
