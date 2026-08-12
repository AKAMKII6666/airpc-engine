/**
 * 对话惯性持久化：把最近一通可接续轮次存在 Profile.meta，重启后仍可接上话茬。
 */
import type { BeginCallContext, CallSession } from "./types.js";
import type { PlayerProfile } from "../schema/profile.js";

const META_KEY = "conversationInertiaByAgent";
const MAX_TURNS = 4;
const MAX_TEXT_CHARS = 180;

type PersistedConversationInertia = NonNullable<
  BeginCallContext["conversationInertia"]
>;

function truncateInertiaText(text: string, maxChars: number): string {
  return text.length <= maxChars ? text : `${text.slice(0, maxChars - 1)}…`;
}

function sanitizeTurn(turn: unknown): PersistedConversationInertia["recentTurns"][number] | null {
  const row = turn as { role?: unknown; text?: unknown; at?: unknown } | null;
  if (!row || typeof row.text !== "string" || typeof row.at !== "string") {
    return null;
  }
  if (row.role !== "user" && row.role !== "assistant" && row.role !== "system") {
    return null;
  }
  const text = row.text.trim();
  if (!text) return null;
  return {
    role: row.role,
    text: truncateInertiaText(text, MAX_TEXT_CHARS),
    at: row.at,
  };
}

function readStore(profile: PlayerProfile | undefined): Record<string, unknown> {
  const store = profile?.meta?.[META_KEY];
  return store && typeof store === "object" && !Array.isArray(store)
    ? store as Record<string, unknown>
    : {};
}

export function readPersistedConversationInertia(input: {
  profile: PlayerProfile | undefined;
  agentId: string;
  currentSessionId: string;
}): BeginCallContext["conversationInertia"] | undefined {
  const row = readStore(input.profile)[input.agentId] as Partial<
    PersistedConversationInertia
  > | null;
  if (!row || row.previousSessionId === input.currentSessionId) return undefined;
  if (
    typeof row.previousSessionId !== "string" ||
    typeof row.previousCardId !== "string" ||
    typeof row.previousSource !== "string" ||
    !Array.isArray(row.recentTurns)
  ) {
    return undefined;
  }
  const recentTurns = row.recentTurns.map(sanitizeTurn).filter(function (
    turn,
  ): turn is PersistedConversationInertia["recentTurns"][number] {
    return !!turn;
  });
  if (recentTurns.length === 0) return undefined;
  return {
    previousSessionId: row.previousSessionId,
    previousEndedAt:
      typeof row.previousEndedAt === "string" ? row.previousEndedAt : undefined,
    previousCardId: row.previousCardId,
    previousSource: row.previousSource as PersistedConversationInertia["previousSource"],
    recentTurns,
  };
}

export function buildSessionConversationInertia(
  session: CallSession,
): BeginCallContext["conversationInertia"] | undefined {
  if (!session.endedAt || !session.chatTurns?.length) return undefined;
  const recentTurns = session.chatTurns.slice(-MAX_TURNS).map(function (turn) {
    return {
      role: turn.role,
      text: truncateInertiaText(turn.text, MAX_TEXT_CHARS),
      at: turn.at,
    };
  });
  return {
    previousSessionId: session.sessionId,
    previousEndedAt: session.endedAt,
    previousCardId: session.resolve.cardId,
    previousSource: session.resolve.source,
    recentTurns,
  };
}

export function persistConversationInertiaToProfile(input: {
  profile: PlayerProfile;
  session: CallSession;
}): void {
  const inertia = buildSessionConversationInertia(input.session);
  if (!inertia) return;
  const meta = input.profile.meta ?? {};
  input.profile.meta = meta;
  meta[META_KEY] = {
    ...readStore(input.profile),
    [input.session.resolve.agentId]: inertia,
  };
}
