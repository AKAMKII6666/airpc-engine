/**
 * 模块名称：角色列表壳
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { getCharacters } from "@studio/utils/ajaxHelper/studio.ajax";
import type { ICharacterSummary } from "@studio/types/frontEnd/store/studioStore.types";

export function useCharactersShellBis(): {
  characters: ICharacterSummary[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const [characters, setCharacters] = useState<ICharacterSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async function (): Promise<void> {
    setLoading(true);
    const res = await getCharacters();
    setLoading(false);
    if (!res.ok || !res.data) {
      setError(res.message ?? "load characters failed");
      return;
    }
    setError(null);
    setCharacters(res.data.characters);
  }, []);

  useEffect(
    function (): void {
      void refresh();
    },
    [refresh],
  );

  return { characters, loading, error, refresh };
}
