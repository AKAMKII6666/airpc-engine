/**
	* POST /api/debug/mailbox/seed — 注入一条 unread 测试留言（仅调试）。
	* body: { userId, packageId?, agentId?, cardId? }
	*/
import { apiOk } from "@studio-v2/src/utils/server/http/apiResponse.server";
import { getStudioV2EngineHost } from "@studio-v2/src/utils/server/host/engineHost.server";
import { projectMailboxSnapshot } from "@studio-v2/src/utils/server/debugger/mailboxProject.server";
import {
	failFromUnknown,
	injectDebugVoicemail,
	resolveSeedFields,
	type SeedBody,
} from "./route.helpers";

export async function POST(req: Request): Promise<Response> {
	try {
		const body = (await req.json()) as SeedBody;
		const resolved = resolveSeedFields(body);
		if (!resolved.ok) return resolved.response;
		const host = await getStudioV2EngineHost();
		await injectDebugVoicemail(host, resolved.fields);
		const after = await host.ensureProfile(resolved.fields.userId);
		return apiOk(projectMailboxSnapshot(resolved.fields.userId, after));
	} catch (err) {
		return failFromUnknown(err);
	}
}
