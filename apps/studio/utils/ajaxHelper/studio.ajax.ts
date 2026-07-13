/**
 * 模块名称：Studio API ajax 封装
 */
import { studioFetchJson } from "@studio/utils/ajaxHelper/fetchBase";
import type { IStorySummary } from "@studio/types/frontEnd/store/studioStore.types";
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
}) {
  return studioFetchJson<{ user: UserSummaryDto }>("/api/users", {
    method: "POST",
    body: JSON.stringify(body),
  });
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

export async function getStoryPackage(packageId: string) {
  return studioFetchJson<{
    conf: {
      packageId: string;
      title?: string;
      cards: Array<{ cardId: string }>;
      entryCardId?: string;
    };
  }>(`/api/stories/${encodeURIComponent(packageId)}`);
}

export async function postBeginCall(body: {
  packageId: string;
  cardId: string;
  localNowIso?: string;
}) {
  return studioFetchJson<{
    sessionId: string;
    packageId: string;
    cardId: string;
    agentId: string;
    composeScene: unknown;
    frozenCardTitle?: string;
    status: string;
  }>("/api/debug/beginCall", {
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
    status: string;
  }>("/api/debug/endCall", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getDebugSnapshot(userId?: string) {
  const q = userId ? `?userId=${encodeURIComponent(userId)}` : "";
  return studioFetchJson<IDebuggerSnapshot>(`/api/debug/snapshot${q}`);
}
