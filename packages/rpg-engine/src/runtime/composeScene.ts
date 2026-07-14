/**
 * 模块名称：ComposeScene 构建（本地时间 / 方向 / timeMentionPolicy）
 */
import type { ComposeScene, TimeBucket } from "../host/types.js";
import { hourToTimeBucket } from "../schema/promptScene.js";

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
  const isoWithOffset = wall.includes("+") || wall.endsWith("Z")
    ? wall
    : `${wall}+08:00`;
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

export function buildComposeScene(input: {
  entryMode?: string;
  packageId?: string;
  localNowIso?: string;
  timeZone?: string;
  sceneOverride?: Partial<ComposeScene>;
}): ComposeScene {
  const parts = resolveLocalParts({
    localNowIso: input.localNowIso,
    timeZone: input.timeZone,
  });
  const bucket: TimeBucket = hourToTimeBucket(parts.localHour);
  const isFree = input.packageId === "__free__";
  const base: ComposeScene = {
    callDirection: callDirectionFromEntryMode(input.entryMode),
    localTime: {
      isoWithOffset: parts.isoWithOffset,
      timeZone: parts.timeZone,
      bucket,
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
      bucket: (override.localTime?.bucket ??
        (override.localTime?.localHour !== undefined
          ? hourToTimeBucket(override.localTime.localHour)
          : base.localTime.bucket)) as TimeBucket,
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
