/**
 * 模块名称：register_exit 工具 → Effect 模板展开
 */
import { randomUUID } from "node:crypto";
import type { Effect } from "../schema/outcome.js";
import { engineError, type EngineError } from "../host/errors.js";

export function expandRegisterExitEffects(
  toolId: string,
  args: Record<string, unknown>,
  sessionAgentId: string,
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
      const packageId = String(args.package_id ?? "");
      if (!cardId || !packageId) {
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
          agentId: target,
          cardId,
          packageId,
          topicHint: String(args.topic_hint ?? ""),
          delayMinutes: delayMin,
        },
      ];
    }
    case "schedule_reminder_call": {
      const cardId = String(args.card_id ?? "");
      const packageId = String(args.package_id ?? "");
      if (!cardId || !packageId) {
        return engineError(
          "VALIDATION_FAILED",
          "schedule_reminder_call requires card_id + package_id",
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
          id: `reminder_${randomUUID().slice(0, 8)}`,
          effect: "schedule_call_card",
          agentId: sessionAgentId,
          cardId,
          packageId,
          topicHint: String(args.topic_hint ?? ""),
          delayMinutes,
        },
      ];
    }
    case "schedule_recurring_call": {
      return [
        {
          id: `recurring_${randomUUID().slice(0, 8)}`,
          effect: "schedule_recurring_call",
          agentId: sessionAgentId,
          topicHint: String(args.topic_hint ?? ""),
          hour: Number(args.hour ?? 9),
          minute: Number(args.minute ?? 0),
          scheduleMode: String(args.schedule_mode ?? "daily"),
          weekdays: args.weekdays,
          jobId: args.job_id,
        },
      ];
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
          id: `secret_${randomUUID().slice(0, 8)}`,
          effect: "patch_memory",
          agentId: sessionAgentId,
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
          id: `research_${randomUUID().slice(0, 8)}`,
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
          id: `user_name_${randomUUID().slice(0, 8)}`,
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
