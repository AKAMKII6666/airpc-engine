/**
	* 首通提示词预览 BFF ajax（Client）；不 import 引擎。
	*/
import { parseStudioApiJson } from "@studio-v2/src/utils/ajaxHelper/studioApiClient";
import type {
	PromptPreviewRequestBody,
	PromptPreviewResult,
} from "@studio-v2/typeFiles/story/promptPreview/promptPreviewDto";

/** POST /api/prompt-preview */
export async function postPromptPreview(
	body: PromptPreviewRequestBody,
): Promise<PromptPreviewResult> {
	const res = await fetch("/api/prompt-preview", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	return parseStudioApiJson<PromptPreviewResult>(res);
}
