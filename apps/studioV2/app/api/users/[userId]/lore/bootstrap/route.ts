/**
	* POST /api/users/[userId]/lore/bootstrap — 生成／强制重生成世界背景。
	* body: { force?: boolean }；详情「重新生成」传 force:true。
	*/
import { isEngineError } from "@airpc/rpg-engine";
import {
	apiFail,
	apiOk,
	httpStatusForCode,
} from "@studio-v2/src/utils/server/http/apiResponse.server";
import { getStudioV2EngineHost } from "@studio-v2/src/utils/server/host/engineHost.server";
import { lorePreviewFromDoc } from "@studio-v2/src/utils/server/lore/lorePreview.server";
import { isValidUserId } from "@studio-v2/src/utils/server/users/usersFs.server";
import { syncHostProfileAfterFsWrite } from "@studio-v2/src/utils/server/users/syncHostProfileAfterFsWrite.server";

export async function POST(
	req: Request,
	ctx: { params: Promise<{ userId: string }> },
): Promise<Response> {
	try {
		const { userId } = await ctx.params;
		if (!isValidUserId(userId)) {
			return apiFail("VALIDATION_FAILED", "userId 格式无效");
		}
		const body = (await req.json().catch(function () {
			return {};
		})) as { force?: boolean };
		const host = await getStudioV2EngineHost();
		await syncHostProfileAfterFsWrite(userId);
		await host.ensureProfile(userId);
		const result = await host.bootstrapLore(userId, {
			force: body.force === true,
		});
		if (isEngineError(result)) {
			return apiFail(
				result.code,
				result.message,
				httpStatusForCode(result.code),
			);
		}
		return apiOk({
			lore: lorePreviewFromDoc(result.lore),
			usedFallback: result.usedFallback,
			errorMessage: result.errorMessage,
		});
	} catch (err) {
		if (isEngineError(err)) {
			return apiFail(err.code, err.message, httpStatusForCode(err.code));
		}
		return apiFail(
			"ENGINE_INTERNAL",
			err instanceof Error ? err.message : String(err),
			500,
		);
	}
}
