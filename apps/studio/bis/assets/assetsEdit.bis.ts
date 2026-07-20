/**
 * 模块名称：资源台编辑 bis
 */
"use client";

import { useCallback, useState } from "react";
import {
  deleteAssetApi,
  getAsset,
  postCreateAsset,
  putAsset,
} from "@studio/utils/ajaxHelper/studio.ajax";
import type {
  AssetKindDto,
  IAssetMetaDto,
} from "@studio/types/frontEnd/assets/assets.types";

function emptyDraft(): IAssetMetaDto {
  return {
    assetId: "",
    kind: "wav",
    uri: "files/",
    displayName: "",
    transcript: "",
  };
}

export function useAssetsEditBis() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<IAssetMetaDto>(emptyDraft);
  const [isNew, setIsNew] = useState(true);
  const [fileBase64, setFileBase64] = useState<string | undefined>(undefined);
  const [fileName, setFileName] = useState<string | null>(null);

  const selectNew = useCallback(function (): void {
    setIsNew(true);
    setDraft(emptyDraft());
    setFileBase64(undefined);
    setFileName(null);
    setError(null);
  }, []);

  const loadAsset = useCallback(async function (
    assetId: string,
  ): Promise<void> {
    setBusy(true);
    setError(null);
    const res = await getAsset(assetId);
    setBusy(false);
    if (!res.ok || !res.data) {
      setError(res.message ?? "load asset failed");
      return;
    }
    setIsNew(false);
    setDraft(res.data.asset);
    setFileBase64(undefined);
    setFileName(null);
  }, []);

  const setField = useCallback(function <K extends keyof IAssetMetaDto>(
    key: K,
    value: IAssetMetaDto[K],
  ): void {
    setDraft(function (prev) {
      const next = { ...prev, [key]: value };
      if (key === "assetId" && typeof value === "string" && isNew) {
        const id = value.trim();
        if (id && (!prev.uri || prev.uri === "files/" || prev.uri.startsWith("files/"))) {
          next.uri = `files/${id}.wav`;
        }
      }
      return next;
    });
  }, [isNew]);

  const setKind = useCallback(function (kind: AssetKindDto): void {
    setDraft(function (prev) {
      return { ...prev, kind };
    });
  }, []);

  const setLocalFile = useCallback(function (file: File | null): void {
    if (!file) {
      setFileBase64(undefined);
      setFileName(null);
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = function (): void {
      const result = reader.result;
      if (typeof result !== "string") return;
      const comma = result.indexOf(",");
      setFileBase64(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(file);
  }, []);

  const save = useCallback(async function (): Promise<boolean> {
    const assetId = draft.assetId.trim();
    if (!assetId) {
      setError("assetId 必填");
      return false;
    }
    if (!draft.uri.trim()) {
      setError("uri 必填（相对 data/assets/）");
      return false;
    }
    setBusy(true);
    setError(null);
    const payload: IAssetMetaDto = {
      ...draft,
      assetId,
      displayName: draft.displayName?.trim() || undefined,
      transcript: draft.transcript?.trim() || undefined,
    };
    const res = isNew
      ? await postCreateAsset({ asset: payload, fileBase64 })
      : await putAsset(assetId, { asset: payload, fileBase64 });
    setBusy(false);
    if (!res.ok || !res.data) {
      setError(res.message ?? "save asset failed");
      return false;
    }
    setIsNew(false);
    setDraft(res.data.asset);
    setFileBase64(undefined);
    setFileName(null);
    return true;
  }, [draft, fileBase64, isNew]);

  const remove = useCallback(async function (): Promise<boolean> {
    if (isNew || !draft.assetId) return false;
    setBusy(true);
    setError(null);
    const res = await deleteAssetApi(draft.assetId);
    setBusy(false);
    if (!res.ok) {
      setError(res.message ?? "delete asset failed");
      return false;
    }
    selectNew();
    return true;
  }, [draft.assetId, isNew, selectNew]);

  return {
    busy,
    error,
    draft,
    isNew,
    fileName,
    selectNew,
    loadAsset,
    setField,
    setKind,
    setLocalFile,
    save,
    remove,
  };
}
