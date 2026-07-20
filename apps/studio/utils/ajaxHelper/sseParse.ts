/**
 * 模块名称：ajaxHelper SSE 解析
 * 模块说明：解析 text/event-stream；供 debug chat 等最小推送。
 */

export interface SseParsedEvent {
  event: string;
  data: string;
}

/**
 * 将可读流解析为 SSE 事件序列（event / data 字段）。
 */
export async function* iterateSseStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<SseParsedEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let sep = buffer.indexOf("\n\n");
      while (sep >= 0) {
        const chunk = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        const parsed = parseSseChunk(chunk);
        if (parsed) yield parsed;
        sep = buffer.indexOf("\n\n");
      }
    }
    if (buffer.trim()) {
      const parsed = parseSseChunk(buffer);
      if (parsed) yield parsed;
    }
  } finally {
    reader.releaseLock();
  }
}

function parseSseChunk(chunk: string): SseParsedEvent | null {
  let event = "message";
  const dataLines: string[] = [];
  for (const rawLine of chunk.split("\n")) {
    const line = rawLine.replace(/\r$/, "");
    if (!line || line.startsWith(":")) continue;
    if (line.startsWith("event:")) {
      event = line.slice(6).trim();
      continue;
    }
    if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trimStart());
    }
  }
  if (dataLines.length === 0) return null;
  return { event, data: dataLines.join("\n") };
}
