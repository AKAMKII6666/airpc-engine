/**
	* GET/PUT/DELETE /api/users/[userId] — 单用户 Profile.user 读写删。
	*/
import {
	UserSchema,
	formatZodError,
	isEngineError,
} from "@airpc/rpg-engine";
import {
	apiFail,
	apiOk,
	httpStatusForCode,
} from "@studio-v2/src/utils/server/http/apiResponse.server";
import {
	deleteUserProfile,
	readPlayerProfile,
	updateProfileUser,
} from "@studio-v2/src/utils/server/users/usersFs.server";

export async function GET(
	_req: Request,
	ctx: { params: Promise<{ userId: string }> },
): Promise<Response> {
	try {
		const { userId } = await ctx.params;
		const profile = await readPlayerProfile(userId);
		return apiOk({ user: profile.user });
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
	ctx: { params: Promise<{ userId: string }> },
): Promise<Response> {
	try {
		const { userId } = await ctx.params;
		const body = (await req.json()) as { user?: unknown };
		if (!body.user || typeof body.user !== "object") {
			return apiFail("VALIDATION_FAILED", "user object required");
		}
		const raw = body.user as { userId?: string };
		if (raw.userId && raw.userId !== userId) {
			return apiFail("VALIDATION_FAILED", "userId mismatch");
		}
		const parsed = UserSchema.safeParse({ ...raw, userId });
		if (!parsed.success) {
			return apiFail("VALIDATION_FAILED", formatZodError(parsed.error), 400, {
				issues: parsed.error.issues,
			});
		}
		const user = await updateProfileUser(userId, parsed.data);
		return apiOk({ user });
	} catch (err) {
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
}

export async function DELETE(
	_req: Request,
	ctx: { params: Promise<{ userId: string }> },
): Promise<Response> {
	try {
		const { userId } = await ctx.params;
		await deleteUserProfile(userId);
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
