/**
	* GET/POST /api/users — 列出 / 新建 Profile 的 user 段（data/users）。
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
	createUserProfile,
	isValidUserId,
	listProfileUsers,
} from "@studio-v2/src/utils/server/users/usersFs.server";

export async function GET(): Promise<Response> {
	try {
		const users = await listProfileUsers();
		return apiOk({ users });
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
		const body = (await req.json()) as { user?: unknown };
		if (!body.user || typeof body.user !== "object") {
			return apiFail("VALIDATION_FAILED", "user object required");
		}
		const raw = body.user as { userId?: string };
		if (!raw.userId || typeof raw.userId !== "string") {
			return apiFail("VALIDATION_FAILED", "userId required");
		}
		if (!isValidUserId(raw.userId)) {
			return apiFail("VALIDATION_FAILED", "userId 格式无效");
		}
		const parsed = UserSchema.safeParse(body.user);
		if (!parsed.success) {
			return apiFail("VALIDATION_FAILED", formatZodError(parsed.error), 400, {
				issues: parsed.error.issues,
			});
		}
		const user = await createUserProfile(parsed.data);
		return apiOk({ user }, { status: 201 });
	} catch (err) {
		if (isEngineError(err)) {
			return apiFail(err.code, err.message, httpStatusForCode(err.code));
		}
		const code =
			typeof err === "object" && err && "code" in err
				? String((err as { code: string }).code)
				: "ENGINE_INTERNAL";
		return apiFail(
			code,
			err instanceof Error ? err.message : String(err),
			httpStatusForCode(code),
		);
	}
}
