/**
 * 模块名称：故事包列表 CRUD bis
 */
"use client";

import { useState } from "react";
import { useStudioStore } from "@studio/store/storeContext/studioStoreContext";
import {
  deleteStoryPackage,
  patchStoryPackage,
  postCreateStory,
} from "@studio/utils/ajaxHelper/studio.ajax";

export function useStoriesCrudBis() {
  const bumpStoriesRefreshStamp = useStudioStore(
    (s) => s.bumpStoriesRefreshStamp,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createStory(input: {
    packageId: string;
    title?: string;
  }): Promise<boolean> {
    setBusy(true);
    setError(null);
    const res = await postCreateStory(input);
    setBusy(false);
    if (!res.ok) {
      setError(res.message ?? "创建失败");
      return false;
    }
    bumpStoriesRefreshStamp();
    return true;
  }

  async function renameStory(
    packageId: string,
    input: { newPackageId?: string; title?: string },
  ): Promise<boolean> {
    setBusy(true);
    setError(null);
    const res = await patchStoryPackage(packageId, input);
    setBusy(false);
    if (!res.ok) {
      setError(res.message ?? "重命名失败");
      return false;
    }
    bumpStoriesRefreshStamp();
    return true;
  }

  async function removeStory(packageId: string): Promise<boolean> {
    setBusy(true);
    setError(null);
    const res = await deleteStoryPackage(packageId);
    setBusy(false);
    if (!res.ok) {
      setError(res.message ?? "删除失败");
      return false;
    }
    bumpStoriesRefreshStamp();
    return true;
  }

  return { busy, error, setError, createStory, renameStory, removeStory };
}
