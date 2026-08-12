/**
	* 调试器外呼人工 E2E 种子与验证。
	* 只写 Profile.schedule/Board，不直接派发 shell event，确保后续仍走 Host clock tick。
	*/
import { randomUUID } from "node:crypto";
import {
	isEngineError,
	type EngineHost,
	type PlayerProfile,
	type ScheduledIntent,
} from "@airpc/rpg-engine";
import { getStudioV2EngineHost } from "@studio-v2/src/utils/server/host/engineHost.server";
import { writeDtoLog } from "@studio-v2/src/utils/server/observability/dto/dtoLogStore.server";
import { writeStudioLog } from "@studio-v2/src/utils/server/observability/logger/pinoLogger.server";
import { isValidUserId } from "@studio-v2/src/utils/server/users/usersFs.server";

export type SeedDebuggerOutboundE2EInput = {
	/** 当前调试用户 id；必须来自 Studio UserGate/调试器用户 */
	userId?: string;
	/** 外呼角色；默认澜星 */
	agentId?: string;
	/** 外呼目标章节；默认 wrong_number_act1 */
	chapterId?: string;
	/** 外呼目标通话卡；默认 lanxing_callback_intro */
	cardId?: string;
	/** 延迟毫秒；默认 10 秒，最短 1 秒，最长 5 分钟 */
	delayMs?: number;
	/** 人工 E2E 备注，会进入 schedule topicHint */
	topicHint?: string;
};

export type VerifyDebuggerOutboundE2EInput = {
	/** 当前调试用户 id */
	userId?: string;
	/** seed 返回的 intentId；可选，为空时取最近 debug_outbound_e2e intent */
	intentId?: string;
};

export type DebuggerOutboundE2ESeedView = {
	/** 本次种子的 once intent id；可用于验证接口索引 */
	intentId: string;
	/** 新建或复用的 Board pending instance id */
	instanceId: string;
	/** 当前调试用户 */
	userId: string;
	/** 外呼角色 */
	agentId: string;
	/** 外呼目标章节 */
	chapterId: string;
	/** 外呼目标卡 */
	cardId: string;
	/** 当前 Profile.schedule.clockMs */
	clockMs: number;
	/** 计划触发的逻辑时钟毫秒 */
	fireAtMs: number;
	/** 供人工等待的真实延迟毫秒 */
	delayMs: number;
	/** DTO 快照文件相对 data/debug-dto 路径 */
	dtoPath: string;
};

export type DebuggerOutboundE2EVerifyView = {
	/** 验证目标 intent；找不到时为 null */
	intentId: string | null;
	/** 当前 Profile.schedule.clockMs */
	clockMs: number;
	/** schedule 中该 once intent 的状态 */
	scheduleStatus: string | null;
	/** Board pending 中 linked instance 的状态 */
	pendingStatus: string | null;
	/** Host incoming queue 是否已有对应外呼事件 */
	hasIncomingEvent: boolean;
	/** 匹配到的 incoming event id；无则 null */
	incomingEventId: string | null;
	/** 外呼目标角色；找不到时为 null */
	agentId: string | null;
	/** 外呼目标章节；找不到时为 null */
	chapterId: string | null;
	/** 外呼目标卡；找不到时为 null */
	cardId: string | null;
};

const DEBUG_INTENT_PREFIX = "debug_outbound_e2e:";
const DEFAULT_AGENT_ID = "lanxing";
const DEFAULT_CHAPTER_ID = "wrong_number_act1";
const DEFAULT_CARD_ID = "lanxing_callback_intro";
const DEFAULT_DELAY_MS = 10_000;
const MAX_DELAY_MS = 5 * 60_000;
const E2E_PENDING_PRIORITY = 1_000_000;

type PendingBoardEntry = PlayerProfile["callCards"]["board"]["byAgent"][string]["pending"][number];

function textOrDefault(value: unknown, fallback: string): string {
	return typeof value === "string" && value.trim() !== ""
		? value.trim()
		: fallback;
}

