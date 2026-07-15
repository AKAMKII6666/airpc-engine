'use strict';

/**
 * Module: agent/mockRunner
 * Purpose: Drive FSM without cursor-agent — mutate exFile checkmarks + write reviews.
 */

const fs = require('fs');
const { writeLatestReview } = require('../reviewDecision');

function markTasksDoneInFile(exAbs, taskIds) {
  let raw = fs.readFileSync(exAbs, 'utf8');
  for (const id of taskIds) {
    const tableRe = new RegExp(
      `(\\|\\s*)⬜(\\s*\\|\\s*${escapeReg(id)}\\s*\\|)`,
      'g',
    );
    raw = raw.replace(tableRe, `$1✅$2`);
    const checkRe = new RegExp(
      `([-*]\\s+)\\[ \\](\\s+${escapeReg(id)}\\b)`,
      'g',
    );
    raw = raw.replace(checkRe, `$1[x]$2`);
  }
  fs.writeFileSync(exAbs, raw, 'utf8');
}

function escapeReg(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Mock controlled by GBX_MOCK_SCENARIO for deterministic FSM regression tests.
 */
function runMockAgent({ role, ctx, paths, state }) {
  const scenario = process.env.GBX_MOCK_SCENARIO || 'happy';

  if (role === 'executor' || role === 'fixer' || role === 'final-fixer') {
    if (ctx.batchIds && ctx.batchIds.length) {
      markTasksDoneInFile(ctx.exAbs, ctx.batchIds);
    }
    return {
      ok: true,
      exitCode: 0,
      stdout: `[mock] ${role} marked tasks done: ${(ctx.batchIds || []).join(',')}`,
      stderr: '',
      error: null,
    };
  }

  if (role === 'batch-reviewer') {
    if (scenario === 'reviewer-no-report') {
      return {
        ok: true,
        exitCode: 0,
        stdout: '[mock] reviewer intentionally wrote no report',
        stderr: '',
        error: null,
      };
    }
    if (scenario === 'reviewer-fail') {
      return {
        ok: false,
        exitCode: 9,
        stdout: '',
        stderr: '[mock] reviewer failed',
        error: null,
      };
    }
    const failOnce =
      scenario === 'fail-then-pass' &&
      state.currentBatch === 1 &&
      state.batchFixAttempts === 0 &&
      !state.mockReviewFailedOnce;

    if (failOnce) {
      writeLatestReview(paths.latestReview, {
        schemaVersion: 1,
        reviewRunId: ctx.reviewRunId,
        role: 'batch-reviewer',
        batchId: String(state.currentBatch),
        result: 'fail',
        blocker: 0,
        critical: 1,
        major: 0,
        minor: 0,
        recommendedNextState: 'FIX_BATCH',
        summary: 'mock critical issue',
        issues: [
          {
            id: 'M-1',
            severity: 'critical',
            file: 'mock',
            location: 'n/a',
            description: 'mock failure for FSM test',
            expectedBehavior: 'pass after fix',
            suggestedVerification: 're-run',
          },
        ],
      });
      return {
        ok: true,
        exitCode: 0,
        stdout: '[mock] review fail',
        stderr: '',
        error: null,
        persist: { mockReviewFailedOnce: true },
      };
    }

    writeLatestReview(paths.latestReview, {
      schemaVersion: 1,
      reviewRunId: ctx.reviewRunId,
      role: 'batch-reviewer',
      batchId: String(state.currentBatch),
      result: 'pass',
      blocker: 0,
      critical: 0,
      major: 0,
      minor: 0,
      recommendedNextState: 'VERIFY_BATCH',
      summary: 'mock batch review pass',
      issues: [],
    });
    return { ok: true, exitCode: 0, stdout: '[mock] review pass', stderr: '', error: null };
  }

  if (role === 'final-reviewer') {
    if (scenario === 'final-fail-then-verify' && state.fullFixAttempts === 0) {
      writeLatestReview(paths.latestReview, {
        schemaVersion: 1,
        reviewRunId: ctx.reviewRunId,
        role: 'final-reviewer',
        batchId: 'final',
        result: 'fail',
        blocker: 0,
        critical: 1,
        major: 0,
        minor: 0,
        recommendedNextState: 'FULL_FIX',
        summary: 'mock final issue',
        issues: [
          {
            id: 'FM-1',
            severity: 'critical',
            file: 'mock',
            location: 'n/a',
            description: 'exercise full verify after final fixer',
            expectedBehavior: 'all commands run',
            suggestedVerification: 'inspect full report',
          },
        ],
      });
      return { ok: true, exitCode: 0, stdout: '[mock] final review fail', stderr: '', error: null };
    }
    writeLatestReview(paths.latestReview, {
      schemaVersion: 1,
      reviewRunId: ctx.reviewRunId,
      role: 'final-reviewer',
      batchId: 'final',
      result: 'pass',
      blocker: 0,
      critical: 0,
      major: 0,
      minor: 0,
      recommendedNextState: 'READY_FOR_MANUAL_QA',
      summary: 'mock final review pass',
      issues: [],
    });
    return { ok: true, exitCode: 0, stdout: '[mock] final review pass', stderr: '', error: null };
  }

  return {
    ok: false,
    exitCode: 1,
    stdout: '',
    stderr: `[mock] unknown role ${role}`,
    error: null,
  };
}

module.exports = { runMockAgent, markTasksDoneInFile };
