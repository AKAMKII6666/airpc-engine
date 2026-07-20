/**
 * 模块名称：世界台编辑 bis（Lore / Facts / knowledge / schedule）
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  postAdvanceClock,
  postWorldBootstrap,
  putWorldFacts,
  putWorldKnowledge,
  putWorldLore,
  putWorldSchedule,
} from "@studio/utils/ajaxHelper/studio.ajax";
import type {
  IWorldFactDto,
  IWorldLoreDto,
  IWorldScheduleDto,
  IWorldSnapshotDto,
} from "@studio/types/frontEnd/world/world.types";

function emptyLore(): IWorldLoreDto {
  return {
    version: 1,
    source: "manual",
    generatedAt: new Date().toISOString(),
    sharedPremise: "",
    perspectives: {},
  };
}

function normalizeKnowledge(
  raw: Record<string, unknown> | Record<string, string[]>,
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [agentId, value] of Object.entries(raw)) {
    if (Array.isArray(value)) {
      out[agentId] = value.filter(function (x): x is string {
        return typeof x === "string";
      });
    }
  }
  return out;
}

export function useWorldEditBis(input: {
  snapshot: IWorldSnapshotDto | null;
  onSaved: () => Promise<void>;
}) {
  const { snapshot, onSaved } = input;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const [loreDraft, setLoreDraft] = useState<IWorldLoreDto>(emptyLore());
  const [perspectivesJson, setPerspectivesJson] = useState("{}");
  const [facts, setFacts] = useState<IWorldFactDto[]>([]);
  const [knowledgeJson, setKnowledgeJson] = useState("{}");
  const [clockMs, setClockMs] = useState(0);
  const [intentsJson, setIntentsJson] = useState("[]");

  useEffect(
    function (): void {
      if (!snapshot) return;
      const lore = snapshot.world.lore ?? emptyLore();
      setLoreDraft(lore);
      setPerspectivesJson(JSON.stringify(lore.perspectives ?? {}, null, 2));
      setFacts(
        snapshot.world.facts.map(function (f) {
          return {
            ...f,
            type: f.type || "generic",
            visibility: f.visibility || "global",
          };
        }),
      );
      setKnowledgeJson(
        JSON.stringify(
          normalizeKnowledge(
            snapshot.world.knowledge as Record<string, unknown>,
          ),
          null,
          2,
        ),
      );
      setClockMs(snapshot.schedule.clockMs);
      setIntentsJson(JSON.stringify(snapshot.schedule.intents ?? [], null, 2));
      setError(null);
      setWarning(null);
    },
    [snapshot],
  );

  const saveLore = useCallback(async function (): Promise<boolean> {
    let perspectives: Record<string, string[]>;
    try {
      const parsed = JSON.parse(perspectivesJson) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        setError("perspectives 须为 object（agentId → string[]）");
        return false;
      }
      perspectives = parsed as Record<string, string[]>;
    } catch {
      setError("perspectives JSON 无效");
      return false;
    }
    setBusy(true);
    setError(null);
    setWarning(null);
    const payload: IWorldLoreDto = {
      ...loreDraft,
      version: 1,
      source: "manual",
      generatedAt: new Date().toISOString(),
      sharedPremise: loreDraft.sharedPremise,
      perspectives,
    };
    const res = await putWorldLore(payload);
    setBusy(false);
    if (!res.ok || !res.data) {
      setError(res.message ?? "保存 Lore 失败");
      return false;
    }
    setLoreDraft(res.data.lore);
    setPerspectivesJson(
      JSON.stringify(res.data.lore.perspectives ?? {}, null, 2),
    );
    await onSaved();
    return true;
  }, [loreDraft, perspectivesJson, onSaved]);

  const bootstrapLore = useCallback(async function (): Promise<boolean> {
    setBusy(true);
    setError(null);
    setWarning(null);
    const res = await postWorldBootstrap({ force: true });
    setBusy(false);
    if (!res.ok || !res.data) {
      setError(res.message ?? "重生成 Lore 失败");
      return false;
    }
    if (res.data.usedFallback) {
      setWarning(
        res.data.errorMessage
          ? `已用 fallback：${res.data.errorMessage}`
          : "已用 fallback 模板生成 Lore",
      );
    } else if (res.data.lore.source === "llm") {
      setWarning(null);
    }
    setLoreDraft(res.data.lore);
    setPerspectivesJson(
      JSON.stringify(res.data.lore.perspectives ?? {}, null, 2),
    );
    await onSaved();
    return true;
  }, [onSaved]);

  const saveFacts = useCallback(async function (): Promise<boolean> {
    setBusy(true);
    setError(null);
    const res = await putWorldFacts(facts);
    setBusy(false);
    if (!res.ok || !res.data) {
      setError(res.message ?? "保存 Facts 失败");
      return false;
    }
    setFacts(res.data.facts);
    await onSaved();
    return true;
  }, [facts, onSaved]);

  const addFact = useCallback(function (): void {
    const id = `fact_${Date.now().toString(36)}`;
    setFacts(function (prev) {
      return [
        ...prev,
        {
          factId: id,
          type: "generic",
          value: true,
          visibility: "global",
          updatedAt: new Date().toISOString(),
        },
      ];
    });
  }, []);

  const updateFact = useCallback(function (
    index: number,
    patch: Partial<IWorldFactDto>,
  ): void {
    setFacts(function (prev) {
      return prev.map(function (f, i) {
        if (i !== index) return f;
        return {
          ...f,
          ...patch,
          updatedAt: new Date().toISOString(),
        };
      });
    });
  }, []);

  const removeFact = useCallback(function (index: number): void {
    setFacts(function (prev) {
      return prev.filter(function (_f, i) {
        return i !== index;
      });
    });
  }, []);

  const saveKnowledge = useCallback(async function (): Promise<boolean> {
    let knowledge: Record<string, string[]>;
    try {
      const parsed = JSON.parse(knowledgeJson) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        setError("knowledge 须为 object（agentId → factId[]）");
        return false;
      }
      knowledge = normalizeKnowledge(parsed as Record<string, unknown>);
    } catch {
      setError("knowledge JSON 无效");
      return false;
    }
    setBusy(true);
    setError(null);
    const res = await putWorldKnowledge(knowledge);
    setBusy(false);
    if (!res.ok || !res.data) {
      setError(res.message ?? "保存 knowledge 失败");
      return false;
    }
    setKnowledgeJson(JSON.stringify(res.data.knowledge, null, 2));
    await onSaved();
    return true;
  }, [knowledgeJson, onSaved]);

  const saveSchedule = useCallback(async function (): Promise<boolean> {
    let intents: unknown[];
    try {
      const parsed = JSON.parse(intentsJson) as unknown;
      if (!Array.isArray(parsed)) {
        setError("intents 须为数组");
        return false;
      }
      intents = parsed;
    } catch {
      setError("intents JSON 无效");
      return false;
    }
    const schedule: IWorldScheduleDto = {
      clockMs: Number.isFinite(clockMs) ? clockMs : 0,
      intents,
    };
    setBusy(true);
    setError(null);
    const res = await putWorldSchedule(schedule);
    setBusy(false);
    if (!res.ok || !res.data) {
      setError(res.message ?? "保存 schedule 失败");
      return false;
    }
    setClockMs(res.data.schedule.clockMs);
    setIntentsJson(JSON.stringify(res.data.schedule.intents ?? [], null, 2));
    await onSaved();
    return true;
  }, [clockMs, intentsJson, onSaved]);

  const applyTickResult = useCallback(
    async function (res: {
      ok: boolean;
      message?: string;
      data?: {
        toClockMs?: number;
        fired?: unknown[];
      } | null;
    }): Promise<boolean> {
      if (!res.ok || !res.data) {
        setError(res.message ?? "Tick 失败");
        return false;
      }
      await onSaved();
      return true;
    },
    [onSaved],
  );

  const tickAdvanceMinutes = useCallback(
    async function (minutes: number): Promise<boolean> {
      setBusy(true);
      setError(null);
      const res = await postAdvanceClock({
        deltaMs: Math.max(1, minutes) * 60_000,
      });
      setBusy(false);
      return applyTickResult(res);
    },
    [applyTickResult],
  );

  const tickJumpToClockMs = useCallback(
    async function (toClockMs: number): Promise<boolean> {
      setBusy(true);
      setError(null);
      const res = await postAdvanceClock({ toClockMs: Math.max(0, toClockMs) });
      setBusy(false);
      return applyTickResult(res);
    },
    [applyTickResult],
  );

  const tickToNextIntent = useCallback(
    async function (): Promise<boolean> {
      setBusy(true);
      setError(null);
      const res = await postAdvanceClock({ toNextIntent: true });
      setBusy(false);
      return applyTickResult(res);
    },
    [applyTickResult],
  );

  return {
    busy,
    error,
    warning,
    loreDraft,
    setLoreDraft,
    perspectivesJson,
    setPerspectivesJson,
    facts,
    addFact,
    updateFact,
    removeFact,
    knowledgeJson,
    setKnowledgeJson,
    clockMs,
    setClockMs,
    intentsJson,
    setIntentsJson,
    saveLore,
    bootstrapLore,
    saveFacts,
    saveKnowledge,
    saveSchedule,
    tickAdvanceMinutes,
    tickJumpToClockMs,
    tickToNextIntent,
  };
}
