'use strict';

/**
 * Module: hardStop
 * Purpose: Match configured patterns against agent/review text → BLOCKED.
 * Negated mentions (e.g. 「非本仓：Realtime」「不做电话壳」「未见 Host 写口」) do NOT trip.
 */

/** Window around a match used to detect out-of-scope / prohibition phrasing. */
const NEGATION_WINDOW = 120;

/**
 * Phrases that mean "we are NOT doing X" near a hard-stop keyword.
 * Includes reviewer-style wording: 未见 / 无 Host / 未改 / 不涉及 …
 */
const NEGATION_RE =
  /不(做|含|算|在|对接|实现|迁|写|接|碰)|未(见|改|实现|接入|对接|涉及)|无\s*(Host|调试|引擎写口)|非本仓|不算进|刻意后置|禁止|排除|不做分母|非\s*本仓|分母|后置|仅参考|不对标|不迁移|不涉及/i;

function compilePatterns(patterns) {
  const out = [];
  for (const p of patterns || []) {
    if (!p) {
      continue;
    }
    try {
      out.push({ source: p, re: new RegExp(p, 'i') });
    } catch {
      // skip invalid regex; do not shift indices of valid ones
    }
  }
  return out;
}

function isNegatedContext(blob, matchIndex, matchLength) {
  const start = Math.max(0, matchIndex - NEGATION_WINDOW);
  const end = Math.min(blob.length, matchIndex + matchLength + NEGATION_WINDOW);
  return NEGATION_RE.test(blob.slice(start, end));
}

/**
 * @returns {{
 *   hit: boolean,
 *   pattern: string|null,
 *   snippet: string|null,
 *   context: string|null,
 *   skippedNegations: number
 * }}
 */
function checkHardStop(texts, patterns, options = {}) {
  const allowNegation = options.allowNegation !== false;
  const compiled = compilePatterns(patterns);
  const blob = (Array.isArray(texts) ? texts : [texts]).filter(Boolean).join('\n');
  let skippedNegations = 0;

  for (const { source, re } of compiled) {
    const flags = re.flags.includes('g') ? re.flags : `${re.flags}g`;
    const globalRe = new RegExp(re.source, flags);
    let m = globalRe.exec(blob);
    while (m) {
      if (allowNegation && isNegatedContext(blob, m.index, m[0].length)) {
        skippedNegations += 1;
        m = globalRe.exec(blob);
        continue;
      }
      const ctxStart = Math.max(0, m.index - 40);
      const ctxEnd = Math.min(blob.length, m.index + m[0].length + 40);
      return {
        hit: true,
        pattern: source,
        snippet: m[0].slice(0, 120),
        context: blob.slice(ctxStart, ctxEnd).replace(/\s+/g, ' ').slice(0, 200),
        skippedNegations,
      };
    }
  }
  return {
    hit: false,
    pattern: null,
    snippet: null,
    context: null,
    skippedNegations,
  };
}

module.exports = {
  checkHardStop,
  compilePatterns,
  isNegatedContext,
  NEGATION_WINDOW,
  NEGATION_RE,
};
