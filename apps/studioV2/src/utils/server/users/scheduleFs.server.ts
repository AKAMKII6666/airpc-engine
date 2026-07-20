/**
	* Profile.schedule.intents 读写：按 userId 整段合并；角色页按 agentId 过滤。
	* 仅 Next API 调用；不改 user 段。
	*/
import {
	ScheduledIntentSchema,
	type PlayerProfile,
	type ScheduledIntent,
} from "@airpc/rpg-engine";
import {
	readPlayerProfile,
} from "../users/usersFs.server";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { getStudioV2DataRoot } from "../data/dataRoot.server";

function profilePath(userId: string): string {
	return path.join(getStudioV2DataRoot(), "users", userId, "profile.save.json");
}

async function writeProfile(profile: PlayerProfile): Promise<void> {
	const dir = path.join(getStudioV2DataRoot(), "users", profile.userId);
	await mkdir(dir, { recursive: true });
	await writeFile(
		profilePath(profile.userId),
		JSON.stringify(profile, null, 2) + "\n",
		"utf8",
	);
}

function ensureSchedule(profile: PlayerProfile): {
	clockMs: number;
	intents: unknown[];
} {
	if (!profile.schedule) {
		profile.schedule = { clockMs: 0, intents: [] };
	}
	if (!Array.isArray(profile.schedule.intents)) {
		profile.schedule.intents = [];
	}
	return profile.schedule;
}

/**
	* 列出某玩家、某角色过滤后的 intents（经 schema 校验可返回的项）。
	*/
export async function listAgentScheduleIntents(
	userId: string,
	agentId: string,
): Promise<{ clockMs: number; intents: ScheduledIntent[] }> {
	const profile = await readPlayerProfile(userId);
	const schedule = ensureSchedule(profile);
	const intents: ScheduledIntent[] = [];
	for (const raw of schedule.intents) {
		const parsed = ScheduledIntentSchema.safeParse(raw);
		if (!parsed.success) continue;
		if (parsed.data.agentId !== agentId) continue;
		intents.push(parsed.data);
	}
	return { clockMs: schedule.clockMs, intents };
}

/**
	* 新增或覆盖同 intentId 的意图；强制 agentId 与路径一致。
	*/
export async function upsertAgentScheduleIntent(
	userId: string,
	agentId: string,
	intentInput: unknown,
): Promise<ScheduledIntent> {
	const parsed = ScheduledIntentSchema.safeParse(intentInput);
	if (!parsed.success) {
		throw Object.assign(new Error("invalid ScheduledIntent"), {
			code: "VALIDATION_FAILED",
			cause: parsed.error,
		});
	}
	if (parsed.data.agentId !== agentId) {
		throw Object.assign(new Error("agentId mismatch"), {
			code: "VALIDATION_FAILED",
		});
	}
	const profile = await readPlayerProfile(userId);
	const schedule = ensureSchedule(profile);
	const next: unknown[] = [];
	let replaced = false;
	for (const raw of schedule.intents) {
		const row = ScheduledIntentSchema.safeParse(raw);
		if (
			row.success &&
			row.data.intentId === parsed.data.intentId &&
			row.data.agentId === agentId
		) {
			next.push(parsed.data);
			replaced = true;
			continue;
		}
		next.push(raw);
	}
	if (!replaced) next.push(parsed.data);
	schedule.intents = next;
	profile.meta = {
		...profile.meta,
		updatedAt: new Date().toISOString(),
	};
	await writeProfile(profile);
	return parsed.data;
}

/**
	* 删除指定 intentId（仅当 agentId 匹配）；写后回读。
	*/
export async function deleteAgentScheduleIntent(
	userId: string,
	agentId: string,
	intentId: string,
): Promise<void> {
	const profile = await readPlayerProfile(userId);
	const schedule = ensureSchedule(profile);
	const before = schedule.intents.length;
	schedule.intents = schedule.intents.filter(function (raw) {
		const row = ScheduledIntentSchema.safeParse(raw);
		if (!row.success) return true;
		if (row.data.intentId === intentId && row.data.agentId === agentId) {
			return false;
		}
		return true;
	});
	if (schedule.intents.length === before) {
		throw Object.assign(new Error(`intent not found: ${intentId}`), {
			code: "NOT_FOUND",
		});
	}
	profile.meta = {
		...profile.meta,
		updatedAt: new Date().toISOString(),
	};
	await writeProfile(profile);
}
