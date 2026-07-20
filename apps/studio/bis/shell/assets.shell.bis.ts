/**
 * 模块名称：资源台列表壳
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { getAssets } from "@studio/utils/ajaxHelper/studio.ajax";
import type { IAssetMetaDto } from "@studio/types/frontEnd/assets/assets.types";

export function useAssetsShellBis(): {
  assets: IAssetMetaDto[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const [assets, setAssets] = useState<IAssetMetaDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async function (): Promise<void> {
    setLoading(true);
    const res = await getAssets();
    setLoading(false);
    if (!res.ok || !res.data) {
      setError(res.message ?? "load assets failed");
      return;
    }
    setError(null);
    setAssets(res.data.assets);
  }, []);

  useEffect(
    function (): void {
      void refresh();
    },
    [refresh],
  );

  return { assets, loading, error, refresh };
}
