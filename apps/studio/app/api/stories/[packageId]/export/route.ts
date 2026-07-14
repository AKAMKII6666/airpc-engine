/**
 * 模块名称：GET /api/stories/[packageId]/export（Content zip；error 阻断）
 */
import { createReadStream } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { ZipArchive } from "archiver";
import { PassThrough } from "node:stream";
import {
  apiFail,
  httpStatusForCode,
} from "@studio/server/apiResponse.server";
import { getStudioDataRoot } from "@studio/server/dataRoot.server";
import {
  getStudioEngineHost,
  reloadStudioWorkspace,
} from "@studio/server/engineHost.server";
import { hasBlockingErrors, isEngineError } from "@airpc/rpg-engine";

async function collectFiles(
  dir: string,
  base: string,
  files: Array<{ abs: string; rel: string }>,
): Promise<void> {
  const entries = await readdir(dir);
  for (const name of entries) {
    const abs = path.join(dir, name);
    const st = await stat(abs);
    const rel = path.join(base, name);
    if (st.isDirectory()) {
      await collectFiles(abs, rel, files);
    } else {
      files.push({ abs, rel });
    }
  }
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ packageId: string }> },
): Promise<Response> {
  try {
    const { packageId } = await ctx.params;
    await reloadStudioWorkspace();
    const host = await getStudioEngineHost();
    const report = await host.validatePackage(packageId);
    if (hasBlockingErrors(report)) {
      return apiFail(
        "VALIDATION_FAILED",
        "package has validation errors; export blocked",
        400,
        { report },
      );
    }

    const pkgDir = path.join(
      getStudioDataRoot(),
      "storis-packages",
      packageId,
    );
    const files: Array<{ abs: string; rel: string }> = [];
    await collectFiles(pkgDir, packageId, files);

    const pass = new PassThrough();
    const archive = new ZipArchive({ zlib: { level: 9 } });
    archive.pipe(pass);

    for (const f of files) {
      archive.append(createReadStream(f.abs), { name: f.rel });
    }
    void archive.finalize();

    const chunks: Buffer[] = [];
    for await (const chunk of pass) {
      chunks.push(Buffer.from(chunk));
    }
    const body = Buffer.concat(chunks);

    return new Response(body, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${packageId}-content.zip"`,
      },
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
