/**
	* /api/workspace 旁路：PUT 合并工作区元信息。
	*/
import {
	apiFail,
	httpStatusForCode,
} from "@studio-v2/src/utils/server/http/apiResponse.server";
import type { WorkspaceConfig } from "@studio-v2/src/utils/server/workspace/workspaceFs.server";

/** 将 catch 未知错误归一为 apiFail Response。 */
export function failFromUnknown(err: unknown): Response {
	const code =
		err && typeof err === "object" && "code" in err
			? String((err as { code: string }).code)
			: "ENGINE_INTERNAL";
	return apiFail(
		code,
		err instanceof Error ? err.message : String(err),
		httpStatusForCode(code),
	);
}

/**
	* 用 body.workspace 局部字段覆盖 prev；缺字段保留原值。
	* body.workspace 非对象时返回 null（由 route 报 VALIDATION_FAILED）。
	*/
export function mergeWorkspacePatch(
	prev: WorkspaceConfig,
	workspace: Partial<WorkspaceConfig> | undefined,
): WorkspaceConfig | null {
	if (!workspace || typeof workspace !== "object") {
		return null;
	}
	return {
		schemaVersion:
			typeof workspace.schemaVersion === "number"
				? workspace.schemaVersion
				: prev.schemaVersion,
		title:
			typeof workspace.title === "string" ? workspace.title : prev.title,
		engineMinVersion:
			typeof workspace.engineMinVersion === "string"
				? workspace.engineMinVersion
				: prev.engineMinVersion,
	};
}
