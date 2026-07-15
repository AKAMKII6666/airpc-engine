'use strict';

/**
 * Module: hardStop
 * Purpose: Match configured patterns against text → BLOCKED.
 */

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

/**
 * @returns {{ hit: boolean, pattern: string|null, snippet: string|null }}
 */
function checkHardStop(texts, patterns) {
  const compiled = compilePatterns(patterns);
  const blob = (Array.isArray(texts) ? texts : [texts]).filter(Boolean).join('\n');
  for (const { source, re } of compiled) {
    const m = blob.match(re);
    if (m) {
      return {
        hit: true,
        pattern: source,
        snippet: m[0].slice(0, 120),
      };
    }
  }
  return { hit: false, pattern: null, snippet: null };
}

module.exports = { checkHardStop, compilePatterns };
