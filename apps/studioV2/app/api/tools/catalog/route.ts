/** GET /api/tools/catalog — Studio 卡片编辑器动态工具目录。 */
import {
	CardKindSchema,
	InteractionModeSchema,
} from "@airpc/rpg-engine";
import {
	apiFail,
	apiOk,
} from "@studio-v2/src/utils/server/http/apiResponse.server";
import { getToolCatalog } from "@studio-v2/src/utils/server/tools/toolCatalog.server";

export const runtime = "nodejs";

export async function GET(req: Request): Promise<Response> {
	const url = new URL(req.url);
	const agentId = url.searchParams.get("agentId")?.trim() ?? "";
	const cardKind = CardKindSchema.safeParse(url.searchParams.get("cardKind"));
	const interactionMode = InteractionModeSchema.safeParse(
		url.searchParams.get("interactionMode"),
	);
	if (!agentId || !cardKind.success || !interactionMode.success) {
		return apiFail(
			"VALIDATION_FAILED",
			"agentId, cardKind and interactionMode are required",
			400,
		);
	}
	try {
		return apiOk(
			await getToolCatalog({
				agentId,
				cardKind: cardKind.data,
				interactionMode: interactionMode.data,
			}),
		);
	} catch (error) {
		return apiFail(
			"ENGINE_INTERNAL",
			error instanceof Error ? error.message : String(error),
			500,
		);
	}
}
