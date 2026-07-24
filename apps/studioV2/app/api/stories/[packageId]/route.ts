/**
	* GET/PUT/DELETE /api/stories/[packageId] — 整包读 / 写 / 删 data/storis-packages。
	* PUT：写盘后 validatePackage；error 回滚并阻断（PACKAGE_VALIDATION_FAILED）。
	* DELETE：拒删首故事与最后一个包。
	*/
import { isEngineError } from "@airpc/rpg-engine";
import {
	apiFail,
	apiOk,
	httpStatusForCode,
} from "@studio-v2/src/utils/server/http/apiResponse.server";
import { reloadStudioV2WorkspaceIfBooted } from "@studio-v2/src/utils/server/host/engineHost.server";
import {
	deleteDiskStoryPackage,
	readDiskStoryPackage,
} from "@studio-v2/src/utils/server/packages/fs/packagesFs.server";
import { writeValidatedDiskStoryPackage } from "@studio-v2/src/utils/server/packages/fs/writeValidatedPackage.server";

function failFromUnknown(err: unknown): Response {
	if (isEngineError(err)) {
		return apiFail(err.code, err.message, httpStatusForCode(err.code));
	}
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

export async function GET(
	_req: Request,
	ctx: { params: Promise<{ packageId: string }> },
): Promise<Response> {
	try {
		const { packageId } = await ctx.params;
		const bundle = await readDiskStoryPackage(packageId);
		return apiOk(bundle);
	} catch (err) {
		return failFromUnknown(err);
	}
}

/**
	* 整包保存：body = { conf, cards, layout? }；写后 validate；error 回滚不保留坏盘。
	*/
export async function PUT(
	req: Request,
	ctx: { params: Promise<{ packageId: string }> },
): Promise<Response> {
	try {
		const { packageId } = await ctx.params;
		const body = (await req.json()) as {
			conf?: unknown;
			cards?: unknown;
			layout?: unknown | null;
		};
		if (!body.conf || typeof body.conf !== "object") {
			return apiFail("VALIDATION_FAILED", "conf object required");
		}
		if (!Array.isArray(body.cards)) {
			return apiFail("VALIDATION_FAILED", "cards array required");
		}
		const confObj = body.conf as { packageId?: string };
		if (confObj.packageId && confObj.packageId !== packageId) {
			return apiFail("VALIDATION_FAILED", "conf.packageId mismatch");
		}
		const result = await writeValidatedDiskStoryPackage(packageId, {
			conf: body.conf,
			cards: body.cards,
			layout: body.layout,
		});
		if (!result.ok) {
			return apiFail(
				"PACKAGE_VALIDATION_FAILED",
				`故事包校验未通过（${result.report.errors.length} 个错误）`,
				422,
				{ report: result.report },
			);
		}
		await reloadStudioV2WorkspaceIfBooted();
		return apiOk({
			bundle: result.bundle,
			validation: result.report,
		});
	} catch (err) {
		return failFromUnknown(err);
	}
}

/**
	* 删除故事包目录；首故事与最后一个包由 deleteDiskStoryPackage 拒删。
	*/
export async function DELETE(
	_req: Request,
	ctx: { params: Promise<{ packageId: string }> },
): Promise<Response> {
	try {
		const { packageId } = await ctx.params;
		const result = await deleteDiskStoryPackage(packageId);
		await reloadStudioV2WorkspaceIfBooted();
		return apiOk(result);
	} catch (err) {
		return failFromUnknown(err);
	}
}
