/**
	* GET/PUT/DELETE /api/users/[userId] — 单用户 Profile.user 读写删。
	* PUT 若 location 相对旧档变化且已有 lore，不覆盖 lore，仅返回 loreRegenSuggested。
	*/
import {
	UserSchema,
	WorldLoreDocSchema,
	formatZodError,
	isEngineError,
} from "@airpc/rpg-engine";
import {
	apiFail,
	apiOk,
	httpStatusForCode,
} from "@studio-v2/src/utils/server/http/apiResponse.server";
import { isUserLocationChanged } from "@studio-v2/src/utils/server/lore/bootstrap/loreLocationCompare.server";
import { lorePreviewFromProfile } from "@studio-v2/src/utils/server/lore/preview/lorePreview.server";
import {
	deleteUserProfile,
	readPlayerProfile,
	updateProfileUser,
} from "@studio-v2/src/utils/server/users/usersFs.server";
import {
	evictHostProfileAfterFsDelete,
	syncHostProfileAfterFsWrite,
} from "@studio-v2/src/utils/server/users/syncHostProfileAfterFsWrite.server";

function loreSourceOf(
	profile: Awaited<ReturnType<typeof readPlayerProfile>>,
): "llm" | "fallback" | "manual" | null {
	const parsed = WorldLoreDocSchema.safeParse(profile.world?.lore);
	return parsed.success ? parsed.data.source : null;
}

export async function GET(
	_req: Request,
	ctx: { params: Promise<{ userId: string }> },
): Promise<Response> {
	try {
		const { userId } = await ctx.params;
		const profile = await readPlayerProfile(userId);
		return apiOk({
			user: profile.user,
			loreSource: loreSourceOf(profile),
			lorePreview: lorePreviewFromProfile(profile),
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

		const before = await readPlayerProfile(userId);
		const hadLore = WorldLoreDocSchema.safeParse(before.world?.lore).success;
		const locationChanged = isUserLocationChanged(
			before.user.location,
			parsed.data.location,
		);
		const loreRegenSuggested = Boolean(hadLore && locationChanged);

		const user = await updateProfileUser(userId, parsed.data);
		await syncHostProfileAfterFsWrite(userId);
		// update 只改 user 段，不碰 world.lore；source 仍取保存前档案
		return apiOk({
			user,
			loreSource: loreSourceOf(before),
			lorePreview: lorePreviewFromProfile(before),
			loreRegenSuggested: loreRegenSuggested ? true : undefined,
		});
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
		await evictHostProfileAfterFsDelete(userId);
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
