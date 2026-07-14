/**
 * 模块名称：UserGate 选择用户 bis
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { useStudioStore } from "@studio/store/storeContext/studioStoreContext";
import {
  deleteUserApi,
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
  createUser: (
    userId: string,
    nickname: string,
    location?: {
      country: string;
      province: string;
      city: string;
    },
  ) => Promise<boolean>;
  deleteUser: (userId: string) => Promise<boolean>;
  reload: () => void;
}

export function useUserGateBis(): IUserGateBisResult {
  const [users, setUsers] = useState<UserSummaryDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const setLayoutUserId = useStudioStore((s) => s.setLayoutUserId);
  const userId = useStudioStore((s) => s.layout.userId);

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
    async function (id: string): Promise<boolean> {
      const res = await postSelectUser(id);
      if (!res.ok) {
        setError(res.message ?? "select failed");
        return false;
      }
      const hit = users.find((u) => u.userId === id);
      setLayoutUserId(id, hit?.nickname ?? null);
      return true;
    },
    [users, setLayoutUserId],
  );

  const createUser = useCallback(
    async function (
      id: string,
      nickname: string,
      location?: { country: string; province: string; city: string },
    ): Promise<boolean> {
      const res = await postCreateUser({ userId: id, nickname, location });
      if (!res.ok) {
        setError(res.message ?? "create failed");
        return false;
      }
      setTick(function (n) {
        return n + 1;
      });
      return selectUser(id);
    },
    [selectUser],
  );

  const deleteUser = useCallback(
    async function (id: string): Promise<boolean> {
      if (
        typeof window !== "undefined" &&
        !window.confirm(`确认删除用户 ${id}？不可恢复。`)
      ) {
        return false;
      }
      const res = await deleteUserApi(id);
      if (!res.ok) {
        setError(res.message ?? "delete failed");
        return false;
      }
      if (userId === id) {
        setLayoutUserId(null, null);
      }
      setTick(function (n) {
        return n + 1;
      });
      return true;
    },
    [userId, setLayoutUserId],
  );

  return {
    users,
    loading,
    error,
    selectUser,
    createUser,
    deleteUser,
    reload: function (): void {
      setTick(function (n) {
        return n + 1;
      });
    },
  };
}
