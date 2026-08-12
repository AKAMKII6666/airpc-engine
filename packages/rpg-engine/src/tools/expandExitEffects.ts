/**
 * 模块名称：register_exit 工具 → Effect 模板展开
 */
import { randomUUID } from "node:crypto";
import { FREE_CHAPTER_ID } from "../constants.js";
import type { Effect } from "../schema/outcome.js";
import { engineError, type EngineError } from "../host/errors.js";

export interface RegisterExitContext {
  sessionAgentId: string;
  sessionCardId: string;
  sessionChapterId: string;
  sessionCardKind: string;
}

export function expandRegisterExitEffects(
  toolId: string,
  args: Record<string, unknown>,
  ctx: RegisterExitContext,
): Effect[] | EngineError {
  switch (toolId) {
    case "share_expert_number": {
      const target = String(args.target_agent_id ?? "");
      if (!target) {
        return engineError(
          "VALIDATION_FAILED",
          "share_expert_number requires target_agent_id",
        );
      }
      return [
        {
          id: `unlock_${target}`,
          effect: "set_character_unlocked",
          agentId: target,
          unlocked: true,
        },
      ];
    }
    case "refer_to_expert": {
      const target = String(args.target_agent_id ?? "");
      if (!target) {
        return engineError(
          "VALIDATION_FAILED",
          "refer_to_expert requires target_agent_id",
        );
      }
      const cardId = String(args.card_id ?? "");
      const chapterId = String(args.package_id ?? "");
      if (!cardId || !chapterId) {
        return engineError(
          "VALIDATION_FAILED",
          "refer_to_expert requires card_id + package_id for schedule_call_card",
        );
      }
      const delayMin =
        typeof args.delay_minutes === "number" ? args.delay_minutes : 5;
      return [
        {
          id: `unlock_${target}`,
          effect: "set_character_unlocked",
          agentId: target,
          unlocked: true,
        },
        {
          id: `sched_${target}`,
          effect: "schedule_call_card",
          scheduleOrigin: "expert_referral",
          agentId: target,
          cardId,
          chapterId,
          topicHint: String(args.topic_hint ?? ""),
          delayMinutes: delayMin,
        },
      ];
    }
    case "schedule_reminder_call": {
      if (ctx.sessionCardKind !== "free") {
        return engineError(
          "VALIDATION_FAILED",
          "schedule_reminder_call is only available on free call cards",
        );
      }
      const delayMinutes =
        typeof args.delay_minutes === "number"
          ? args.delay_minutes
          : typeof args.delay_hours === "number"
            ? args.delay_hours * 60
            : 60;
      return [
        {
          id: `reminder_${randomUUID()}`,
          effect: "schedule_call_card",
          scheduleOrigin: "user_reminder",
          agentId: ctx.sessionAgentId,
          cardId: ctx.sessionCardId,
          chapterId: ctx.sessionChapterId || FREE_CHAPTER_ID,
          topicHint: String(args.topic_hint ?? ""),
          delayMinutes,
        },
      ];
    }
    case "schedule_recurring_call": {
      const scheduleCardId =
        typeof args.schedule_card_id === "string" && args.schedule_card_id
          ? String(args.schedule_card_id)
          : undefined;
      const cardId =
        typeof args.card_id === "string" && args.card_id
          ? String(args.card_id)
          : undefined;
      const chapterId =
        typeof args.package_id === "string" && args.package_id
          ? String(args.package_id)
          : undefined;
      if (!scheduleCardId && !(cardId && chapterId)) {
        return engineError(
          "VALIDATION_FAILED",
          "schedule_recurring_call requires schedule_card_id or card_id+package_id",
        );
      }
      const row: Effect = {
        id: `recurring_${randomUUID()}`,
        effect: "schedule_recurring_call",
        scheduleOrigin: "recurring_schedule",
        agentId: ctx.sessionAgentId,
        topicHint: String(args.topic_hint ?? ""),
        hour: Number(args.hour ?? 9),
        minute: Number(args.minute ?? 0),
        scheduleMode: String(args.schedule_mode ?? "daily"),
        weekdays: args.weekdays,
        jobId: args.job_id,
      };
      if (scheduleCardId) row.scheduleCardId = scheduleCardId;
      if (cardId) row.cardId = cardId;
      if (chapterId) row.chapterId = chapterId;
      return [row];
    }
    case "record_shared_secret": {
      const label = String(args.label ?? "");
      const hint = String(args.recall_hint ?? "");
      if (!label) {
        return engineError(
          "VALIDATION_FAILED",
          "record_shared_secret requires label",
        );
      }
      return [
        {
          id: `secret_${randomUUID()}`,
          effect: "patch_memory",
          agentId: ctx.sessionAgentId,
          layer: "semantic",
          text: `shared_secret label=${label}; hint=${hint}`,
          kind: "semantic",
        },
      ];
    }
    case "create_research_commitment": {
      const question = String(args.question ?? "");
      if (!question) {
        return engineError(
          "VALIDATION_FAILED",
          "create_research_commitment requires question",
        );
      }
      return [
        {
          id: `research_${randomUUID()}`,
          effect: "create_research_commitment",
          question,
          notifyMode: String(args.notify_mode ?? "next_call"),
        },
      ];
    }
    case "record_user_name": {
      const nickname = String(args.nickname ?? "");
      if (!nickname) {
        return engineError(
          "VALIDATION_FAILED",
          "record_user_name requires nickname",
        );
      }
      return [
        {
          id: `user_name_${randomUUID()}`,
          effect: "update_user_profile",
          nickname,
          fullName:
            typeof args.full_name === "string" ? args.full_name : undefined,
        },
      ];
    }
    default:
      return engineError(
        "VALIDATION_FAILED",
        `no effect template for toolId: ${toolId}`,
      );
  }
}
