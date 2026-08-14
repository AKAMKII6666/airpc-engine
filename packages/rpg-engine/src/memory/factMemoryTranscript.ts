/**
 * 模块名称：事实记忆 transcript 投影
 */
import type { MemoryCallTranscript } from "./types.js";

export interface UserFactTranscriptTurn {
  role: "user";
  text: string;
  at: string;
  index: number;
}

export interface UserFactTranscriptProjection {
  schemaVersion: 1;
  source: "host.chat_turns.user_only";
  turns: UserFactTranscriptTurn[];
  droppedTurnCount: number;
}

export function isMemoryCallTranscript(
  value: unknown,
): value is MemoryCallTranscript {
  const candidate = value as Partial<MemoryCallTranscript> | null;
  return (
    !!candidate &&
    candidate.schemaVersion === 1 &&
    candidate.source === "host.chat_turns" &&
    Array.isArray(candidate.turns)
  );
}

export function projectUserFactTranscript(
  value: unknown,
): UserFactTranscriptProjection | null {
  if (!isMemoryCallTranscript(value)) return null;
  const turns: UserFactTranscriptTurn[] = [];
  value.turns.forEach(function (turn, index) {
    if (turn.role !== "user") return;
    const text = turn.text.trim();
    if (!text) return;
    turns.push({
      role: "user",
      text,
      at: turn.at,
      index,
    });
  });
  return {
    schemaVersion: 1,
    source: "host.chat_turns.user_only",
    turns,
    droppedTurnCount: value.turns.length - turns.length,
  };
}

export function summarizeUserFactTranscript(value: unknown): string | null {
  const projection = projectUserFactTranscript(value);
  if (!projection || projection.turns.length === 0) return null;
  return projection.turns
    .map(function (turn) {
      return `user[${turn.index}]: ${turn.text}`;
    })
    .join("\n")
    .trim();
}
