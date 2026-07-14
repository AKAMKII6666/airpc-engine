/**
 * 模块名称：故事编辑器壳（加载包 + 角色 + 校验）
 */
"use client";

import { useEffect } from "react";
import {
  useStudioStore,
  useStudioStoreShallow,
} from "@studio/store/storeContext/studioStoreContext";
import {
  getCharacters,
  getStoryPackage,
  postValidatePackage,
} from "@studio/utils/ajaxHelper/studio.ajax";
import { resolveStoryLayout } from "@studio/bis/storyEditor/storyEditorLayout.bis";

export function useStoryEditorShellBis(packageId: string | undefined): void {
  const refreshStamp = useStudioStoreShallow((s) => s.storyEditor.refreshStamp);
  const applyStoryEditorLoad = useStudioStore((s) => s.applyStoryEditorLoad);
  const setStoryEditorLoading = useStudioStore((s) => s.setStoryEditorLoading);
  const setStoryEditorError = useStudioStore((s) => s.setStoryEditorError);
  const setStoryEditorValidation = useStudioStore(
    (s) => s.setStoryEditorValidation,
  );
  const setSchemaDialog = useStudioStore((s) => s.setSchemaDialog);

  useEffect(
    function (): (() => void) | void {
      if (!packageId) return;
      let cancelled = false;
      setStoryEditorLoading(true);
      setStoryEditorError(null);
      void (async function (): Promise<void> {
        const [pkgRes, charsRes] = await Promise.all([
          getStoryPackage(packageId),
          getCharacters(),
        ]);
        if (cancelled) return;
        if (!pkgRes.ok || !pkgRes.data) {
          if (pkgRes.code === "SCHEMA_UNSUPPORTED") {
            setSchemaDialog({
              open: true,
              message:
                pkgRes.message ??
                "此故事包 schemaVersion 不被当前引擎支持，请升级 Studio 或降级内容。",
            });
          }
          setStoryEditorError(pkgRes.message ?? "load package failed");
          return;
        }
        const { conf, layout, cards } = pkgRes.data;
        const resolvedLayout = resolveStoryLayout(conf, layout);
        applyStoryEditorLoad({
          packageId,
          title: conf.title ?? packageId,
          conf,
          layout: resolvedLayout,
          cards,
          characters: charsRes.ok ? (charsRes.data?.characters ?? []) : [],
        });

        const valRes = await postValidatePackage(packageId);
        if (cancelled) return;
        if (valRes.ok && valRes.data) {
          setStoryEditorValidation(valRes.data.report);
        }
      })();
      return function (): void {
        cancelled = true;
      };
    },
    [
      packageId,
      refreshStamp,
      applyStoryEditorLoad,
      setStoryEditorLoading,
      setStoryEditorError,
      setStoryEditorValidation,
      setSchemaDialog,
    ],
  );
}
