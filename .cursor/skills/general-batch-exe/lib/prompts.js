'use strict';

/**
 * Module: prompts
 * Purpose: Build role prompts for executor / reviewer / fixer / final-reviewer.
 *
 * Batch vs final Reviewer use separate JSON contracts so Agents do not copy
 * the batch-number placeholder into final reports (batchId must be "final").
 */

function listReadFirst(readFirstStatus) {
  return (readFirstStatus || [])
    .map((r) => `- ${r.path}${r.exists ? '' : ' (MISSING)'}`)
    .join('\n');
}

/** Shared fields for both review roles (batchId filled by caller). */
function reviewJsonShell({ role, batchIdLine }) {
  return `Write ONLY this file (overwrite): {workflowDir}/reviews/latest.json
Schema (minimal):
{
  "schemaVersion": 1,
  "reviewRunId": "<the exact review run ID from this prompt>",
  "role": "${role}",
  "batchId": ${batchIdLine},
  "result": "pass" | "fail" | "blocked",
  "blocker": 0,
  "critical": 0,
  "major": 0,
  "minor": 0,
  "recommendedNextState": "FIX_BATCH" | "VERIFY_BATCH" | "EXECUTE_BATCH" | "FULL_REVIEW" | "READY_FOR_MANUAL_QA" | "BLOCKED",
  "summary": "...",
  "issues": []
}
Do NOT write STATE.json. The orchestrator owns STATE.`;
}

/**
 * Batch Reviewer contract: batchId is the current batch number as a string.
 * Do not reuse this template for final-reviewer.
 */
function batchReviewJsonContract() {
  return reviewJsonShell({
    role: 'batch-reviewer',
    batchIdLine: '"<Current batch number as string, e.g. \\"3\\">"',
  });
}

/**
 * Final Reviewer contract: batchId is ONLY the literal string "final".
 * Orchestrator validates report.batchId === "final"; numeric batch ids fail.
 */
function finalReviewJsonContract() {
  return `${reviewJsonShell({
    role: 'final-reviewer',
    batchIdLine: '"final"',
  })}
CRITICAL batchId rule: batchId MUST be exactly the string "final". Never write a batch number (e.g. "8") into batchId.`;
}

/** @deprecated Prefer batchReviewJsonContract / finalReviewJsonContract. Kept for callers that expect a generic shell. */
function reviewJsonContract() {
  return batchReviewJsonContract();
}

function pathJoin(a, b) {
  return require('path').join(a, b);
}

function fixSourcesBlock(ctx) {
  const {
    workdir,
    workflowDir,
    fixTrigger,
    latestVerifyPath,
    verifyExcerpt,
  } = ctx;
  const reviewPath = pathJoin(workdir, workflowDir, 'reviews', 'latest.json');
  const verifyPath =
    latestVerifyPath || pathJoin(workdir, workflowDir, 'reports', 'latest-verify.json');
  const trigger = fixTrigger || '(unset)';

  return `
Fix trigger (orchestrator): ${trigger}

Mandatory reads:
1) Review report: ${reviewPath}
2) If fixTrigger contains "verify": ALSO read ${verifyPath}
   (machine gate — higher priority than a review result=pass)

Verify excerpt (may be truncated; full file on disk):
-----
${verifyExcerpt || '(none — if trigger is verify_*, treat missing verify report as blocker and stop)'}
-----

Priority (high → low):
1) latest-verify.json when ok=false: failedCommand + errorLocations + stdout/stderr / studioQualityTail
2) reviews/latest.json unresolved blocker/critical/major issues

Hard rules when fixTrigger contains "verify":
- ONLY fix items that are still red in latest-verify (errorLocations + studioQualityTail). Do not chase already-gone WARN/old diagnostics.
- If STUDIO-STRUCT-008 (or any STUDIO-STRUCT hard error) appears: fix directory clustering / structure FIRST. Splitting a large file into a flat com/ that mixes character+dock+panel is INVALID — put siblings under com/<duty>/ subdirs so STRUCT-008 passes.
- WARN-only STUDIO-STRUCT-002 (告警线) does not block; do not burn the round only on WARN while a hard STRUCT error remains.
- After edits, run the failed verify command when Shell is available. If Shell is denied/unavailable, your summary MUST include the exact phrase「未自验」and must NOT claim quality/verify passed.

FORBIDDEN: when verify is still red, do NOT exit with "nothing to fix" just because review.result=pass.
Your job is to make the failed verify command pass (or fix confirmed review issues when trigger is review_*).
Do not drive-by refactor. Do not write STATE.json.
`.trim();
}

