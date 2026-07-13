/**
 * 模块名称：UserGate 选择用户 bis
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { useStudioStore } from "@studio/store/storeContext/studioStoreContext";
import {
  getUsers,
  postCreateUser,
  postSelectUser,
  type UserSummaryDto,
} from "@studio/utils/ajaxHelper/studio.ajax";

export interface IUserGateBisResult {
  users: UserSummaryDto[];
  loading: boolean;
  error: string | null;
  selectUser: (userId: string) => Promise<boolean>;
  createUser: (userId: string, nickname: string) => Promise<boolean>;
  reload: () => void;
}

export function useUserGateBis(): IUserGateBisResult {
  const [users, setUsers] = useState<UserSummaryDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const setLayoutUserId = useStudioStore((s) => s.setLayoutUserId);

  useEffect(
    function (): void {
      setLoading(true);
      void (async function (): Promise<void> {
        const res = await getUsers();
        setLoading(false);
        if (!res.ok || !res.data) {
          setError(res.message ?? "load users failed");
          return;
        }
        setError(null);
        setUsers(res.data.users);
      })();
    },
    [tick],
  );

  const selectUser = useCallback(
    async function (userId: string): Promise<boolean> {
      const res = await postSelectUser(userId);
      if (!res.ok) {
        setError(res.message ?? "select failed");
        return false;
      }
      const hit = users.find((u) => u.userId === userId);
      setLayoutUserId(userId, hit?.nickname ?? null);
      return true;
    },
    [users, setLayoutUserId],
  );

  const createUser = useCallback(
    async function (userId: string, nickname: string): Promise<boolean> {
      const res = await postCreateUser({ userId, nickname });
      if (!res.ok) {
        setError(res.message ?? "create failed");
        return false;
      }
      setTick(function (n) {
        return n + 1;
      });
      return selectUser(userId);
    },
    [selectUser],
  );

  return {
    users,
    loading,
    error,
    selectUser,
    createUser,
    reload: function (): void {
      setTick(function (n) {
        return n + 1;
      });
    },
  };
}
