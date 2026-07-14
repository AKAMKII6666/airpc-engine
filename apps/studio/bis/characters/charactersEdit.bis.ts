/**
 * 模块名称：角色台编辑 bis
 */
"use client";

import { useCallback, useState } from "react";
import {
  deleteCharacterApi,
  getCharacter,
  getFreeCard,
  postCreateCharacter,
  putCharacter,
  putFreeCard,
} from "@studio/utils/ajaxHelper/studio.ajax";

export function useCharactersEditBis() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [character, setCharacter] = useState<Record<string, unknown> | null>(
    null,
  );
  const [freeCard, setFreeCard] = useState<Record<string, unknown> | null>(
    null,
  );
  const [freeCardJson, setFreeCardJson] = useState("");
  const [createAgentId, setCreateAgentId] = useState("");
  const [createDisplayName, setCreateDisplayName] = useState("");

  const loadCharacter = useCallback(async function (
    agentId: string,
  ): Promise<void> {
    setBusy(true);
    setError(null);
    setWarning(null);
    const res = await getCharacter(agentId);
    setBusy(false);
    if (!res.ok || !res.data) {
      setError(res.message ?? "load character failed");
      setCharacter(null);
      setFreeCard(null);
      return;
    }
    setCharacter(res.data.character);
    const freeCardId = res.data.character.freeCardId;
    if (typeof freeCardId === "string" && freeCardId) {
      const cardRes = await getFreeCard(freeCardId);
      if (cardRes.ok && cardRes.data) {
        setFreeCard(cardRes.data.card);
        setFreeCardJson(JSON.stringify(cardRes.data.card, null, 2));
      } else {
        setFreeCard(null);
        setFreeCardJson("");
      }
    } else {
      setFreeCard(null);
      setFreeCardJson("");
    }
  }, []);

  const saveCharacter = useCallback(
    async function (): Promise<boolean> {
      if (!character || typeof character.agentId !== "string") return false;
      setBusy(true);
      setError(null);
      setWarning(null);
      const res = await putCharacter(character.agentId, character);
      setBusy(false);
      if (!res.ok || !res.data) {
        setError(res.message ?? "save character failed");
        return false;
      }
      setCharacter(res.data.character);
      if (res.data.warnings && res.data.warnings.length > 0) {
        setWarning(res.data.warnings.join("；"));
      }
      return true;
    },
    [character],
  );

  const saveFreeCard = useCallback(async function (): Promise<boolean> {
    if (!character || typeof character.freeCardId !== "string") {
      setError("当前角色未配置 freeCardId");
      return false;
    }
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(freeCardJson) as Record<string, unknown>;
    } catch {
      setError("FreeCallCard JSON 无效");
      return false;
    }
    setBusy(true);
    setError(null);
    const res = await putFreeCard(character.freeCardId, parsed);
    setBusy(false);
    if (!res.ok || !res.data) {
      setError(res.message ?? "save free card failed");
      return false;
    }
    setFreeCard(res.data.card);
    setFreeCardJson(JSON.stringify(res.data.card, null, 2));
    return true;
  }, [character, freeCardJson]);

  const createCharacter = useCallback(async function (): Promise<boolean> {
    const agentId = createAgentId.trim();
    if (!agentId) {
      setError("创建需要 agentId");
      return false;
    }
    setBusy(true);
    setError(null);
    const res = await postCreateCharacter({
      agentId,
      displayName: createDisplayName.trim() || undefined,
      withFreeCard: true,
    });
    setBusy(false);
    if (!res.ok || !res.data) {
      setError(res.message ?? "create character failed");
      return false;
    }
    setCreateAgentId("");
    setCreateDisplayName("");
    await loadCharacter(res.data.character.agentId);
    return true;
  }, [createAgentId, createDisplayName, loadCharacter]);

  const deleteCharacter = useCallback(async function (): Promise<boolean> {
    if (!character || typeof character.agentId !== "string") return false;
    const agentId = character.agentId;
    if (
      typeof window !== "undefined" &&
      !window.confirm(`确认删除角色 ${agentId}？不可恢复。`)
    ) {
      return false;
    }
    setBusy(true);
    setError(null);
    const res = await deleteCharacterApi(agentId);
    setBusy(false);
    if (!res.ok) {
      setError(res.message ?? "delete character failed");
      return false;
    }
    setCharacter(null);
    setFreeCard(null);
    setFreeCardJson("");
    return true;
  }, [character]);

  return {
    busy,
    error,
    setError,
    warning,
    character,
    setCharacter,
    freeCard,
    freeCardJson,
    setFreeCardJson,
    createAgentId,
    setCreateAgentId,
    createDisplayName,
    setCreateDisplayName,
    loadCharacter,
    saveCharacter,
    saveFreeCard,
    createCharacter,
    deleteCharacter,
  };
}
