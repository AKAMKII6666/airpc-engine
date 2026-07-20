/**
 * 模块名称：GET/POST /api/assets
 */
import {
  apiFail,
  apiOk,
  httpStatusForCode,
} from "@studio/server/apiResponse.server";
import {
  assetFileExists,
  createAsset,
  isValidAssetId,
  listAssets,
} from "@studio/server/assetsFs.server";
import { AssetMetaSchema, formatZodError } from "@airpc/rpg-engine";

export async function GET(): Promise<Response> {
  try {
    const assets = await listAssets();
    const withFlags = await Promise.all(
      assets.map(async function (a) {
        return {
          ...a,
          fileExists: await assetFileExists(a.uri),
        };
      }),
    );
    return apiOk({ assets: withFlags });
  } catch (err) {
    return apiFail(
      "ENGINE_INTERNAL",
      err instanceof Error ? err.message : String(err),
      500,
    );
  }
}

export async function POST(req: Request): Promise<Response> {
  try {
    const body = (await req.json()) as {
      asset?: unknown;
      fileBase64?: string;
    };
    if (!body.asset || typeof body.asset !== "object") {
      return apiFail("VALIDATION_FAILED", "asset object required");
    }
    const parsed = AssetMetaSchema.safeParse(body.asset);
    if (!parsed.success) {
      return apiFail("VALIDATION_FAILED", formatZodError(parsed.error), 400, {
        issues: parsed.error.issues,
      });
    }
    if (!isValidAssetId(parsed.data.assetId)) {
      return apiFail(
        "VALIDATION_FAILED",
        "assetId must be snake_case starting with a letter",
      );
    }
    const existing = await listAssets();
    if (existing.some((a) => a.assetId === parsed.data.assetId)) {
      return apiFail("VALIDATION_FAILED", "assetId already exists", 409);
    }
    const created = await createAsset({
      meta: parsed.data,
      fileBase64:
        typeof body.fileBase64 === "string" ? body.fileBase64 : undefined,
    });
    return apiOk({
      asset: {
        ...created,
        fileExists: await assetFileExists(created.uri),
      },
    });
  } catch (err) {
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
}
