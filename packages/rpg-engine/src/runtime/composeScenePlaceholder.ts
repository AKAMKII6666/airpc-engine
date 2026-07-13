/**
 * 模块名称：ComposeScene 占位（P1；真 Composer 见 P4）
 */
import type { ComposeScene } from "../host/types.js";

function hourBucket(hour: number): string {
  if (hour >= 5 && hour < 11) return "morning";
  if (hour >= 11 && hour < 14) return "noon";
  if (hour >= 14 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 22) return "evening";
  return "night";
}

export function buildPlaceholderComposeScene(input: {
  entryMode?: string;
  localNowIso?: string;
  timeZone?: string;
}): ComposeScene {
  const timeZone = input.timeZone ?? "Asia/Shanghai";
  const iso =
    input.localNowIso ??
    new Date().toLocaleString("sv-SE", { timeZone }).replace(" ", "T") +
      "+08:00";
  const hour = Number.parseInt(iso.slice(11, 13), 10);
  const localHour = Number.isFinite(hour) ? hour : new Date().getHours();
  const outbound =
    input.entryMode === "outbound_auto" ||
    input.entryMode === "outbound" ||
    input.entryMode === "agent_outbound";

  return {
    callDirection: outbound ? "outbound" : "inbound",
    localTime: {
      isoWithOffset: iso,
      timeZone,
      bucket: hourBucket(localHour),
      localHour,
    },
    timeMentionPolicy: "correct_only",
  };
}