function boundedDelayMs(value: unknown): number {
	if (typeof value !== "number" || !Number.isFinite(value)) {
		return DEFAULT_DELAY_MS;
	}
	return Math.min(Math.max(Math.floor(value), 1_000), MAX_DELAY_MS);
}

function assertValidUserId(userId: string): void {
	if (isValidUserId(userId)) return;
	throw Object.assign(new Error("userId required"), {
		code: "VALIDATION_FAILED",
		status: 400,
	});
}

function ensureSchedule(profile: PlayerProfile): NonNullable<PlayerProfile["schedule"]> {
	if (!profile.schedule) {
		profile.schedule = { clockMs: 0, intents: [] };
	}
	if (!Array.isArray(profile.schedule.intents)) {
		profile.schedule.intents = [];
	}
	return profile.schedule;
}

function ensureBoard(
	profile: PlayerProfile,
	agentId: string,
): { pending: PendingBoardEntry[] } {
	const byAgent = profile.callCards.board.byAgent;
	if (!byAgent[agentId]) {
		byAgent[agentId] = { pending: [] };
	}
	return byAgent[agentId]!;
}

function isDebugIntent(raw: unknown): boolean {
	const row = raw as { intentId?: unknown } | null;
	return (
		typeof row?.intentId === "string" &&
		row.intentId.startsWith(DEBUG_INTENT_PREFIX)
	);
}

function cleanupPreviousDebugSeeds(
	profile: PlayerProfile,
	agentId: string,
): void {
	const board = profile.callCards.board.byAgent[agentId];
	if (board) {
		board.pending = board.pending.filter(function (item) {
			return !item.scheduledIntentId?.startsWith(DEBUG_INTENT_PREFIX);
		});
	}
	const schedule = ensureSchedule(profile);
	schedule.intents = schedule.intents.filter(function (intent) {
		const row = intent as { agentId?: unknown };
		return !(isDebugIntent(intent) && row.agentId === agentId);
	});
}

function findIntent(
	profile: PlayerProfile,
	intentId: string | null,
): ScheduledIntent | null {
	const schedule = ensureSchedule(profile);
	const candidates = schedule.intents.filter(isDebugIntent) as ScheduledIntent[];
	if (intentId) {
		return candidates.find((item) => item.intentId === intentId) ?? null;
	}
	return candidates.at(-1) ?? null;
}

function findPendingByInstance(
	profile: PlayerProfile,
	agentId: string,
	instanceId: string | undefined,
): PendingBoardEntry | null {
	if (!instanceId) return null;
	return profile.callCards.board.byAgent[agentId]?.pending.find(function (item) {
		return item.instanceId === instanceId;
	}) ?? null;
}

function inputIntentId(input: VerifyDebuggerOutboundE2EInput): string | null {
	if (typeof input.intentId !== "string") return null;
	const trimmed = input.intentId.trim();
	return trimmed === "" ? null : trimmed;
}

function linkedInstanceIdOf(intent: ScheduledIntent | null): string | undefined {
	if (intent?.kind !== "once") return undefined;
	return intent.linkedInstanceId;
}

function chapterIdOf(intent: ScheduledIntent | null): string | null {
	if (intent?.kind !== "once") return null;
	return intent.chapterId ?? null;
}

function cardIdOf(intent: ScheduledIntent | null): string | null {
	if (intent?.kind !== "once") return null;
	return intent.cardId ?? null;
}

function findIncomingForIntent(
	host: EngineHost,
	userId: string,
	intent: ScheduledIntent | null,
) {
	if (!intent) return null;
	return host.listIncomingCallEvents(userId).find(function (event) {
		return event.scheduleIntentId === intent.intentId;
	}) ?? null;
}

async function assertCardExists(
	host: EngineHost,
	chapterId: string,
	cardId: string,
): Promise<void> {
	const loaded = await host.preloadCard(chapterId, cardId);
	if (isEngineError(loaded)) throw loaded;
}

