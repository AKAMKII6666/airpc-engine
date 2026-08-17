/**
 * Memory 清空：删除指定 userId×agentId 的 SQLite 记忆与 rollup，
 * 并清掉该角色在 Host Profile 里的对话惯性。
 */
import { existsSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { getStudioV2DataRoot } from "../data/dataRoot.server";
import { getStudioV2EngineHost } from "../host/engineHost.server";

export type ClearAgentMemoryResult = {
  entries: number;
  rollups: number;
  inertiaCleared: boolean;
};

function memoryDbPath(): string {
  return path.join(getStudioV2DataRoot(), "memory", "memory.sqlite");
}

function tableExists(db: Database.Database, name: string): boolean {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?")
    .get(name);
  return !!row;
}

export function clearMemoryEntriesForAgent(
  userId: string,
  agentId: string,
): { entries: number; rollups: number } {
  const dbPath = memoryDbPath();
  if (!existsSync(dbPath)) {
    return { entries: 0, rollups: 0 };
  }
  const db = new Database(dbPath);
  try {
    const entries = db
      .prepare("DELETE FROM memory_entries WHERE user_id = ? AND agent_id = ?")
      .run(userId, agentId).changes;
    let rollups = 0;
    if (tableExists(db, "memory_rollups")) {
      rollups = db
        .prepare("DELETE FROM memory_rollups WHERE user_id = ? AND agent_id = ?")
        .run(userId, agentId).changes;
    }
    if (tableExists(db, "memory_entries_fts")) {
      db.prepare(
        "DELETE FROM memory_entries_fts WHERE user_id = ? AND agent_id = ?",
      ).run(userId, agentId);
    }
    return { entries, rollups };
  } finally {
    db.close();
  }
}

/**
 * 清空该角色记忆 + 该角色的对话惯性；惯性经 Host 缓存写回，避免调试器仍读到旧值。
 */
export async function clearAgentMemoryForUser(
  userId: string,
  agentId: string,
): Promise<ClearAgentMemoryResult> {
  const sqlite = clearMemoryEntriesForAgent(userId, agentId);
  const host = await getStudioV2EngineHost();
  const profile = await host.ensureProfile(userId);
  const meta = profile.meta ?? {};
  profile.meta = meta;

  const inertiaStore = meta["conversationInertiaByAgent"];
  let inertiaCleared = false;
  if (
    inertiaStore &&
    typeof inertiaStore === "object" &&
    !Array.isArray(inertiaStore)
  ) {
    const store = inertiaStore as Record<string, unknown>;
    if (store[agentId] !== undefined) {
      delete store[agentId];
      inertiaCleared = true;
    }
  }
  if (inertiaCleared) {
    await host.saveProfile(userId, "manual");
  }
  return {
    entries: sqlite.entries,
    rollups: sqlite.rollups,
    inertiaCleared,
  };
}
