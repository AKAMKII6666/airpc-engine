/**
 * 模块名称：Studio API ajax 封装
 */
import { studioFetchJson } from "@studio/utils/ajaxHelper/fetchBase";
import type {
  IStorySummary,
  IStoryEditorLayout,
  IStoryEditorConf,
  ICharacterSummary,
  IValidationReportDto,
} from "@studio/types/frontEnd/store/studioStore.types";
import type { IDebuggerSnapshot } from "@studio/types/frontEnd/store/studioStore.types";

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

export async function postAdvanceClock(body: { deltaMs: number }) {
  return studioFetchJson<{
    deltaMs: number;
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