/** 写入一条短延迟真实外呼种子；后续由 wall-clock pump 自动触发 */
export async function seedDebuggerOutboundE2E(
	input: SeedDebuggerOutboundE2EInput,
	host?: EngineHost,
): Promise<DebuggerOutboundE2ESeedView> {
	const userId = textOrDefault(input.userId, "");
	assertValidUserId(userId);
	const agentId = textOrDefault(input.agentId, DEFAULT_AGENT_ID);
	const chapterId = textOrDefault(input.chapterId, DEFAULT_CHAPTER_ID);
	const cardId = textOrDefault(input.cardId, DEFAULT_CARD_ID);
	const delayMs = boundedDelayMs(input.delayMs);
	const activeHost = host ?? await getStudioV2EngineHost();
	await assertCardExists(activeHost, chapterId, cardId);
	const profile = await activeHost.ensureProfile(userId);
	const schedule = ensureSchedule(profile);
	cleanupPreviousDebugSeeds(profile, agentId);
	const nowIso = new Date().toISOString();
	const intentId = `${DEBUG_INTENT_PREFIX}${randomUUID()}`;
	const instanceId = randomUUID();
	const board = ensureBoard(profile, agentId);
	board.pending.push({
		instanceId,
		cardId,
		chapterId,
		agentId,
		status: "pending",
		entryMode: "either",
		activationHint: "outbound_auto",
		scheduledIntentId: intentId,
		priority: E2E_PENDING_PRIORITY,
		createdAt: nowIso,
		updatedAt: nowIso,
	});
	const clockMs = schedule.clockMs ?? 0;
	const fireAtMs = clockMs + delayMs;
	schedule.intents.push({
		kind: "once",
		intentId,
		agentId,
		cardId,
		chapterId,
		topicHint: textOrDefault(input.topicHint, "人工 E2E 外呼种子"),
		fireAtMs,
		status: "pending",
		linkedInstanceId: instanceId,
		createdAt: nowIso,
	});
	await activeHost.saveProfile(userId, "manual");
	const view: DebuggerOutboundE2ESeedView = {
		intentId,
		instanceId,
		userId,
		agentId,
		chapterId,
		cardId,
		clockMs,
		fireAtMs,
		delayMs,
		dtoPath: `schedule-intents/${intentId}.json`,
	};
	void writeDtoLog({
		bucket: "schedule-intents",
		id: intentId,
		event: "debugger.e2e.outbound.seeded",
		userId,
		summary: { agentId, chapterId, cardId, delayMs },
		payload: view,
	});
	writeStudioLog("schedule", "info", {
		event: "debugger.e2e.outbound.seeded",
		userId,
		agentId,
		chapterId,
		cardId,
		message: "seeded debugger outbound E2E schedule intent",
		payload: view,
	});
	return view;
}

/** 验证 E2E 种子当前处于 schedule / Board / incoming 哪一段 */
export async function verifyDebuggerOutboundE2E(
	input: VerifyDebuggerOutboundE2EInput,
	host?: EngineHost,
): Promise<DebuggerOutboundE2EVerifyView> {
	const userId = textOrDefault(input.userId, "");
	assertValidUserId(userId);
	const activeHost = host ?? await getStudioV2EngineHost();
	const profile = await activeHost.ensureProfile(userId);
	const intent = findIntent(profile, inputIntentId(input));
	const pending = intent
		? findPendingByInstance(profile, intent.agentId, linkedInstanceIdOf(intent))
		: null;
	const incoming = findIncomingForIntent(activeHost, userId, intent);
	return {
		intentId: intent?.intentId ?? null,
		clockMs: ensureSchedule(profile).clockMs ?? 0,
		scheduleStatus: intent?.status ?? null,
		pendingStatus: pending?.status ?? null,
		hasIncomingEvent: incoming !== null,
		incomingEventId: incoming?.eventId ?? null,
		agentId: intent?.agentId ?? null,
		chapterId: chapterIdOf(intent),
		cardId: cardIdOf(intent),
	};
}
