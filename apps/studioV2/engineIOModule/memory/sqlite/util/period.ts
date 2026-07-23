/**
	* 模块名称：Memory rollup 日历 period（UTC）
	*/
import { pad2 } from "./helpers";
import type { RollupPeriod } from "../db/types";

/** 日历月 period（UTC） */
export function monthPeriodFromIso(iso: string): RollupPeriod {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) {
		throw new Error(`invalid endedAt for rollup: ${iso}`);
	}
	const y = d.getUTCFullYear();
	const m = d.getUTCMonth();
	const key = `${y}-${pad2(m + 1)}`;
	const rangeFrom = `${key}-01T00:00:00.000Z`;
	const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
	const rangeTo = `${key}-${pad2(lastDay)}T23:59:59.999Z`;
	return { kind: "month", key, rangeFrom, rangeTo };
}

/** 日历季 period（UTC） */
export function quarterPeriodFromIso(iso: string): RollupPeriod {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) {
		throw new Error(`invalid endedAt for rollup: ${iso}`);
	}
	const y = d.getUTCFullYear();
	const m = d.getUTCMonth();
	const q = Math.floor(m / 3) + 1;
	const startMonth = (q - 1) * 3;
	const endMonth = startMonth + 2;
	const key = `${y}-Q${q}`;
	const rangeFrom = `${y}-${pad2(startMonth + 1)}-01T00:00:00.000Z`;
	const lastDay = new Date(Date.UTC(y, endMonth + 1, 0)).getUTCDate();
	const rangeTo = `${y}-${pad2(endMonth + 1)}-${pad2(lastDay)}T23:59:59.999Z`;
	return { kind: "quarter", key, rangeFrom, rangeTo };
}

/** 上一自然月（用于跨月补算） */
export function previousMonthPeriod(iso: string): RollupPeriod {
	const d = new Date(iso);
	const prev = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 15));
	return monthPeriodFromIso(prev.toISOString());
}

/** 上一自然季（用于跨季补算） */
export function previousQuarterPeriod(iso: string): RollupPeriod {
	const d = new Date(iso);
	const prev = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 3, 15));
	return quarterPeriodFromIso(prev.toISOString());
}
