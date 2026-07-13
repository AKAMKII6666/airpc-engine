/**
 * 模块名称：Stories Shell BIS
 */
"use client";

import { useEffect } from "react";
import {
  useStudioStore,
  useStudioStoreShallow,
} from "@studio/store/storeContext/studioStoreContext";
import { getStories } from "@studio/utils/ajaxHelper/studio.ajax";

export function useStoriesShellBis(): void {
  const refreshStamp = useStudioStoreShallow(function (s) {
    return s.stories.refreshStamp;
  });
  const setStoriesLoading = useStudioStore((s) => s.setStoriesLoading);
  const applyStoriesLoadResult = useStudioStore((s) => s.applyStoriesLoadResult);
  const setStoriesError = useStudioStore((s) => s.setStoriesError);
  const setSchemaDialog = useStudioStore((s) => s.setSchemaDialog);

  useEffect(
    function (): (() => void) | void {
      let cancelled = false;
      setStoriesLoading(true);
      void (async function (): Promise<void> {
        const res = await getStories();
        if (cancelled) return;
        if (!res.ok) {
          if (res.code === "SCHEMA_UNSUPPORTED") {
            setSchemaDialog({
              open: true,
              message: res.message ?? "schema unsupported",
            });
          }
          setStoriesError(res.message ?? "load stories failed");
          return;
        }
        applyStoriesLoadResult(res.data?.stories ?? []);
      })();
      return function (): void {
        cancelled = true;
      };
    },
    [
      refreshStamp,
      setStoriesLoading,
      applyStoriesLoadResult,
      setStoriesError,
      setSchemaDialog,
    ],
  );
}
