/**
 * 模块名称：ajaxHelper 基础 fetch
 */
export interface ApiEnvelope<T> {
  ok: boolean;
  data?: T;
  code?: string;
  message?: string;
  details?: unknown;
}

export async function studioFetchJson<T>(
  url: string,
  init?: RequestInit,
): Promise<ApiEnvelope<T>> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const json = (await res.json()) as ApiEnvelope<T>;
  return json;
}
