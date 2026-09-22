/**
	* GET/POST /api/users — 列出 / 新建 Profile 的 user 段（data/users）。
	* 新建成功后若有 location 则自动 bootstrapLore（失败不挡 201）。
	*/
import {
	apiFail,
	apiOk,
} from "@studio-v2/src/utils/server/http/apiResponse.server";
import { bootstrapLoreAfterCreateUser } from "@studio-v2/src/utils/server/lore/bootstrap/bootstrapLoreAfterCreate.server";
import {
	createUserProfile,
	listProfileUsers,
} from "@studio-v2/src/utils/server/users/usersFs.server";
import { syncHostProfileAfterFsWrite } from "@studio-v2/src/utils/server/users/syncHostProfileAfterFsWrite.server";
import { failFromUnknown, parseCreateUserBody } from "./route.helpers";

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
		const parsed = parseCreateUserBody(body);
		if (!parsed.ok) return parsed.response;
		const user = await createUserProfile(parsed.user);
		await syncHostProfileAfterFsWrite(user.userId);
		const loreWarning = await bootstrapLoreAfterCreateUser(user);
		return apiOk({ user, loreWarning }, { status: 201 });
	} catch (err) {
		return failFromUnknown(err);
	}
}
