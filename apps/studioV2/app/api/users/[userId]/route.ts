/**
	* GET/PUT/DELETE /api/users/[userId] — 单用户 Profile.user 读写删。
	* PUT 若 location 相对旧档变化且已有 lore，不覆盖 lore，仅返回 loreRegenSuggested。
	*/
import {
	apiOk,
} from "@studio-v2/src/utils/server/http/apiResponse.server";
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
import {
	buildUserPutPayload,
	failFromUnknown,
	loreSourceOf,
	parseUpdateUserBody,
} from "./route.helpers";

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
		return failFromUnknown(err);
	}
}

export async function PUT(
	req: Request,
	ctx: { params: Promise<{ userId: string }> },
): Promise<Response> {
	try {
		const { userId } = await ctx.params;
		const body = (await req.json()) as { user?: unknown };
		const parsed = parseUpdateUserBody(userId, body);
		if (!parsed.ok) return parsed.response;

		const before = await readPlayerProfile(userId);
		const user = await updateProfileUser(userId, parsed.user);
		await syncHostProfileAfterFsWrite(userId);
		// update 只改 user 段，不碰 world.lore；source 仍取保存前档案
		return apiOk(buildUserPutPayload(before, user));
	} catch (err) {
		return failFromUnknown(err);
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
		return failFromUnknown(err);
	}
}
