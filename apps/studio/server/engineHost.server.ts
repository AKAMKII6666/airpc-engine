/**
 * 模块名称：Studio EngineHost 单例
 * 模块说明：仅 Next server 引用；client 禁止 import。
 */
import { getEngineHost, isEngineError, type EngineHost } from "@airpc/rpg-engine";
import { getStudioDataRoot } from "@studio/server/dataRoot.server";

let workspaceLoaded = false;
let workspaceError: { code: string; message: string } | null = null;

export async function getStudioEngineHost(): Promise<EngineHost> {
  const host = getEngineHost();
  if (!workspaceLoaded && !workspaceError) {
    try {
      await host.loadWorkspace(getStudioDataRoot());
      workspaceLoaded = true;
    } catch (err) {
      if (isEngineError(err)) {
        workspaceError = { code: err.code, message: err.message };
      } else {
        workspaceError = {
          code: "ENGINE_INTERNAL",
          message: err instanceof Error ? err.message : String(err),
        };
      }
      throw err;
    }
  }
  if (workspaceError && !workspaceLoaded) {
    throw workspaceError;
  }
  return host;
}

export function getWorkspaceLoadError(): {
  code: string;
  message: string;
} | null {
  return workspaceError;
}
