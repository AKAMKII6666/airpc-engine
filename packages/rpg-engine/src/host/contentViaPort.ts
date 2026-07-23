/**
 * 模块名称：Host 经 ContentPort 加载工作区
 * 模块说明：从 createEngineHost 拆出，避免 Host 组合函数净增；
 * 引擎不再扫 storis-packages / characters（技术设计 23 §4.3）。
 */
import { engineError, isEngineError } from "./errors.js";
import type { ContentPort } from "../ports/contentPort.js";
import {
  workspaceStateFromSnapshot,
  type WorkspaceState,
} from "../workspace/loadWorkspace.js";

/**
 * 经 Port 加载工作区快照并投影为 Host 内存状态。
 * 未注入 ContentPort → ENGINE_INTERNAL。
 */
export async function loadWorkspaceViaPort(input: {
  rootDir: string;
  contentPort: ContentPort | null;
}): Promise<WorkspaceState> {
  if (!input.contentPort) {
    throw engineError(
      "ENGINE_INTERNAL",
      "ContentPort required: inject createFsContentPort (engineIOModule) or test fake",
    );
  }
  try {
    const snap = await input.contentPort.loadWorkspaceSnapshot({
      workspaceKey: input.rootDir,
    });
    return workspaceStateFromSnapshot(snap);
  } catch (err) {
    if (isEngineError(err)) {
      throw err;
    }
    throw engineError("ENGINE_INTERNAL", "loadWorkspaceSnapshot failed", err);
  }
}
