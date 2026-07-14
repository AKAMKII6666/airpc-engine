/**
 * 模块名称：GET/PUT/PATCH/DELETE /api/stories/[packageId]
 */
import {
  apiFail,
  apiOk,
  httpStatusForCode,
} from "@studio/server/apiResponse.server";
import {
  deleteStoryPackage,
  readAllStoryCards,
  readStoryLayout,
  readStoryPackageConf,
  renameStoryPackage,
  writeStoryPackageConf,
} from "@studio/server/storiesFs.server";
import { reloadStudioWorkspace } from "@studio/server/engineHost.server";
import {
  StoryPackageConfSchema,
  formatZodError,
  isEngineError,
} from "@airpc/rpg-engine";

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
    const conf = await readStoryPackageConf(packageId);
    if (conf.schemaVersion !== 1) {
      return apiFail(
        "SCHEMA_UNSUPPORTED",
        `package ${packageId} schemaVersion ${conf.schemaVersion} unsupported`,
        422,
        { packageId, schemaVersion: conf.schemaVersion, supported: 1 },
      );
    }
    const layout = await readStoryLayout(packageId);
    const cards = await readAllStoryCards(
      packageId,
      conf.cards.map((c) => c.cardId),
    );
    return apiOk({ conf, layout, cards });
  } catch (err) {
    return apiFail(
      "NOT_FOUND",
      err instanceof Error ? err.message : String(err),
      404,
    );
  }
}

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ packageId: string }> },
): Promise<Response> {
  try {
    const { packageId } = await ctx.params;
    const body = (await req.json()) as { conf?: Record<string, unknown> };
    if (!body.conf || typeof body.conf !== "object") {
      return apiFail("VALIDATION_FAILED", "conf object required");
    }
    if (body.conf.packageId && body.conf.packageId !== packageId) {
      return apiFail("VALIDATION_FAILED", "conf.packageId mismatch");
    }
    const parsed = StoryPackageConfSchema.safeParse({
      ...body.conf,
      packageId,
    });
    if (!parsed.success) {
      return apiFail(
        "VALIDATION_FAILED",
        formatZodError(parsed.error),
        400,
        { issues: parsed.error.issues },
      );
    }
    await writeStoryPackageConf(packageId, parsed.data);
    await reloadStudioWorkspace();
    return apiOk({ ok: true });
  } catch (err) {
    return failFromUnknown(err);
  }
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ packageId: string }> },
): Promise<Response> {
  try {
    const { packageId } = await ctx.params;
    const body = (await req.json()) as {
      newPackageId?: string;
      title?: string;
    };
    if (typeof body.newPackageId === "string" && body.newPackageId.trim()) {
      const renamed = await renameStoryPackage(packageId, body.newPackageId);
      if (typeof body.title === "string") {
        const conf = await readStoryPackageConf(renamed.packageId);
        await writeStoryPackageConf(renamed.packageId, {
          ...conf,
          title: body.title.trim() || renamed.title,
        });
        renamed.title = body.title.trim() || renamed.title;
      }
      await reloadStudioWorkspace();
      return apiOk({ story: renamed });
    }
    if (typeof body.title === "string") {
      const conf = await readStoryPackageConf(packageId);
      const title = body.title.trim() || conf.title || packageId;
      await writeStoryPackageConf(packageId, { ...conf, title });
      await reloadStudioWorkspace();
      return apiOk({
        story: {
          packageId,
          title,
          schemaVersion: conf.schemaVersion,
          cardCount: conf.cards.length,
        },
      });
    }
    return apiFail("VALIDATION_FAILED", "newPackageId or title required");
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
    await deleteStoryPackage(packageId);
    await reloadStudioWorkspace();
    return apiOk({ ok: true });
  } catch (err) {
    return failFromUnknown(err);
  }
}
