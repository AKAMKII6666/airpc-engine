/**
 * 白半仙专属：八字排盘纯计算。
 */
import { createRequire } from "node:module";

export const COMPUTE_BAZI_CHART_TOOL_ID = "compute_bazi_chart";

export type BaziCalendarType = "solar" | "lunar";

interface LunarJavascriptEightChar {
  getYear(): string;
  getMonth(): string;
  getDay(): string;
  getTime(): string;
  getYearWuXing(): string;
  getMonthWuXing(): string;
  getDayWuXing(): string;
  getTimeWuXing(): string;
}

interface LunarJavascriptModule {
  Solar: {
    fromYmdHms(
      year: number,
      month: number,
      day: number,
      hour: number,
      minute: number,
      second: number,
    ): { getLunar(): { getEightChar(): LunarJavascriptEightChar } };
  };
  Lunar: {
    fromYmdHms(
      year: number,
      month: number,
      day: number,
      hour: number,
      minute: number,
      second: number,
    ): { getEightChar(): LunarJavascriptEightChar };
  };
}

const lunarJavascript = createRequire(import.meta.url)(
  "lunar-javascript",
) as LunarJavascriptModule;

export interface ComputeBaziChartArgs {
  calendar_type: BaziCalendarType;
  birth_date: string;
  birth_time?: string;
}

export interface BaziChart {
  calendarType: BaziCalendarType;
  birth: {
    year: number;
    month: number;
    day: number;
    hour: number | null;
    minute: number | null;
  };
  pillars: {
    year: string;
    month: string;
    day: string;
    time: string | null;
  };
  wuxing: {
    year: string;
    month: string;
    day: string;
    time: string | null;
  };
  dayMaster: string;
  hourKnown: boolean;
}

export interface ComputeBaziChartResult {
  status: "ok";
  chart: BaziChart;
}

export interface ComputeBaziChartErrorResult {
  status: "error";
  message: string;
}

export type ComputeBaziChartLocalResult =
  | ComputeBaziChartResult
  | ComputeBaziChartErrorResult;

function parseDate(value: string):
  | { ok: true; year: number; month: number; day: number }
  | { ok: false; message: string } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return { ok: false, message: "birth_date must be YYYY-MM-DD" };
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  ) {
    return { ok: false, message: "birth_date is not a valid date" };
  }
  return { ok: true, year, month, day };
}

function parseTime(value: string | undefined):
  | { ok: true; hour: number | null; minute: number | null }
  | { ok: false; message: string } {
  if (!value) return { ok: true, hour: null, minute: null };
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) {
    return { ok: false, message: "birth_time must be HH:mm" };
  }
  return { ok: true, hour: Number(match[1]), minute: Number(match[2]) };
}

function readEightChar(input: {
  calendarType: BaziCalendarType;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}): LunarJavascriptEightChar {
  if (input.calendarType === "lunar") {
    return lunarJavascript.Lunar.fromYmdHms(
      input.year,
      input.month,
      input.day,
      input.hour,
      input.minute,
      0,
    ).getEightChar();
  }
  return lunarJavascript.Solar.fromYmdHms(
    input.year,
    input.month,
    input.day,
    input.hour,
    input.minute,
    0,
  )
    .getLunar()
    .getEightChar();
}

export function computeBaziChart(
  args: ComputeBaziChartArgs,
): ComputeBaziChartLocalResult {
  const date = parseDate(args.birth_date);
  if (!date.ok) return { status: "error", message: date.message };
  const time = parseTime(args.birth_time);
  if (!time.ok) return { status: "error", message: time.message };

  try {
    const eightChar = readEightChar({
      calendarType: args.calendar_type,
      year: date.year,
      month: date.month,
      day: date.day,
      hour: time.hour ?? 0,
      minute: time.minute ?? 0,
    });
    const hourKnown = time.hour !== null;
    return {
      status: "ok",
      chart: {
        calendarType: args.calendar_type,
        birth: {
          year: date.year,
          month: date.month,
          day: date.day,
          hour: time.hour,
          minute: time.minute,
        },
        pillars: {
          year: eightChar.getYear(),
          month: eightChar.getMonth(),
          day: eightChar.getDay(),
          time: hourKnown ? eightChar.getTime() : null,
        },
        wuxing: {
          year: eightChar.getYearWuXing(),
          month: eightChar.getMonthWuXing(),
          day: eightChar.getDayWuXing(),
          time: hourKnown ? eightChar.getTimeWuXing() : null,
        },
        dayMaster: eightChar.getDay(),
        hourKnown,
      },
    };
  } catch {
    return {
      status: "error",
      message: "unable to compute bazi chart from provided birth info",
    };
  }
}
