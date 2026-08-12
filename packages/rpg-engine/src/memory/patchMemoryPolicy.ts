/**
 * patch_memory 严格口径：出口阶段只能追加普通语义记忆，不能伪造提交/履约状态。
 */
import type {
  MemoryPatchKind,
  MemoryPatchLayer,
  MemoryPatchPayload,
} from "./types.js";

export interface NormalizedMemoryPatch {
  agentId: string;
  layer: MemoryPatchLayer;
  op: "insert";
  payload: MemoryPatchPayload;
}

const ALLOWED_LAYERS = new Set<MemoryPatchLayer>(["semantic"]);
const ALLOWED_KINDS = new Set<MemoryPatchKind>(["semantic"]);
const MAX_AGENT_ID_CHARS = 80;
const MAX_TEXT_CHARS = 500;

function trimString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeLayer(value: unknown): MemoryPatchLayer {
  const layer = trimString(value) || "semantic";
  if (!ALLOWED_LAYERS.has(layer as MemoryPatchLayer)) {
    throw new Error(`patch_memory layer not allowed: ${layer}`);
  }
  return layer as MemoryPatchLayer;
}

function normalizeKind(value: unknown): MemoryPatchKind {
  const kind = trimString(value) || "semantic";
  if (!ALLOWED_KINDS.has(kind as MemoryPatchKind)) {
    throw new Error(`patch_memory kind not allowed: ${kind}`);
  }
  return kind as MemoryPatchKind;
}

function normalizeText(value: unknown): string {
  const text = trimString(value);
  if (!text) {
    throw new Error("patch_memory text required");
  }
  if (text.length > MAX_TEXT_CHARS) {
    throw new Error(`patch_memory text too long: ${text.length} > ${MAX_TEXT_CHARS}`);
  }
  return text;
}

function normalizeAgentId(value: unknown, fallbackAgentId: string): string {
  const agentId = trimString(value) || fallbackAgentId;
  if (!agentId) {
    throw new Error("patch_memory agentId required");
  }
  if (agentId.length > MAX_AGENT_ID_CHARS) {
    throw new Error("patch_memory agentId too long");
  }
  return agentId;
}

export function normalizeMemoryPatchEffect(
  effect: {
    agentId?: unknown;
    layer?: unknown;
    kind?: unknown;
    text?: unknown;
  },
  fallbackAgentId: string,
): NormalizedMemoryPatch {
  return {
    agentId: normalizeAgentId(effect.agentId, fallbackAgentId),
    layer: normalizeLayer(effect.layer),
    op: "insert",
    payload: {
      text: normalizeText(effect.text),
      kind: normalizeKind(effect.kind),
    },
  };
}

export function validateMemoryPatchInput(input: {
  agentId: string;
  layer: string;
  op: string;
  payload: unknown;
}): NormalizedMemoryPatch {
  const payload = input.payload as { text?: unknown; kind?: unknown } | null;
  return {
    agentId: normalizeAgentId(input.agentId, ""),
    layer: normalizeLayer(input.layer),
    op: input.op === "insert" ? "insert" : (() => {
      throw new Error(`patch_memory op not allowed: ${input.op}`);
    })(),
    payload: {
      text: normalizeText(payload?.text),
      kind: normalizeKind(payload?.kind),
    },
  };
}
