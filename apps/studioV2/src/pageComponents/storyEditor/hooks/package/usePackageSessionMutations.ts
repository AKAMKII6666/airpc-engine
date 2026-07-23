/**
	* 包会话保存与 conf 字段写回：从 useStoryEditorPackageSession 拆出压行数。
	*/
"use client";

import { useCallback, type Dispatch, type SetStateAction } from "react";
import type { FactMeta, StoryPackageMeta } from "@studio-v2/typeFiles/story/callCard/engineCallCard";
import type { ValidationReport } from "@studio-v2/typeFiles/story/validate/engineValidation";
import { saveStoryPackageToDisk } from "@studio-v2/src/bis/pageBis/storyEditor/package/io/saveStoryPackage_bis";
import {
	withAssetRefs,
	withEntryCardId,
	withPackageMeta,
	withWorldFacts,
} from "@studio-v2/src/bis/pageBis/storyEditor/package/session/packageSessionLoad";
import { StudioApiError } from "@studio-v2/src/utils/ajaxHelper/studioApiClient";
import { isPackageValidationFailDetails } from "@studio-v2/typeFiles/story/editor/validate/packageValidationDto";
import type { DiskStoryPackageBundle } from "@studio-v2/typeFiles/story/package/diskStoryPackage";
import type { StoryCanvasStageApi } from "@studio-v2/src/pageComponents/storyEditor/canvas/storyCanvasTypes";

export type EditorPackageSaveState = "idle" | "saving" | "saved" | "error";

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

export type UsePackageSessionMutationsArgs = {
	packageId: string;
	bundle: DiskStoryPackageBundle | null;
	getCanvasApi: () => StoryCanvasStageApi | null;
	setBundle: Dispatch<SetStateAction<DiskStoryPackageBundle | null>>;
	setEntryCardIdByPackage: Dispatch<SetStateAction<Record<string, string>>>;
	setSaveState: Dispatch<SetStateAction<EditorPackageSaveState>>;
	setSaveError: Dispatch<SetStateAction<string | undefined>>;
	setSaveValidation: Dispatch<SetStateAction<ValidationReport | null>>;
};

/**
	* 保存整包 + 会话内改 entryCardId / assetRefs / worldFacts / meta。
	* validate error 经 StudioApiError.details.report 展示；不持加载态。
	*/
export function usePackageSessionMutations(
	args: UsePackageSessionMutationsArgs,
) {
	const {
		packageId,
		bundle,
		getCanvasApi,
		setBundle,
		setEntryCardIdByPackage,
		setSaveState,
		setSaveError,
		setSaveValidation,
	} = args;

	const onSave = useCallback(async function () {
		const api = getCanvasApi();
		if (!api || !bundle) return;
		setSaveState("saving");
		setSaveError(undefined);
		setSaveValidation(null);
		try {
			const { nodes, edges } = api.getGraphSnapshot();
			const saved = await saveStoryPackageToDisk({
				packageId,
				baseBundle: bundle,
				nodes,
				edges,
			});
			setBundle(saved.bundle);
			setEntryCardIdByPackage(function (prev) {
				return {
					...prev,
					[packageId]: saved.bundle.conf.entryCardId ?? "",
				};
			});
			setSaveValidation(saved.validation);
			setSaveState("saved");
		} catch (error) {
			setSaveState("error");
			setSaveError(errorMessage(error, "保存失败，请稍后重试"));
			setSaveValidation(validationReportFromSaveError(error));
		}
	}, [
		bundle,
		getCanvasApi,
		packageId,
		setBundle,
		setEntryCardIdByPackage,
		setSaveError,
		setSaveState,
		setSaveValidation,
	]);

	const onEntryCardIdChange = useCallback(
		function (cardId: string) {
			setBundle(function (prev) {
				if (!prev) return prev;
				return withEntryCardId(prev, cardId) ?? prev;
			});
			const next = cardId.trim();
			if (next === "") return;
			setEntryCardIdByPackage(function (prev) {
				return { ...prev, [packageId]: next };
			});
		},
		[packageId, setBundle, setEntryCardIdByPackage],
	);

	const onAssetRefsChange = useCallback(
		function (assetRefs: readonly string[]) {
			setBundle(function (prev) {
				if (!prev) return prev;
				return withAssetRefs(prev, assetRefs);
			});
		},
		[setBundle],
	);

	const onWorldFactsChange = useCallback(
		function (worldFacts: readonly FactMeta[] | undefined) {
			setBundle(function (prev) {
				if (!prev) return prev;
				return withWorldFacts(prev, worldFacts);
			});
		},
		[setBundle],
	);

	const onPackageMetaChange = useCallback(
		function (meta: StoryPackageMeta | undefined) {
			setBundle(function (prev) {
				if (!prev) return prev;
				return withPackageMeta(prev, meta);
			});
		},
		[setBundle],
	);

	return {
		onSave,
		onEntryCardIdChange,
		onAssetRefsChange,
		onWorldFactsChange,
		onPackageMetaChange,
	};
}
