/**
 * 模块名称：引擎磁盘日志（jsonl）与隐私脱敏
 */
import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { LogRecord } from "./types.js";

const PRIVATE_KEY_RE =
  /^(private|openingPrivate|privateBrief|systemHard)$/i;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}

/** 递归剥除 private*／openingPrivate／privateBrief 等原文键 */
export function redactSensitive(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactSensitive);
  }
  if (!isPlainObject(value)) {
    return value;
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    if (PRIVATE_KEY_RE.test(k)) {
      out[k] = "[redacted]";
      continue;
    }
    out[k] = redactSensitive(v);
  }
  return out;
}

export function redactLogRecord(record: LogRecord): LogRecord {
  return {
    ...record,
    payload: record.payload
      ? (redactSensitive(record.payload) as LogRecord["payload"])
      : record.payload,
  };
}

function logFilePath(rootDir: string, day = new Date()): string {
  const y = day.getUTCFullYear();
  const m = String(day.getUTCMonth() + 1).padStart(2, "0");
  const d = String(day.getUTCDate()).padStart(2, "0");
  return path.join(rootDir, "logs", `engine-${y}${m}${d}.jsonl`);
}

export async function appendEngineLogJsonl(
  rootDir: string,
  record: LogRecord,
): Promise<void> {
  const dir = path.join(rootDir, "logs");
  await mkdir(dir, { recursive: true });
  const safe = redactLogRecord(record);
  await appendFile(logFilePath(rootDir), JSON.stringify(safe) + "\n", "utf8");
}

export async function readEngineLogJsonlSlice(opts: {
  rootDir: string;
  /** YYYYMMDD；默认今天 UTC */
  day?: string;
  limit?: number;
}): Promise<{ file: string; lines: LogRecord[]; truncated: boolean }> {
  const day = opts.day;
  const file = day
    ? path.join(opts.rootDir, "logs", `engine-${day}.jsonl`)
    : logFilePath(opts.rootDir);
  const limit = opts.limit ?? 80;
  let text: string;
  try {
    text = await readFile(file, "utf8");
  } catch {
    return { file, lines: [], truncated: false };
  }
  const rawLines = text.split("\n").filter(Boolean);
  const slice = rawLines.slice(-limit);
  const lines: LogRecord[] = [];
  for (const line of slice) {
    try {
      lines.push(JSON.parse(line) as LogRecord);
    } catch {
      // skip broken
    }
  }
  return {
    file,
    lines,
    truncated: rawLines.length > slice.length,
  };
}
