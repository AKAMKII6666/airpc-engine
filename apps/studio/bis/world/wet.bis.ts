/**
 * 模块名称：世界台 WET — 查询／受控追加／重放
 */
"use client";

import { useCallback, useState } from "react";
import {
  appendWetEvent,
  getWetReplay,
  queryWetEvents,
} from "@studio/utils/ajaxHelper/studio.ajax";
import type {
  IWetEventDto,
  IWetReplayDto,
} from "@studio/types/frontEnd/world/world.types";

export function useWorldWetBis(): {
  events: IWetEventDto[];
  storageNote: string;
  filterType: string;
  filterSessionId: string;
  filterSince: string;
  filterUntil: string;
  appendType: "wet.annotation" | "wet.compensation";
  appendSessionId: string;
  appendNote: string;
  replay: IWetReplayDto | null;
  busy: boolean;
  error: string | null;
  setFilterType: (v: string) => void;
  setFilterSessionId: (v: string) => void;
  setFilterSince: (v: string) => void;
  setFilterUntil: (v: string) => void;
  setAppendType: (v: "wet.annotation" | "wet.compensation") => void;
  setAppendSessionId: (v: string) => void;
  setAppendNote: (v: string) => void;
  query: () => Promise<void>;
  append: () => Promise<void>;
  loadReplay: (sessionId?: string) => Promise<void>;
} {
  const [events, setEvents] = useState<IWetEventDto[]>([]);
  const [storageNote, setStorageNote] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterSessionId, setFilterSessionId] = useState("");
  const [filterSince, setFilterSince] = useState("");
  const [filterUntil, setFilterUntil] = useState("");
  const [appendType, setAppendType] = useState<
    "wet.annotation" | "wet.compensation"
  >("wet.annotation");
  const [appendSessionId, setAppendSessionId] = useState("");
  const [appendNote, setAppendNote] = useState("");
  const [replay, setReplay] = useState<IWetReplayDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = useCallback(async function (): Promise<void> {
    setBusy(true);
    setError(null);
    const res = await queryWetEvents({
      type: filterType.trim() || undefined,
      sessionId: filterSessionId.trim() || undefined,
      since: filterSince.trim() || undefined,
      until: filterUntil.trim() || undefined,
      limit: 100,
    });
    setBusy(false);
    if (!res.ok || !res.data) {
      setError(res.message ?? "WET 查询失败");
      return;
    }
    setEvents(res.data.events);
    setStorageNote(res.data.storageNote);
  }, [filterType, filterSessionId, filterSince, filterUntil]);

  const append = useCallback(async function (): Promise<void> {
    setBusy(true);
    setError(null);
    const res = await appendWetEvent({
      type: appendType,
      note: appendNote,
      sessionId: appendSessionId.trim() || undefined,
    });
    setBusy(false);
    if (!res.ok || !res.data) {
      setError(res.message ?? "WET 追加失败");
      return;
    }
    setAppendNote("");
    await query();
  }, [appendType, appendNote, appendSessionId, query]);

  const loadReplay = useCallback(
    async function (sessionId?: string): Promise<void> {
      const id = (sessionId ?? filterSessionId).trim();
      if (!id) {
        setError("重放需要 sessionId");
        return;
      }
      setBusy(true);
      setError(null);
      const res = await getWetReplay(id);
      setBusy(false);
      if (!res.ok || !res.data) {
        setError(res.message ?? "重放加载失败");
        setReplay(null);
        return;
      }
      setReplay(res.data);
      setFilterSessionId(id);
    },
    [filterSessionId],
  );

  return {
    events,
    storageNote,
    filterType,
    filterSessionId,
    filterSince,
    filterUntil,
    appendType,
    appendSessionId,
    appendNote,
    replay,
    busy,
    error,
    setFilterType,
    setFilterSessionId,
    setFilterSince,
    setFilterUntil,
    setAppendType,
    setAppendSessionId,
    setAppendNote,
    query,
    append,
    loadReplay,
  };
}
