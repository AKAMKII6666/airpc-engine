/**
 * 模块名称：世界台 Shell — 依赖选中用户灌入 Profile.world
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { useStudioStoreShallow } from "@studio/store/storeContext/studioStoreContext";
import { getWorldSnapshot } from "@studio/utils/ajaxHelper/studio.ajax";
import type { IWorldSnapshotDto } from "@studio/types/frontEnd/world/world.types";

export function useWorldShellBis(): {
  snapshot: IWorldSnapshotDto | null;
  loading: boolean;
  error: string | null;
  userId: string | null;
  refresh: () => Promise<void>;
} {
  const { userId } = useStudioStoreShallow(function (s) {
    return { userId: s.layout.userId };
  });
  const [snapshot, setSnapshot] = useState<IWorldSnapshotDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async function (): Promise<void> {
    if (!userId) {
      setSnapshot(null);
      setError(null);
      return;
    }
    setLoading(true);
    const res = await getWorldSnapshot();
    setLoading(false);
    if (!res.ok || !res.data) {
      setError(res.message ?? "load world failed");
      setSnapshot(null);
      return;
    }
    setError(null);
    setSnapshot(res.data);
  }, [userId]);

  useEffect(
    function (): void {
      void refresh();
    },
    [refresh],
  );

  return { snapshot, loading, error, userId, refresh };
}
