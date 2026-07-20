/**
 * 模块名称：SSE Response 助手
 * 模块说明：调试最小 text/event-stream（chat 等）；非完整事件总线。
 */

const encoder = new TextEncoder();

export function encodeSseEvent(event: string, data: unknown): Uint8Array {
  return encoder.encode(
    `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
  );
}

export function sseHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  headers.set("Content-Type", "text/event-stream; charset=utf-8");
  headers.set("Cache-Control", "no-cache, no-transform");
  headers.set("Connection", "keep-alive");
  headers.set("X-Accel-Buffering", "no");
  return headers;
}

export function createSseResponse(
  write: (send: (event: string, data: unknown) => void) => Promise<void>,
  init?: { status?: number },
): Response {
  const stream = new ReadableStream<Uint8Array>({
    async start(controller): Promise<void> {
      const send = function (event: string, data: unknown): void {
        controller.enqueue(encodeSseEvent(event, data));
      };
      try {
        await write(send);
      } catch (err) {
        send("error", {
          code: "ENGINE_INTERNAL",
          message: err instanceof Error ? err.message : String(err),
        });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    status: init?.status ?? 200,
    headers: sseHeaders(),
  });
}
