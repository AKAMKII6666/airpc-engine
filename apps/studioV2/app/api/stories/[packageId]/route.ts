/**
	* GET/PUT/DELETE /api/stories/[packageId] — 包容器元数据 / 整包 / 删包。
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
	readDiskPackageConf,
	readDiskPackageContainer,
	updateDiskPackageMeta,
	writeDiskPackageContainer,
} from "@studio-v2/src/utils/server/packages/fs/package/packagesFs.server";

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

/** GET ?view=container 返回整包；默认返回 packageConf */
export async function GET(
	req: Request,
	ctx: { params: Promise<{ packageId: string }> },
): Promise<Response> {
	try {
		const { packageId } = await ctx.params;
		const url = new URL(req.url);
		if (url.searchParams.get("view") === "container") {
			const container = await readDiskPackageContainer(packageId);
			return apiOk(container);
		}
		const packageConf = await readDiskPackageConf(packageId);
		return apiOk({ packageConf });
	} catch (err) {
		return failFromUnknown(err);
	}
}

/** PUT 整包容器（导入覆盖） */
export async function PUT(
	req: Request,
	ctx: { params: Promise<{ packageId: string }> },
): Promise<Response> {
	try {
		const { packageId } = await ctx.params;
		const body = (await req.json()) as {
			packageConf?: unknown;
			chapters?: unknown[];
		};
		if (!body.packageConf || typeof body.packageConf !== "object") {
			return apiFail("VALIDATION_FAILED", "packageConf object required");
		}
		if (!Array.isArray(body.chapters)) {
			return apiFail("VALIDATION_FAILED", "chapters array required");
		}
		const container = await writeDiskPackageContainer(packageId, {
			packageConf: body.packageConf,
			chapters: body.chapters as Array<{
				conf: unknown;
				cards: unknown[];
				layout?: unknown | null;
			}>,
		});
		await reloadStudioV2WorkspaceIfBooted();
		return apiOk(container);
	} catch (err) {
		return failFromUnknown(err);
	}
}

/** PATCH 包容器元数据 */
export async function PATCH(
	req: Request,
	ctx: { params: Promise<{ packageId: string }> },
): Promise<Response> {
	try {
		const { packageId } = await ctx.params;
		const body = (await req.json()) as { title?: unknown };
		const title = typeof body.title === "string" ? body.title.trim() : "";
		if (title.length === 0) {
			return apiFail("VALIDATION_FAILED", "title required");
		}
		const packageConf = await updateDiskPackageMeta({ packageId, title });
		await reloadStudioV2WorkspaceIfBooted();
		return apiOk({ packageConf });
	} catch (err) {
		return failFromUnknown(err);
	}
}

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