function buildCommonHeader(ctx, { includeBatchNumber }) {
  const {
    exAbs,
    workdir,
    workflowDir,
    batchIds,
    batchNumber,
    readFirstStatus,
    reviewRunId,
  } = ctx;

  const batchLine = includeBatchNumber
    ? `Current batch number: ${batchNumber}`
    : `Milestone phase: FULL_REVIEW (no batch number — do not invent one for batchId)`;

  return `
Workdir: ${workdir}
Execution index (--exFile): ${exAbs}
Workflow dir: ${pathJoin(workdir, workflowDir)}
${batchLine}
Active task IDs: ${(batchIds || []).join(', ') || '(none)'}
Review run ID: ${reviewRunId || '(not a review role)'}

Must read first (relative to workdir):
${listReadFirst(readFirstStatus) || '(none)'}
`.trim();
}

function buildPrompt(role, ctx) {
  const { config, workflowDir } = ctx;

  const common = buildCommonHeader(ctx, { includeBatchNumber: true });

  if (role === 'executor') {
    return `
You are the EXECUTOR for general-batch-exe.

${common}

${config.executor_extra || ''}

Rules:
- Implement ONLY the active task IDs listed above.
- Do not implement later tasks.
- Before marking tasks done, run the batch verify command(s) from the execution index / verify_default when your environment allows shell.
- If verify fails, fix before ⬜→✅. If shell is denied/unavailable, your summary MUST say "verify NOT run" and leave tasks ⬜ (do not check them off).
- HARD: When every batch verify command exits 0 in this same turn, you MUST mark those active task IDs done in the execution index (⬜ → ✅ or [ ] → [x]) before ending. Leaving them ⬜ after a green verify is an incomplete round.
- HARD: Do not end with "code done / verify green / index still ⬜". That state is invalid unless the summary contains "verify NOT run".
- Do NOT rewrite page-top "工程 100% 已收口" / "全部 ✅" claims unless FSM is already past all todos AND you were asked to run E11-style docs closure after verify; prefer letting FULL_REVIEW/orchestrator own final slogans.
- Do not modify STATE.json.
- Do not change frontmatter semantics of the execution index.
`.trim();
  }

  if (role === 'batch-reviewer') {
    return `
You are the BATCH REVIEWER (read-only) for general-batch-exe.

${common}

${config.reviewer_extra || ''}

Rules:
- Review the current batch changes against the execution index and read_first docs.
- Do NOT modify application source code.
- If this batch touched TS/TSX, statically watch for traps like bare CSS units in JS objects (e.g. sx={{ width: 8rem }} must be "8rem") and flag them as issues (result=fail when found).
- If the executor summary contains "verify NOT run" / Shell denied AND the batch is implementation (not pure docs with verify=—), you MUST result=fail (major+) — do not pass.
- For engine batches: also report structureChecks / baselineDelta / qualityEngine in checks (or notes) — plain npm test alone is not enough when verify is quality:engine.
- ${batchReviewJsonContract().replace('{workflowDir}', workflowDir)}
- role must be "batch-reviewer".
- batchId must be the Current batch number as a string (see schema above).
`.trim();
  }

  if (role === 'fixer') {
    return `
You are the BATCH FIXER for general-batch-exe.

${common}

${config.fixer_extra || ''}

${fixSourcesBlock(ctx)}

Additional:
- If fixTrigger is checkbox_missing: ONLY mark the active task IDs ✅ in the execution index (verify already passed). Do not refactor. Do not chase WARN/告警线 STRUCT-002/003.
- WARN-only STUDIO-STRUCT-002 (告警线) does not block; never burn the round only on WARN while verify ok=true or a hard STRUCT error remains.
- You may update task checkmarks in the execution index if needed.
- Ending summary must state whether verify was re-run (exit code) or「未自验」when Shell was denied.
`.trim();
  }

  if (role === 'final-reviewer') {
    // Omit Current batch number — Agents otherwise copy it into batchId.
    const finalCommon = buildCommonHeader(ctx, { includeBatchNumber: false });
    return `
You are the FINAL REVIEWER (read-only) for general-batch-exe.

${finalCommon}

${config.final_reviewer_extra || config.reviewer_extra || ''}

Rules:
- Review the whole milestone for completeness, consistency, leftover TODOs/mocks, and test credibility.
- Do NOT modify application source code.
- ${finalReviewJsonContract().replace('{workflowDir}', workflowDir)}
- role must be "final-reviewer".
- batchId must be exactly "final" (never a numeric batch id).
- On pass with no blocker/critical, recommendedNextState should be READY_FOR_MANUAL_QA.
`.trim();
  }

  if (role === 'final-fixer') {
    return `
You are the FINAL FIXER for general-batch-exe.

${common}

${config.fixer_extra || ''}

${fixSourcesBlock(ctx)}
`.trim();
  }

  return `Unknown role: ${role}\n${common}`;
}

module.exports = {
  buildPrompt,
  reviewJsonContract,
  batchReviewJsonContract,
  finalReviewJsonContract,
  fixSourcesBlock,
};
