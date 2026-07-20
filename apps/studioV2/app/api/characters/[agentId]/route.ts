/**
	* GET/PUT/DELETE /api/characters/[agentId] — 单角色读写删。
	*/
import {
	CharacterDefSchema,
	formatZodError,
	isEngineError,
} from "@airpc/rpg-engine";
import {
	apiFail,
	apiOk,
	httpStatusForCode,
} from "@studio-v2/src/utils/server/http/apiResponse.server";
import {
	deleteCharacterJson,
	readCharacterJson,
	writeCharacterJson,
} from "@studio-v2/src/utils/server/characters/charactersFs.server";
import { findTimeBucketsRejectReason } from "@studio-v2/src/bis/pageBis/characters/detail/form/characterDefMapper";

export async function GET(
	_req: Request,
	ctx: { params: Promise<{ agentId: string }> },
): Promise<Response> {
	try {
		const { agentId } = await ctx.params;
		const raw = await readCharacterJson(agentId);
		const reject = findTimeBucketsRejectReason(raw);
		if (reject) {
			return apiFail("VALIDATION_FAILED", reject, 422);
		}
		const parsed = CharacterDefSchema.safeParse(raw);
		if (!parsed.success) {
			return apiFail("VALIDATION_FAILED", formatZodError(parsed.error), 400, {
				issues: parsed.error.issues,
			});
		}
		return apiOk({ character: parsed.data });
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

export async function PUT(
	req: Request,
	ctx: { params: Promise<{ agentId: string }> },
): Promise<Response> {
	try {
		const { agentId } = await ctx.params;
		const body = (await req.json()) as { character?: unknown };
		if (!body.character || typeof body.character !== "object") {
			return apiFail("VALIDATION_FAILED", "character object required");
		}
		const raw = body.character as { agentId?: string };
		if (raw.agentId && raw.agentId !== agentId) {
			return apiFail("VALIDATION_FAILED", "agentId mismatch");
		}
		const reject = findTimeBucketsRejectReason(body.character);
		if (reject) {
			return apiFail("VALIDATION_FAILED", reject, 422);
		}
		const parsed = CharacterDefSchema.safeParse({ ...raw, agentId });
		if (!parsed.success) {
			return apiFail("VALIDATION_FAILED", formatZodError(parsed.error), 400, {
				issues: parsed.error.issues,
			});
		}
		await writeCharacterJson(agentId, parsed.data);
		return apiOk({ character: parsed.data });
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

export async function DELETE(
	_req: Request,
	ctx: { params: Promise<{ agentId: string }> },
): Promise<Response> {
	try {
		const { agentId } = await ctx.params;
		await deleteCharacterJson(agentId);
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
