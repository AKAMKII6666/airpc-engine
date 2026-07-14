/**
 * 模块名称：Debugger Shell BIS
 */
"use client";

import { useEffect } from "react";
import {
  useStudioStore,
  useStudioStoreShallow,
} from "@studio/store/storeContext/studioStoreContext";
import { getDebugSnapshot } from "@studio/utils/ajaxHelper/studio.ajax";

export function useDebuggerShellBis(): void {
  const { userId, refreshStamp } = useStudioStoreShallow(function (s) {
    return {
      userId: s.layout.userId,
      refreshStamp: s.debugger.refreshStamp,
    };
  });
  const setDebuggerLoading = useStudioStore((s) => s.setDebuggerLoading);
  const applyDebuggerSnapshot = useStudioStore((s) => s.applyDebuggerSnapshot);
  const setDebuggerError = useStudioStore((s) => s.setDebuggerError);
  const setSchemaDialog = useStudioStore((s) => s.setSchemaDialog);

  useEffect(
    function (): (() => void) | void {
      if (!userId) return;
      let cancelled = false;
      setDebuggerLoading(true);
      void (async function (): Promise<void> {
        const res = await getDebugSnapshot(userId);
        if (cancelled) return;
        if (!res.ok || !res.data) {
          if (res.code === "SCHEMA_UNSUPPORTED") {
            setSchemaDialog({
              open: true,
              message:
                res.message ??
                "调试入口检测到 schemaVersion 不兼容，请升级 Studio 或降级内容。",
            });
          }
          setDebuggerError(res.message ?? "snapshot failed");
          return;
        }
        applyDebuggerSnapshot(res.data);
      })();
      return function (): void {
        cancelled = true;
      };
    },
    [
      userId,
      refreshStamp,
      setDebuggerLoading,
      applyDebuggerSnapshot,
      setDebuggerError,
      setSchemaDialog,
    ],
  );
}
