/** 动态工具目录 ajaxProxy；Client 唯一网络入口。 */
import { parseStudioApiJson } from "@studio-v2/src/utils/ajaxHelper/studioApiClient";
import type { ToolCatalogDto } from "@studio-v2/typeFiles/tools/toolCatalog";

export async function fetchToolCatalog(input: {
	agentId: string;
	cardKind: string;
	interactionMode: string;
}): Promise<ToolCatalogDto> {
	const query = new URLSearchParams({
		agentId: input.agentId,
		cardKind: input.cardKind,
		interactionMode: input.interactionMode,
	});
	const response = await fetch(`/api/tools/catalog?${query.toString()}`);
	return parseStudioApiJson<ToolCatalogDto>(response);
}
