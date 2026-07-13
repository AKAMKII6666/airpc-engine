/**
 * 模块名称：Studio Layout Shell BIS
 */
"use client";

import { useEffect } from "react";
import {
  useStudioStore,
  useStudioStoreShallow,
} from "@studio/store/storeContext/studioStoreContext";
import { getUsers } from "@studio/utils/ajaxHelper/studio.ajax";

/**
 * Layout shell：同步 cookie 用户昵称到 store（若已有 userId）。
 */
export function useStudioLayoutShellBis(): void {
  const userId = useStudioStoreShallow(function (s) {
    return s.layout.userId;
  });
  const setLayoutUserId = useStudioStore(function (s) {
    return s.setLayoutUserId;
  });

  useEffect(
    function (): void {
      if (!userId) return;
      void (async function (): Promise<void> {
        const res = await getUsers();
        if (!res.ok || !res.data) return;
        const hit = res.data.users.find(function (u) {
          return u.userId === userId;
        });
        if (hit) {
          setLayoutUserId(hit.userId, hit.nickname);
        }
      })();
    },
    [userId, setLayoutUserId],
  );
}
