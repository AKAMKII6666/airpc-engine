/**
 * 模块名称：Studio API ajax 封装
 */
import { studioFetchJson, type ApiEnvelope } from "@studio/utils/ajaxHelper/fetchBase";
import { iterateSseStream } from "@studio/utils/ajaxHelper/sseParse";
import type {
  IStorySummary,
  IStoryEditorLayout,
  IStoryEditorConf,
  ICharacterSummary,
  IValidationReportDto,
} from "@studio/types/frontEnd/store/studioStore.types";
import type { IDebuggerSnapshot } from "@studio/types/frontEnd/store/studioStore.types";
import type {
  IWorldFactDto,
  IWorldLoreDto,
  IWorldScheduleDto,
  IWorldSnapshotDto,
  IWetEventDto,
  IWetQueryResultDto,
  IWetReplayDto,
} from "@studio/types/frontEnd/world/world.types";
import type { IAssetMetaDto } from "@studio/types/frontEnd/assets/assets.types";

export interface UserSummaryDto {
  userId: string;
  nickname: string;
  createdAt?: string;
}

export async function getUsers() {
  return studioFetchJson<{ users: UserSummaryDto[] }>("/api/users");
}

export async function postCreateUser(body: {
  userId: string;
  nickname: string;
  location?: {
    country: string;
    province: string;
    city: string;
    district?: string;
  };
}) {
  return studioFetchJson<{
    user: UserSummaryDto;
    loreWarning?: string;
  }>("/api/users", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function deleteUserApi(userId: string) {
  return studioFetchJson<{ ok: boolean }>(
    `/api/users/${encodeURIComponent(userId)}`,
    { method: "DELETE" },
  );
}

export async function postSelectUser(userId: string) {
  return studioFetchJson<{ userId: string }>("/api/session/selectUser", {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
}

export async function getStories() {
  return studioFetchJson<{ stories: IStorySummary[] }>("/api/stories");
}

export async function postCreateStory(body: {
  packageId: string;
  title?: string;
}) {
  return studioFetchJson<{ story: IStorySummary }>("/api/stories", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function patchStoryPackage(
  packageId: string,
  body: { newPackageId?: string; title?: string },
) {
  return studioFetchJson<{ story: IStorySummary }>(
    `/api/stories/${encodeURIComponent(packageId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );
}

export async function deleteStoryPackage(packageId: string) {
  return studioFetchJson<{ ok: boolean }>(
    `/api/stories/${encodeURIComponent(packageId)}`,
    { method: "DELETE" },
  );
}

export async function getCharacters() {
  return studioFetchJson<{ characters: ICharacterSummary[] }>(
    "/api/characters",
  );
}

export async function postCreateCharacter(body: {
  agentId: string;
  displayName?: string;
  withFreeCard?: boolean;
}) {
  return studioFetchJson<{ character: ICharacterSummary }>("/api/characters", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getCharacter(agentId: string) {
  return studioFetchJson<{ character: Record<string, unknown> }>(
    `/api/characters/${encodeURIComponent(agentId)}`,
  );
}

export async function putCharacter(
  agentId: string,
  character: Record<string, unknown>,
) {
  return studioFetchJson<{
    character: Record<string, unknown>;
    warnings?: string[];
  }>(`/api/characters/${encodeURIComponent(agentId)}`, {
    method: "PUT",
    body: JSON.stringify({ character }),
  });
}

export async function deleteCharacterApi(agentId: string) {
  return studioFetchJson<{ ok: boolean }>(
    `/api/characters/${encodeURIComponent(agentId)}`,
    { method: "DELETE" },
  );
}

export async function getFreeCard(freeCardId: string) {
  return studioFetchJson<{ card: Record<string, unknown> }>(
    `/api/characters/free-cards/${encodeURIComponent(freeCardId)}`,
  );
}

export async function putFreeCard(
  freeCardId: string,
  card: Record<string, unknown>,
) {
  return studioFetchJson<{ card: Record<string, unknown> }>(
    `/api/characters/free-cards/${encodeURIComponent(freeCardId)}`,
    {
      method: "PUT",
      body: JSON.stringify({ card }),
    },
  );
}

export async function getStoryPackage(packageId: string) {
  return studioFetchJson<{
    conf: IStoryEditorConf;
    layout: IStoryEditorLayout | null;
    cards: Record<string, unknown>;
  }>(`/api/stories/${encodeURIComponent(packageId)}`);
}

export async function putStoryConf(
  packageId: string,
  conf: IStoryEditorConf,
) {
  return studioFetchJson<{ ok: boolean }>(
    `/api/stories/${encodeURIComponent(packageId)}`,
    {
      method: "PUT",
      body: JSON.stringify({ conf }),
    },
  );
}

export async function putStoryLayout(
  packageId: string,
  layout: IStoryEditorLayout,
) {
  return studioFetchJson<{ ok: boolean }>(
    `/api/stories/${encodeURIComponent(packageId)}/layout`,
    {
      method: "PUT",
      body: JSON.stringify({ layout }),
    },
  );
}

export async function putStoryCard(
  packageId: string,
  cardId: string,
  card: unknown,
) {
  return studioFetchJson<{ ok: boolean }>(
    `/api/stories/${encodeURIComponent(packageId)}/cards/${encodeURIComponent(cardId)}`,
    {
      method: "PUT",
      body: JSON.stringify({ card }),
    },
  );
}

export async function postRenameStoryCard(
  packageId: string,
  cardId: string,
  newCardId: string,
) {
  return studioFetchJson<{ cardId: string }>(
    `/api/stories/${encodeURIComponent(packageId)}/cards/${encodeURIComponent(cardId)}/rename`,
    {
      method: "POST",
      body: JSON.stringify({ newCardId }),
    },
  );
}

export async function deleteStoryCard(packageId: string, cardId: string) {
  return studioFetchJson<{ ok: boolean }>(
    `/api/stories/${encodeURIComponent(packageId)}/cards/${encodeURIComponent(cardId)}`,
    { method: "DELETE" },
  );
}

export async function postValidatePackage(packageId: string) {
  return studioFetchJson<{ report: IValidationReportDto }>(
    `/api/stories/${encodeURIComponent(packageId)}/validate`,
    { method: "POST", body: JSON.stringify({}) },
  );
}

export async function downloadContentExport(packageId: string): Promise<{
  ok: boolean;
  blob?: Blob;
  filename?: string;
  message?: string;
  report?: IValidationReportDto;
}> {
  const res = await fetch(
    `/api/stories/${encodeURIComponent(packageId)}/export`,
  );
  if (!res.ok) {
    const json = (await res.json()) as {
      message?: string;
      details?: { report?: IValidationReportDto };
    };
    return {
      ok: false,
      message: json.message ?? "export failed",
      report: json.details?.report,
    };
  }
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="([^"]+)"/);
  return {
    ok: true,
    blob,
    filename: match?.[1] ?? `${packageId}-content.zip`,
  };
}

export async function downloadSaveGameExport(userId: string): Promise<{
  ok: boolean;
  blob?: Blob;
  filename?: string;
  message?: string;
}> {
  const res = await fetch(
    `/api/users/${encodeURIComponent(userId)}/export`,
  );
  if (!res.ok) {
    const json = (await res.json()) as { message?: string };
    return {
      ok: false,
      message: json.message ?? "export failed",
    };
  }
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="([^"]+)"/);
  return {
    ok: true,
    blob,
    filename: match?.[1] ?? `${userId}-profile.save.json`,
  };
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function saveBlobAsFile(blob: Blob, filename: string): void {
  triggerBlobDownload(blob, filename);
}

export async function postBeginCall(body: {
  mode?: "story" | "free";
  packageId?: string;
  cardId?: string;
  agentId?: string;
  localNowIso?: string;
  timeZone?: string;
}) {
  return studioFetchJson<{
    sessionId: string;
    packageId: string;
    cardId: string;
    agentId: string;
    resolveSource?: string;
    cardKind?: string;
    composeScene: unknown;
    renderedPrompt?: unknown;
    matchedLayerIds?: string[];
    frozenCardTitle?: string;
    status: string;
  }>("/api/debug/beginCall", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function postInvokeTool(body: {
  sessionId: string;
  toolId: string;
  args?: Record<string, unknown>;
}) {
  return studioFetchJson<{
    behavior: string;
    candidate: unknown;
    localResult: unknown;
    exitCandidateCount: number;
  }>("/api/debug/invokeTool", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export type TDebugChatSseMessage =
  | { type: "session.ready"; sessionId: string }
  | { type: "assistant.delta"; text: string }
  | { type: "assistant.message"; text: string }
  | { type: "user.transcript"; text: string }
  | { type: "session.ended"; reason: string }
  | { type: "error"; message: string; code?: string };

export interface IDebugChatDone {
  assistantText: string;
  turns: Array<{
    role: "user" | "assistant" | "system";
    text: string;
    at: string;
  }>;
  usedMock: boolean;
}

/**
 * POST /api/debug/chat → text/event-stream（message / done / error）。
 * 门面校验失败仍可能返回 JSON envelope。
 */
export async function postDebugChat(
  body: {
    sessionId: string;
    text: string;
  },
  opts?: {
    onMessage?: (ev: TDebugChatSseMessage) => void;
  },
): Promise<ApiEnvelope<IDebugChatDone>> {
  const res = await fetch("/api/debug/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify(body),
  });
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("text/event-stream")) {
    const json = (await res.json()) as ApiEnvelope<IDebugChatDone>;
    return json;
  }
  if (!res.body) {
    return {
      ok: false,
      code: "ENGINE_INTERNAL",
      message: "chat SSE missing body",
    };
  }

  let donePayload: IDebugChatDone | null = null;
  let errorPayload: { code?: string; message?: string } | null = null;

  for await (const evt of iterateSseStream(res.body)) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(evt.data) as unknown;
    } catch {
      continue;
    }
    if (evt.event === "message") {
      opts?.onMessage?.(parsed as TDebugChatSseMessage);
      continue;
    }
    if (evt.event === "done") {
      donePayload = parsed as IDebugChatDone;
      continue;
    }
    if (evt.event === "error") {
      const err = parsed as { code?: string; message?: string };
      errorPayload = err;
      opts?.onMessage?.({
        type: "error",
        message: err.message ?? "chat failed",
        code: err.code,
      });
    }
  }

  if (errorPayload) {
    return {
      ok: false,
      code: errorPayload.code ?? "ENGINE_INTERNAL",
      message: errorPayload.message ?? "chat failed",
    };
  }
  if (!donePayload) {
    return {
      ok: false,
      code: "ENGINE_INTERNAL",
      message: "chat SSE ended without done",
    };
  }
  return { ok: true, data: donePayload };
}

export async function postEndCall(body: {
  sessionId: string;
  outcome: {
    flags: Record<string, boolean>;
    completedBeats: string[];
    missedRequiredBeats: string[];
  };
}) {
  return studioFetchJson<{
    selectedExitId?: string;
    effectPlanResult: unknown;
    freePipeline?: unknown;
    selectedExit?: unknown;
    status: string;
    chatTurns?: Array<{
      role: "user" | "assistant" | "system";
      text: string;
      at: string;
    }>;
  }>("/api/debug/endCall", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function postSimEvent(body: {
  sessionId: string;
  kind: "silence_timeout" | "call_duration_threshold" | "pre_hangup_hint";
}) {
  return studioFetchJson<{
    sessionId: string;
    lastSimEvent: unknown;
  }>("/api/debug/simEvent", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function postCompletePlayback(body: { sessionId: string }) {
  return studioFetchJson<{
    sessionId: string;
    interactionPhase: string;
    phoneFlags: Record<string, boolean>;
    playback: unknown;
  }>("/api/debug/completePlayback", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getTools(sessionId?: string) {
  const q = sessionId
    ? `?sessionId=${encodeURIComponent(sessionId)}`
    : "";
  return studioFetchJson<{
    tools: Array<{
      toolId: string;
      displayName: string;
      behavior: string;
      allowedInPlayback: boolean;
    }>;
    source: string;
    policyMode?: string;
    interactionPhase?: string;
  }>(`/api/tools${q}`);
}

export async function postBootstrapLore(body?: { force?: boolean }) {
  return studioFetchJson<{
    lore: unknown;
    usedFallback: boolean;
    errorMessage?: string;
  }>("/api/debug/bootstrapLore", {
    method: "POST",
    body: JSON.stringify(body ?? {}),
  });
}

export async function postAdvanceClock(body: {
  deltaMs?: number;
  toClockMs?: number;
  toNextIntent?: boolean;
}) {
  return studioFetchJson<{
    mode: "deltaMs" | "toClockMs" | "toNextIntent";
    deltaMs?: number;
    toClockMs?: number;
    fromClockMs?: number;
    advancedMs?: number;
    reason?: string;
    fired: unknown[];
  }>("/api/debug/advanceClock", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getDebugLogs(opts?: {
  userId?: string;
  day?: string;
  limit?: number;
}) {
  const q = new URLSearchParams();
  if (opts?.userId) q.set("userId", opts.userId);
  if (opts?.day) q.set("day", opts.day);
  if (opts?.limit) q.set("limit", String(opts.limit));
  const qs = q.toString();
  return studioFetchJson<{
    ring: unknown[];
    file: string;
    fileLines: unknown[];
    truncated: boolean;
    note: string;
  }>(`/api/logs${qs ? `?${qs}` : ""}`);
}

export async function getDebugSnapshot(userId?: string) {
  const q = userId ? `?userId=${encodeURIComponent(userId)}` : "";
  return studioFetchJson<IDebuggerSnapshot>(`/api/debug/snapshot${q}`);
}

export async function getWorldSnapshot() {
  return studioFetchJson<IWorldSnapshotDto>("/api/world");
}

export async function putWorldLore(lore: IWorldLoreDto) {
  return studioFetchJson<{ lore: IWorldLoreDto }>("/api/world/lore", {
    method: "PUT",
    body: JSON.stringify(lore),
  });
}

export async function putWorldFacts(facts: IWorldFactDto[]) {
  return studioFetchJson<{ facts: IWorldFactDto[] }>("/api/world/facts", {
    method: "PUT",
    body: JSON.stringify({ facts }),
  });
}

export async function putWorldKnowledge(knowledge: Record<string, string[]>) {
  return studioFetchJson<{ knowledge: Record<string, string[]> }>(
    "/api/world/knowledge",
    {
      method: "PUT",
      body: JSON.stringify({ knowledge }),
    },
  );
}

export async function putWorldSchedule(schedule: IWorldScheduleDto) {
  return studioFetchJson<{ schedule: IWorldScheduleDto }>(
    "/api/world/schedule",
    {
      method: "PUT",
      body: JSON.stringify(schedule),
    },
  );
}

export async function postWorldBootstrap(body?: { force?: boolean }) {
  return studioFetchJson<{
    lore: IWorldLoreDto;
    usedFallback: boolean;
    errorMessage?: string;
  }>("/api/world/bootstrap", {
    method: "POST",
    body: JSON.stringify(body ?? { force: true }),
  });
}

export async function getAssets() {
  return studioFetchJson<{ assets: IAssetMetaDto[] }>("/api/assets");
}

export async function getAsset(assetId: string) {
  return studioFetchJson<{ asset: IAssetMetaDto }>(
    `/api/assets/${encodeURIComponent(assetId)}`,
  );
}

export async function postCreateAsset(body: {
  asset: IAssetMetaDto;
  fileBase64?: string;
}) {
  return studioFetchJson<{ asset: IAssetMetaDto }>("/api/assets", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function putAsset(
  assetId: string,
  body: { asset: IAssetMetaDto; fileBase64?: string },
) {
  return studioFetchJson<{ asset: IAssetMetaDto }>(
    `/api/assets/${encodeURIComponent(assetId)}`,
    {
      method: "PUT",
      body: JSON.stringify(body),
    },
  );
}

export async function deleteAssetApi(assetId: string) {
  return studioFetchJson<{ ok: boolean }>(
    `/api/assets/${encodeURIComponent(assetId)}`,
    { method: "DELETE" },
  );
}

export async function queryWetEvents(opts?: {
  userId?: string;
  type?: string;
  sessionId?: string;
  since?: string;
  until?: string;
  limit?: number;
  includeFile?: boolean;
}) {
  const q = new URLSearchParams();
  if (opts?.userId) q.set("userId", opts.userId);
  if (opts?.type) q.set("type", opts.type);
  if (opts?.sessionId) q.set("sessionId", opts.sessionId);
  if (opts?.since) q.set("since", opts.since);
  if (opts?.until) q.set("until", opts.until);
  if (opts?.limit) q.set("limit", String(opts.limit));
  if (opts?.includeFile === false) q.set("includeFile", "0");
  const qs = q.toString();
  return studioFetchJson<IWetQueryResultDto>(`/api/wet${qs ? `?${qs}` : ""}`);
}

export async function appendWetEvent(body: {
  type: "wet.annotation" | "wet.compensation";
  note: string;
  sessionId?: string;
  payload?: Record<string, unknown>;
}) {
  return studioFetchJson<{ event: IWetEventDto }>("/api/wet", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getWetReplay(sessionId: string) {
  const q = new URLSearchParams({ sessionId });
  return studioFetchJson<IWetReplayDto>(`/api/wet/replay?${q.toString()}`);
}
