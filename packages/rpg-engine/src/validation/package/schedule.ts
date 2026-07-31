/**
 * 模块名称：validatePackage 调度 Effect 规则
 * 模块说明：从 validatePackage 拆出以降复杂度基线；读卡经 ContentPort。
 */
import { FREE_CHAPTER_ID, SCHEDULE_CHAPTER_ID } from "../../constants.js";
import { resolveChapterId } from "../../chapter/resolveChapterId.js";
import type { ContentPort } from "../../ports/contentPort.js";
import type { CallCardDefinition } from "../../schema/callCard.js";
import type { ValidationIssue } from "../types.js";

function push(list: ValidationIssue[], issue: ValidationIssue): void {
	list.push(issue);
}

/** SCHEDULE_ONCE_CARD_REQUIRED：延迟外呼必须 agentId+chapterId+cardId */
export function validateScheduleOnceEffect(
	effect: { id: string; effect: string; [key: string]: unknown },
	issuePath: string,
	errors: ValidationIssue[],
): void {
	const agentId = typeof effect.agentId === "string" ? effect.agentId : "";
	const cardId = typeof effect.cardId === "string" ? effect.cardId : "";
	const chapterId = resolveChapterId(effect);
	if (!agentId || !cardId || !chapterId) {
		push(errors, {
			ruleId: "SCHEDULE_ONCE_CARD_REQUIRED",
			level: "error",
			path: issuePath,
			message:
				"schedule_call_card requires agentId + chapterId + cardId（禁止仅 topicHint）",
		});
	}
}

/**
 * SCHEDULE_RECURRING_*：裸 recurring / Story 上 recurring / 目标 kind。
 * 目标卡经 ContentPort.readCard（__schedule__ / __free__ / 故事包）。
 */
export async function validateScheduleRecurringEffect(
	effect: { id: string; effect: string; [key: string]: unknown },
	card: CallCardDefinition,
	issuePath: string,
	content: ContentPort,
	workspaceKey: string,
	errors: ValidationIssue[],
): Promise<void> {
	if (card.cardKind === "story") {
		push(errors, {
			ruleId: "SCHEDULE_RECURRING_IN_STORY",
			level: "error",
			path: issuePath,
			message:
				"schedule_recurring_call is not allowed on StoryCard（周期性外呼归 ScheduleCard）",
		});
	}

	const scheduleCardId =
		typeof effect.scheduleCardId === "string" ? effect.scheduleCardId : "";
	const cardId = typeof effect.cardId === "string" ? effect.cardId : "";
	const chapterId = resolveChapterId(effect);

	if (!scheduleCardId && !(cardId && chapterId)) {
		push(errors, {
			ruleId: "SCHEDULE_RECURRING_CARD_REQUIRED",
			level: "error",
			path: issuePath,
			message:
				"schedule_recurring_call requires scheduleCardId or cardId+chapterId",
		});
		return;
	}

	if (scheduleCardId) {
		await assertScheduleCardViaPort(
			content,
			workspaceKey,
			scheduleCardId,
			issuePath,
			errors,
			`scheduleCardId ${scheduleCardId}`,
		);
		return;
	}

	if (chapterId === SCHEDULE_CHAPTER_ID) {
		await assertScheduleCardViaPort(
			content,
			workspaceKey,
			cardId,
			issuePath,
			errors,
			`cardId ${cardId} (chapterId=__schedule__)`,
		);
		return;
	}

	if (chapterId === FREE_CHAPTER_ID) {
		await assertFreeOrScheduleFallback(
			content,
			workspaceKey,
			cardId,
			issuePath,
			errors,
		);
		return;
	}

	await rejectStoryPackageRecurringTarget(
		content,
		workspaceKey,
		chapterId,
		cardId,
		issuePath,
		errors,
	);
}

async function assertFreeOrScheduleFallback(
	content: ContentPort,
	workspaceKey: string,
	cardId: string,
	issuePath: string,
	errors: ValidationIssue[],
): Promise<void> {
	const target =
		(await content.readCard({
			workspaceKey,
			chapterId: FREE_CHAPTER_ID,
			cardId,
		})) ??
		(await content.readCard({
			workspaceKey,
			chapterId: SCHEDULE_CHAPTER_ID,
			cardId,
		}));
	if (!target) {
		push(errors, {
			ruleId: "SCHEDULE_CARD_KIND",
			level: "error",
			path: issuePath,
			message: `recurring free/schedule card not found: ${cardId}`,
		});
		return;
	}
	if (target.cardKind !== "free" && target.cardKind !== "schedule") {
		push(errors, {
			ruleId: "SCHEDULE_CARD_KIND",
			level: "error",
			path: issuePath,
			message: `recurring target ${cardId} must be free or schedule card`,
		});
	}
}

async function rejectStoryPackageRecurringTarget(
	content: ContentPort,
	workspaceKey: string,
	chapterId: string,
	cardId: string,
	issuePath: string,
	errors: ValidationIssue[],
): Promise<void> {
	const storyCard = await content.readCard({
		workspaceKey,
		chapterId,
		cardId,
	});
	const kind = storyCard?.cardKind ?? null;
	const message =
		kind === "story"
			? `recurring target ${chapterId}/${cardId} is a StoryCard; must be characters/schedule-cards (scheduleCardId or chapterId=__schedule__)`
			: kind === "schedule"
				? `recurring target ${chapterId}/${cardId} is a package-local schedule node; daily ScheduleCard must live in characters/schedule-cards (use scheduleCardId or chapterId=__schedule__)`
				: `recurring target ${chapterId}/${cardId} is not an allowed schedule/free fallback`;
	push(errors, {
		ruleId: "SCHEDULE_CARD_KIND",
		level: "error",
		path: issuePath,
		message,
	});
}

async function assertScheduleCardViaPort(
	content: ContentPort,
	workspaceKey: string,
	scheduleCardId: string,
	issuePath: string,
	errors: ValidationIssue[],
	label: string,
): Promise<void> {
	const card = await content.readCard({
		workspaceKey,
		chapterId: SCHEDULE_CHAPTER_ID,
		cardId: scheduleCardId,
	});
	if (!card) {
		push(errors, {
			ruleId: "SCHEDULE_CARD_KIND",
			level: "error",
			path: issuePath,
			message: `${label} not found in characters/schedule-cards`,
		});
		return;
	}
	if (card.cardKind !== "schedule") {
		push(errors, {
			ruleId: "SCHEDULE_CARD_KIND",
			level: "error",
			path: issuePath,
			message: `${label} must have cardKind "schedule"`,
		});
	}
}
