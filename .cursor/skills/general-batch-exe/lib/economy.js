'use strict';

/**
 * Module: economy
 * Purpose: Economy modes 1|2|3 — trade Cursor agent spend vs gate strictness.
 *
 * 1 strict — Exec → batch Review → Verify → (Fix)*  (default, current behavior)
 * 2 lean   — Exec → Verify → (Fix only, no batch Reviewer)*
 * 3 defer  — Exec → skip batch Review/Verify → next; optional mid-verify every N;
 *            closing = Full Verify → Final Review → (Fix)*
 */

const { STATUSES } = require('./fsm');

const ECONOMY_LABELS = Object.freeze({
  1: 'strict',
  2: 'lean',
  3: 'defer',
});

/**
 * Normalize CLI / frontmatter / config values to 1 | 2 | 3.
 * Accepts numbers, "1"|"2"|"3", and legacy strict|lean|defer aliases.
 * @returns {1|2|3|null}
 */
function normalizeEconomy(raw) {
  if (raw === 1 || raw === 2 || raw === 3) {
    return raw;
  }
  if (typeof raw === 'string') {
    const t = raw.trim().toLowerCase();
    if (t === '1' || t === 'strict') return 1;
    if (t === '2' || t === 'lean') return 2;
    if (t === '3' || t === 'defer') return 3;
  }
  if (typeof raw === 'number' && Number.isInteger(raw) && raw >= 1 && raw <= 3) {
    return raw;
  }
  return null;
}

function economyLabel(economy) {
  return ECONOMY_LABELS[economy] || String(economy);
}

/**
 * After a completed batch number, should defer mode run VERIFY_BATCH once?
 * every<=0 means never mid-verify (pure blind sprint until closing).
 */
function shouldDeferMidVerify(currentBatch, deferVerifyEvery) {
  const every = Number(deferVerifyEvery);
  if (!Number.isInteger(every) || every <= 0) {
    return false;
  }
  const batch = Number(currentBatch);
  if (!Number.isInteger(batch) || batch <= 0) {
    return false;
  }
  return batch % every === 0;
}

/**
 * Decide the next FSM status right after a successful EXECUTE_BATCH agent turn.
 * @param {object} opts
 * @param {1|2|3} opts.economy
 * @param {boolean} opts.hasRemainingTodos — todos left AFTER executor marked this batch
 * @param {number} opts.currentBatch
 * @param {number} opts.deferVerifyEvery
 */
function nextAfterExecuteSuccess({
  economy,
  hasRemainingTodos,
  currentBatch,
  deferVerifyEvery,
}) {
  const mode = normalizeEconomy(economy) || 1;

  if (mode === 1) {
    return {
      status: STATUSES.BATCH_REVIEW,
      advanceBatch: false,
      deferClosingVerify: false,
      reason: 'economy=1 strict → BATCH_REVIEW',
    };
  }

  if (mode === 2) {
    return {
      status: STATUSES.VERIFY_BATCH,
      advanceBatch: false,
      deferClosingVerify: false,
      reason: 'economy=2 lean → VERIFY_BATCH (skip batch reviewer)',
    };
  }

  // mode === 3 defer
  if (!hasRemainingTodos) {
    return {
      status: STATUSES.FULL_VERIFY,
      advanceBatch: false,
      deferClosingVerify: true,
      reason: 'economy=3 defer → FULL_VERIFY (closing; no todos left)',
    };
  }

  if (shouldDeferMidVerify(currentBatch, deferVerifyEvery)) {
    return {
      status: STATUSES.VERIFY_BATCH,
      advanceBatch: false,
      deferClosingVerify: false,
      reason: `economy=3 defer mid-verify (batch ${currentBatch} % ${deferVerifyEvery} == 0)`,
    };
  }

  return {
    status: STATUSES.EXECUTE_BATCH,
    advanceBatch: true,
    deferClosingVerify: false,
    reason: 'economy=3 defer → next EXECUTE (skip batch review+verify)',
  };
}

/**
 * When batch VERIFY is green and no todos remain: strict/lean → FULL_REVIEW;
 * defer → FULL_VERIFY first (closing gate).
 */
function nextAfterBatchVerifyComplete({ economy, hasRemainingTodos }) {
  const mode = normalizeEconomy(economy) || 1;
  if (hasRemainingTodos) {
    return {
      status: STATUSES.EXECUTE_BATCH,
      deferClosingVerify: false,
      reason: 'batch verify pass; more todos',
    };
  }
  if (mode === 3) {
    return {
      status: STATUSES.FULL_VERIFY,
      deferClosingVerify: true,
      reason: 'economy=3 defer → FULL_VERIFY before FULL_REVIEW',
    };
  }
  return {
    status: STATUSES.FULL_REVIEW,
    deferClosingVerify: false,
    reason: 'batch verify pass; no todos left',
  };
}

module.exports = {
  ECONOMY_LABELS,
  normalizeEconomy,
  economyLabel,
  shouldDeferMidVerify,
  nextAfterExecuteSuccess,
  nextAfterBatchVerifyComplete,
};
