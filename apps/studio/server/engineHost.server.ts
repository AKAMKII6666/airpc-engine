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

/**
 * Content 保存后刷新引擎包缓存。
 * 默认保留 sessions / profiles / activeByUser（S1）；不得与踢会话绑在一起。
 */
export async function reloadStudioWorkspace(): Promise<void> {
  const host = getEngineHost();
  await host.loadWorkspace(getStudioDataRoot(), { resetRuntime: false });
  workspaceLoaded = true;
  workspaceError = null;
}

/** 显式重置运行时（踢会话 + 清 Profile 缓存），禁与普通保存绑定 */
export async function resetStudioWorkspaceRuntime(): Promise<void> {
  const host = await getStudioEngineHost();
  host.resetRuntime();
}
