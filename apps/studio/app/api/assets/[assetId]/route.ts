/**
 * 模块名称：GET/PUT/DELETE /api/assets/[assetId]
 */
import {
  apiFail,
  apiOk,
  httpStatusForCode,
} from "@studio/server/apiResponse.server";
import {
  assetFileExists,
  createAsset,
  deleteAsset,
  isValidAssetId,
  readAsset,
  writeAssetMeta,
} from "@studio/server/assetsFs.server";
import { AssetMetaSchema, formatZodError } from "@airpc/rpg-engine";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ assetId: string }> },
): Promise<Response> {
  try {
    const { assetId } = await ctx.params;
    const asset = await readAsset(assetId);
    return apiOk({
      asset: {
        ...asset,
        fileExists: await assetFileExists(asset.uri),
      },
    });
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: string }).code)
        : "NOT_FOUND";
    return apiFail(
      code,
      err instanceof Error ? err.message : String(err),
      httpStatusForCode(code),
    );
  }
}

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ assetId: string }> },
): Promise<Response> {
  try {
    const { assetId } = await ctx.params;
    if (!isValidAssetId(assetId)) {
      return apiFail("VALIDATION_FAILED", "invalid assetId");
    }
    const body = (await req.json()) as {
      asset?: unknown;
      fileBase64?: string;
    };
    if (!body.asset || typeof body.asset !== "object") {
      return apiFail("VALIDATION_FAILED", "asset object required");
    }
    const parsed = AssetMetaSchema.safeParse({
      ...(body.asset as object),
      assetId,
    });
    if (!parsed.success) {
      return apiFail("VALIDATION_FAILED", formatZodError(parsed.error), 400, {
        issues: parsed.error.issues,
      });
    }
    await readAsset(assetId);
    const saved =
      typeof body.fileBase64 === "string"
        ? await createAsset({
            meta: parsed.data,
            fileBase64: body.fileBase64,
          })
        : await writeAssetMeta(parsed.data);
    return apiOk({
      asset: {
        ...saved,
        fileExists: await assetFileExists(saved.uri),
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

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ assetId: string }> },
): Promise<Response> {
  try {
    const { assetId } = await ctx.params;
    await deleteAsset(assetId);
    return apiOk({ ok: true });
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
