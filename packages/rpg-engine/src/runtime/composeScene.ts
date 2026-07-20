/**
 * 模块名称：ComposeScene 构建（本地时间 / 方向 / timeMentionPolicy）
 *
 * 不再推导 TimeBucket；场景层只按 localHour + localHourRange 匹配。
 */
import type { ComposeScene } from "../host/types.js";
import { FREE_PACKAGE_ID, SCHEDULE_PACKAGE_ID } from "../constants.js";

function resolveLocalParts(input: {
  localNowIso?: string;
  timeZone?: string;
}): { isoWithOffset: string; timeZone: string; localHour: number } {
  const timeZone = input.timeZone ?? "Asia/Shanghai";
  if (input.localNowIso && input.localNowIso.length >= 13) {
    const iso = input.localNowIso;
    const hour = Number.parseInt(iso.slice(11, 13), 10);
    return {
      isoWithOffset: iso,
      timeZone,
      localHour: Number.isFinite(hour) ? hour : 0,
    };
  }
  const now = new Date();
  const wall = now.toLocaleString("sv-SE", { timeZone }).replace(" ", "T");
  // sv-SE 无 offset；附上东八区默认（Studio v1）
  const isoWithOffset =
    wall.includes("+") || wall.endsWith("Z") ? wall : `${wall}+08:00`;
  const hour = Number.parseInt(isoWithOffset.slice(11, 13), 10);
  return {
    isoWithOffset,
    timeZone,
    localHour: Number.isFinite(hour) ? hour : now.getHours(),
  };
}

export function callDirectionFromEntryMode(
  entryMode?: string,
): "inbound" | "outbound" {
  if (
    entryMode === "outbound_auto" ||
    entryMode === "outbound" ||
    entryMode === "agent_outbound"
  ) {
    return "outbound";
  }
  return "inbound";
}

/** 真实入口优先于卡定义 entryMode（either 卡仍能区分外呼／提前呼入） */
export function callDirectionFromActualEntry(
  actualEntry?: "inbound_user_dial" | "outbound_auto",
  entryMode?: string,
): "inbound" | "outbound" {
  if (actualEntry === "outbound_auto") {
    return "outbound";
  }
  if (actualEntry === "inbound_user_dial") {
    return "inbound";
  }
  return callDirectionFromEntryMode(entryMode);
}

export function buildComposeScene(input: {
  entryMode?: string;
  /** 本通真实入口；有则覆盖 entryMode 推断方向 */
  actualEntry?: "inbound_user_dial" | "outbound_auto";
  packageId?: string;
  localNowIso?: string;
  timeZone?: string;
  sceneOverride?: Partial<ComposeScene>;
}): ComposeScene {
  const parts = resolveLocalParts({
    localNowIso: input.localNowIso,
    timeZone: input.timeZone,
  });
  const isFree =
    input.packageId === FREE_PACKAGE_ID ||
    input.packageId === SCHEDULE_PACKAGE_ID;
  const base: ComposeScene = {
    callDirection: callDirectionFromActualEntry(
      input.actualEntry,
      input.entryMode,
    ),
    localTime: {
      isoWithOffset: parts.isoWithOffset,
      timeZone: parts.timeZone,
      localHour: parts.localHour,
    },
    timeMentionPolicy: isFree ? "allow_casual" : "correct_only",
  };

  const override = input.sceneOverride;
  if (!override) return base;

  return {
    callDirection: override.callDirection ?? base.callDirection,
    localTime: {
      ...base.localTime,
      ...override.localTime,
      localHour:
        override.localTime?.localHour ?? base.localTime.localHour,
      isoWithOffset:
        override.localTime?.isoWithOffset ?? base.localTime.isoWithOffset,
      timeZone: override.localTime?.timeZone ?? base.localTime.timeZone,
    },
    timeMentionPolicy:
      override.timeMentionPolicy ?? base.timeMentionPolicy,
  };
}
