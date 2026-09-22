/**
	* /api/users/[userId] 旁路：PUT 校验与 lore 再生提示。
	*/
import {
	UserSchema,
	WorldLoreDocSchema,
	formatZodError,
	isEngineError,
	type User,
} from "@airpc/rpg-engine";
import {
	apiFail,
	httpStatusForCode,
} from "@studio-v2/src/utils/server/http/apiResponse.server";
import { isUserLocationChanged } from "@studio-v2/src/utils/server/lore/bootstrap/loreLocationCompare.server";
import { lorePreviewFromProfile } from "@studio-v2/src/utils/server/lore/preview/lorePreview.server";
import type { readPlayerProfile } from "@studio-v2/src/utils/server/users/usersFs.server";

type PlayerProfile = Awaited<ReturnType<typeof readPlayerProfile>>;

/** 将 catch 未知错误归一为 apiFail Response。 */
export function failFromUnknown(err: unknown): Response {
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

/** 从 Profile.world.lore 读 source；无有效 lore 返回 null。 */
export function loreSourceOf(
	profile: PlayerProfile,
): "llm" | "fallback" | "manual" | null {
	const parsed = WorldLoreDocSchema.safeParse(profile.world?.lore);
	return parsed.success ? parsed.data.source : null;
}

/**
	* 校验 PUT body.user 与路径 userId 一致且通过 UserSchema。
	*/
export function parseUpdateUserBody(
	userId: string,
	body: { user?: unknown },
):
	| { ok: true; user: User }
	| { ok: false; response: Response } {
	if (!body.user || typeof body.user !== "object") {
		return {
			ok: false,
			response: apiFail("VALIDATION_FAILED", "user object required"),
		};
	}
	const raw = body.user as { userId?: string };
	if (raw.userId && raw.userId !== userId) {
		return {
			ok: false,
			response: apiFail("VALIDATION_FAILED", "userId mismatch"),
		};
	}
	const parsed = UserSchema.safeParse({ ...raw, userId });
	if (!parsed.success) {
		return {
			ok: false,
			response: apiFail(
				"VALIDATION_FAILED",
				formatZodError(parsed.error),
				400,
				{ issues: parsed.error.issues },
			),
		};
	}
	return { ok: true, user: parsed.data };
}

/**
	* location 相对旧档变化且已有 lore 时提示再生；update 不碰 world.lore。
	*/
export function buildUserPutPayload(
	before: PlayerProfile,
	user: User,
): {
	user: User;
	loreSource: ReturnType<typeof loreSourceOf>;
	lorePreview: ReturnType<typeof lorePreviewFromProfile>;
	loreRegenSuggested?: true;
} {
	const hadLore = WorldLoreDocSchema.safeParse(before.world?.lore).success;
	const locationChanged = isUserLocationChanged(
		before.user.location,
		user.location,
	);
	return {
		user,
		loreSource: loreSourceOf(before),
		lorePreview: lorePreviewFromProfile(before),
		loreRegenSuggested: hadLore && locationChanged ? true : undefined,
	};
}
