/**
	* 编辑器「运行调试」章节开局：outbound_auto 入口卡走 delay=0 调度来电，
	* 不 beginCall，让 UI 出现接/拒 modal（与产品「澜星打给用户」一致）。
	*/
import { isEngineError, type EngineHost } from "@airpc/rpg-engine";
import {
	seedDebuggerOutboundE2E,
	verifyDebuggerOutboundE2E,
	type DebuggerOutboundE2ESeedView,
	type DebuggerOutboundE2EVerifyView,
} from "@studio-v2/src/utils/server/debugger/e2e/outboundE2ESeed.server";
import { findDebuggerChapterEntry } from "@studio-v2/src/utils/server/debugger/session/debuggerChapterEntry.server";
import { endDebuggerCallSession } from "@studio-v2/src/utils/server/debugger/session/debuggerCallSessionEnd.server";
import { getStudioV2EngineHost } from "@studio-v2/src/utils/server/host/engineHost.server";
import { readDiskChapterBundle } from "@studio-v2/src/utils/server/packages/fs/package/packagesFs.server";
import { isValidUserId } from "@studio-v2/src/utils/server/users/usersFs.server";
import { writeStudioLog } from "@studio-v2/src/utils/server/observability/logger/pinoLogger.server";

export type RingDebuggerChapterEntryInput = {
	/** 当前调试用户 id */
	userId: string;
	/** 编辑器当前章节 id */
	chapterId: string;
};

/** outbound 入口：已写入 schedule 并 tick 出 incoming event */
export type RingDebuggerChapterEntryOutboundView = {
	mode: "outbound_ring";
	/** 章节入口卡 id */
	cardId: string;
	/** 入口卡 ownerAgentId */
	agentId: string;
	/** delay=0 种子投影 */
	seed: DebuggerOutboundE2ESeedView;
	/** tick 后链路验证；应 hasIncomingEvent=true */
	verify: DebuggerOutboundE2EVerifyView;
};

/** 非外呼入口：客户端仍走 simulate_chapter_start */
export type RingDebuggerChapterEntrySimulateView = {
	mode: "simulate_start";
	chapterId: string;
	cardId: string;
};

export type RingDebuggerChapterEntryView =
	| RingDebuggerChapterEntryOutboundView
	| RingDebuggerChapterEntrySimulateView;

function textOrFail(value: unknown, code: string, message: string): string {
	if (typeof value === "string" && value.trim() !== "") {
		return value.trim();
	}
	throw Object.assign(new Error(message), { code, status: 400 });
}

async function clearOrphanActiveCall(
	host: EngineHost,
	userId: string,
): Promise<void> {
	const active = host.getActiveSession(userId);
	if (!active) return;
	try {
		await endDebuggerCallSession({
			userId,
			hangupEarly: true,
			completedBeats: [],
		}, host);
	} catch {
		// 留给后续 accept/start 再清；开局响铃优先
	}
}

/**
	* 解析章节入口：outbound_auto → delay=0 种调度并 advanceClock(0) 派发来电；
	* 否则回落 simulate，由客户端 beginCall。
	*/
export async function ringDebuggerChapterEntry(
	input: RingDebuggerChapterEntryInput,
	host?: EngineHost,
): Promise<RingDebuggerChapterEntryView> {
	const userId = textOrFail(input.userId, "VALIDATION_FAILED", "userId required");
	if (!isValidUserId(userId)) {
		throw Object.assign(new Error("userId required"), {
			code: "VALIDATION_FAILED",
			status: 400,
		});
	}
	const chapterId = textOrFail(
		input.chapterId,
		"VALIDATION_FAILED",
		"chapterId required",
	);
	const entry = await findDebuggerChapterEntry(chapterId);
	const bundle = await readDiskChapterBundle(entry.packageId, entry.chapterId);
	const card = bundle.cards.find(function (item) {
		return item.cardId === entry.cardId;
	});
	if (!card) {
		throw Object.assign(new Error("章节起始卡定义缺失"), {
			code: "NOT_FOUND",
			status: 404,
		});
	}
	const agentId = textOrFail(
		card.ownerAgentId,
		"VALIDATION_FAILED",
		"入口卡缺少 ownerAgentId",
	);
	if (card.entryMode !== "outbound_auto") {
		return {
			mode: "simulate_start",
			chapterId: entry.chapterId,
			cardId: entry.cardId,
		};
	}

	const activeHost = host ?? (await getStudioV2EngineHost());
	await activeHost.ensureProfile(userId);
	await clearOrphanActiveCall(activeHost, userId);

	const seed = await seedDebuggerOutboundE2E(
		{
			userId,
			agentId,
			chapterId: entry.chapterId,
			cardId: entry.cardId,
			delayMs: 0,
			topicHint: "chapter_entry_ring",
		},
		activeHost,
	);
	// fireAtMs === clockMs 时 advanceToNext 找不到「下一」意图；用 delta=0 触发 tick
	const fired = activeHost.advanceClock(userId, 0);
	if (isEngineError(fired)) throw fired;
	await activeHost.saveProfile(userId, "autosave");

	const verify = await verifyDebuggerOutboundE2E(
		{ userId, intentId: seed.intentId },
		activeHost,
	);
	if (!verify.hasIncomingEvent) {
		throw Object.assign(
			new Error(
				"章节入口 delay=0 调度已种下但未派发来电（可能被外呼窗闸 defer）",
			),
			{ code: "ENGINE_INTERNAL", status: 500 },
		);
	}

	writeStudioLog("debugger", "info", {
		event: "debugger.chapter_entry.outbound_ring",
		userId,
		agentId,
		chapterId: entry.chapterId,
		cardId: entry.cardId,
		message: "chapter entry ringed via delay=0 schedule tick",
		payload: {
			intentId: seed.intentId,
			incomingEventId: verify.incomingEventId,
			firedCount: fired.length,
		},
	});

	return {
		mode: "outbound_ring",
		cardId: entry.cardId,
		agentId,
		seed,
		verify,
	};
}
