function stableArgValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableArgValue);
  if (!value || typeof value !== "object") return value;
  const source = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(source).sort()) {
    out[key] = stableArgValue(source[key]);
  }
  return out;
}

export function registerExitDedupeKey(
  toolId: string,
  args: Record<string, unknown>,
): string {
  return JSON.stringify({ toolId, args: stableArgValue(args) });
}
