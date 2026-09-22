/**
	* 首通提示词预览：渲染命令（从 preview bis 抽出以降函数行数）。
	*/
"use client";

import { useCallback, useState } from "react";
import { postPromptPreview } from "@studio-v2/src/utils/ajaxProxy/story/api/promptPreviewApi";
import type {
	PromptPreviewCallDirection,
	PromptPreviewResult,
} from "@studio-v2/typeFiles/story/promptPreview/promptPreviewDto";

/** PromptPreviewLocalState：bis 对外契约，调用方只经此符号读写，避免 UI 直连 store。 */
export type PromptPreviewLocalState = {
	/** PromptPreviewLocalState.callDirection：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	callDirection: PromptPreviewCallDirection;
	/** PromptPreviewLocalState.setCallDirection：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	setCallDirection: (d: PromptPreviewCallDirection) => void;
	/** PromptPreviewLocalState.localHour：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	localHour: number;
	/** PromptPreviewLocalState.setLocalHour：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	setLocalHour: (h: number) => void;
	/** PromptPreviewLocalState.busy：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	busy: boolean;
	/** PromptPreviewLocalState.error：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	error: string | undefined;
	/** PromptPreviewLocalState.result：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	result: PromptPreviewResult | null;
	/** PromptPreviewLocalState.resetResult：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	resetResult: () => void;
	/** PromptPreviewLocalState.renderPreview：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	renderPreview: (input: {
		card: unknown;
		packageId?: string;
	}) => Promise<boolean>;
};

/**
	* 弹层瞬时态 + 渲染请求；userId 由调用方注入（来自 studioSession）。
	*/
export function usePromptPreviewLocalState(
	getUserId: () => string,
): PromptPreviewLocalState {
	const [callDirection, setCallDirection] =
		useState<PromptPreviewCallDirection>("inbound");
	const [localHour, setLocalHour] = useState(12);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | undefined>(undefined);
	const [result, setResult] = useState<PromptPreviewResult | null>(null);

	const resetResult = useCallback(function () {
		setResult(null);
		setError(undefined);
	}, []);

	const renderPreview = useCallback(
		async function (input: {
			card: unknown;
			packageId?: string;
		}): Promise<boolean> {
			const userId = getUserId().trim();
			if (userId === "") {
				return false;
			}
			setBusy(true);
			setError(undefined);
			try {
				const data = await postPromptPreview({
					userId,
					callDirection,
					localHour,
					packageId: input.packageId,
					card: input.card,
				});
				setResult(data);
				return true;
			} catch (err: unknown) {
				setResult(null);
				setError(err instanceof Error ? err.message : "渲染失败");
				return true;
			} finally {
				setBusy(false);
			}
		},
		[getUserId, callDirection, localHour],
	);

	return {
		callDirection,
		setCallDirection,
		localHour,
		setLocalHour,
		busy,
		error,
		result,
		resetResult,
		renderPreview,
	};
}
