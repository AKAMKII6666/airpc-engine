/**
 * 模块名称：故事包详情壳（P3 只读占位）
 */
"use client";

import { useEffect } from "react";
import {
  useStudioStore,
  useStudioStoreShallow,
} from "@studio/store/storeContext/studioStoreContext";
import { getStoryPackage } from "@studio/utils/ajaxHelper/studio.ajax";

export function useStoriesPackageShellBis(packageId: string | undefined): void {
  const refreshStamp = useStudioStoreShallow(
    (s) => s.stories.packageDetailRefreshStamp,
  );
  const setStoriesPackageDetail = useStudioStore(
    (s) => s.setStoriesPackageDetail,
  );
  const setStoriesPackageDetailLoading = useStudioStore(
    (s) => s.setStoriesPackageDetailLoading,
  );
  const setStoriesPackageDetailError = useStudioStore(
    (s) => s.setStoriesPackageDetailError,
  );

  useEffect(
    function (): (() => void) | void {
      if (!packageId) return;
      let cancelled = false;
      setStoriesPackageDetailLoading(true);
      setStoriesPackageDetailError(null);
      void (async function (): Promise<void> {
        const res = await getStoryPackage(packageId);
        if (cancelled) return;
        setStoriesPackageDetailLoading(false);
        if (!res.ok || !res.data) {
          setStoriesPackageDetailError(res.message ?? "load package failed");
          return;
        }
        setStoriesPackageDetail({
          packageId,
          title: res.data.conf.title ?? packageId,
          cardIds: res.data.conf.cards.map((c) => c.cardId),
        });
      })();
      return function (): void {
        cancelled = true;
      };
    },
    [
      packageId,
      refreshStamp,
      setStoriesPackageDetail,
      setStoriesPackageDetailLoading,
      setStoriesPackageDetailError,
    ],
  );
}
