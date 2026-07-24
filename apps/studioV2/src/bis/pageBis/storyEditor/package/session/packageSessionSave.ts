/**
	* 包会话整包保存步骤：flush 门闸 + PUT；结果型写 store。
	* 从 mutate hook 抽出以降有效行数；禁 UI 直调。
	*/
import type { Edge, Node } from "@xyflow/react";
import { saveStoryPackageToDisk } from "@studio-v2/src/bis/pageBis/storyEditor/package/io/saveStoryPackage_bis";
import { useStoryEditorStore } from "@studio-v2/src/stores/storyEditor/storyEditorStore";
import { StudioApiError } from "@studio-v2/src/utils/ajaxHelper/studioApiClient";
import type { DiskStoryPackageBundle } from "@studio-v2/typeFiles/story/package/diskStoryPackage";
import type { ValidationReport } from "@studio-v2/typeFiles/story/validate/engineValidation";
import { isPackageValidationFailDetails } from "@studio-v2/typeFiles/story/editor/validate/packageValidationDto";
import type {
	StoryEditorSaveFailurePayload,
	StoryEditorSaveSuccessPayload,
} from "@studio-v2/typeFiles/story/editor/store/storyEditorStoreState";

function errorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim() !== "") {
		return error.message;
	}
	return fallback;
}

/** 从保存异常提取 ValidationReport；非校验失败返回 null */
function validationReportFromSaveError(
	error: unknown,
): ValidationReport | null {
	if (
		error instanceof StudioApiError &&
		error.code === "PACKAGE_VALIDATION_FAILED" &&
		isPackageValidationFailDetails(error.details)
	) {
		return error.details.report;
	}
	return null;
}

/** 保存编排入参；调用方已订 store actions */
export type CommitStoryEditorPackageSaveInput = {
	/** 路由包键；PUT 目标 */
	packageId: string;
	/** 当前会话 bundle；空则 no-op */
	bundle: DiskStoryPackageBundle | null;
	/** 同步 flush；失败则记 applySaveFailure */
	flushCanvasToStore: () => boolean;
	/** store 进入 saving 相位；清空上次错误 */
	applySaveStarted: () => void;
	/** 保存成功：更新 bundle、清 dirty、记 validation */
	applySaveSuccess: (payload: StoryEditorSaveSuccessPayload) => void;
	/** 保存失败：记人话错误与可选 validation；保留 dirty */
	applySaveFailure: (payload: StoryEditorSaveFailurePayload) => void;
};

/**
	* 先 flush→读 flushedGraph→PUT；成功/失败写 store。
	* 不以 canvasApi 为组 bundle 真源。
	*/
export async function commitStoryEditorPackageSave(
	input: CommitStoryEditorPackageSaveInput,
): Promise<void> {
	const {
		packageId,
		bundle,
		flushCanvasToStore,
		applySaveStarted,
		applySaveSuccess,
		applySaveFailure,
	} = input;
	if (!bundle) return;
	if (!flushCanvasToStore()) {
		applySaveFailure({
			message: "画布未就绪，无法保存",
			validation: null,
		});
		return;
	}
	const graph = useStoryEditorStore.getState().flushedGraph;
	if (!graph) {
		applySaveFailure({
			message: "画布快照缺失，无法保存",
			validation: null,
		});
		return;
	}
	applySaveStarted();
	try {
		const saved = await saveStoryPackageToDisk({
			packageId,
			baseBundle: bundle,
			nodes: graph.nodes as Node[],
			edges: graph.edges as Edge[],
		});
		applySaveSuccess({
			bundle: saved.bundle,
			validation: saved.validation,
		});
	} catch (error) {
		applySaveFailure({
			message: errorMessage(error, "保存失败，请稍后重试"),
			validation: validationReportFromSaveError(error),
		});
	}
}
