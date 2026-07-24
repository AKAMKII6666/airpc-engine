/**
	* GET /api/stories — 扫描 data/storis-packages 下各包的 story.conf.json。
	* POST /api/stories — 新建最小包（conf + layout + 可选默认入口卡）。
	*/
import {
	apiFail,
	apiOk,
	httpStatusForCode,
} from "@studio-v2/src/utils/server/http/apiResponse.server";
import { reloadStudioV2WorkspaceIfBooted } from "@studio-v2/src/utils/server/host/engineHost.server";
import { createDiskStoryPackage } from "@studio-v2/src/utils/server/packages/fs/packagesFs.server";
import { listDiskStoryPackages } from "@studio-v2/src/utils/server/packages/list/packagesList.server";
import { isValidPackageId } from "@studio-v2/src/utils/server/packages/paths/packagesPaths.server";
import {
	ensureWorkspaceStartupPackageId,
	readWorkspaceConfig,
	setWorkspaceStartupPackageId,
	validateStartupPackageId,
} from "@studio-v2/src/utils/server/workspace/workspaceFs.server";
import { isEngineError } from "@airpc/rpg-engine";

export async function GET(): Promise<Response> {
	try {
		const [packages, workspace] = await Promise.all([
			listDiskStoryPackages(),
			ensureWorkspaceStartupPackageId(),
		]);
		return apiOk({
			packages,
			startupPackageId: workspace.startupPackageId,
		});
	} catch (err) {
		return apiFail(
			"ENGINE_INTERNAL",
			err instanceof Error ? err.message : String(err),
			500,
		);
	}
}

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

/**
	* 新建故事包：body = { packageId?, title, description?, withStartCard? }。
	* packageId 缺省时由服务端按 title 派生；冲突返回 CONFLICT。
	*/
export async function POST(req: Request): Promise<Response> {
	try {
		const body = (await req.json()) as {
			packageId?: unknown;
			title?: unknown;
			description?: unknown;
			withStartCard?: unknown;
		};
		const title =
			typeof body.title === "string" ? body.title.trim() : "";
		if (title.length === 0) {
			return apiFail("VALIDATION_FAILED", "title required");
		}
		const rawId =
			typeof body.packageId === "string" ? body.packageId.trim() : "";
		const packageId =
			rawId.length > 0
				? rawId
				: `pkg_${title
						.toLowerCase()
						.replace(/[^a-z0-9]+/g, "_")
						.replace(/^_+|_+$/g, "")
						.slice(0, 40) || "story"}`.slice(0, 64);
		if (!isValidPackageId(packageId)) {
			return apiFail("VALIDATION_FAILED", "invalid packageId");
		}
		const bundle = await createDiskStoryPackage({
			packageId,
			title,
			description:
				typeof body.description === "string" ? body.description : "",
			withStartCard: body.withStartCard !== false,
		});
		// 库空或指针无效时：新建包自动成为首故事
		const workspace = await readWorkspaceConfig();
		const startupErr = await validateStartupPackageId(
			workspace.startupPackageId,
		);
		if (startupErr) {
			await setWorkspaceStartupPackageId(packageId);
		}
		await reloadStudioV2WorkspaceIfBooted();
		return apiOk(bundle, { status: 201 });
	} catch (err) {
		return failFromUnknown(err);
	}
}
