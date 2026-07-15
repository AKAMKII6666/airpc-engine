'use strict';

/**
 * Module: prompts
 * Purpose: Build role prompts for executor / reviewer / fixer / final-reviewer.
 */

function listReadFirst(readFirstStatus) {
  return (readFirstStatus || [])
    .map((r) => `- ${r.path}${r.exists ? '' : ' (MISSING)'}`)
    .join('\n');
}

function reviewJsonContract() {
  return `Write ONLY this file (overwrite): {workflowDir}/reviews/latest.json
Schema (minimal):
{
  "schemaVersion": 1,
  "reviewRunId": "<the exact review run ID from this prompt>",
  "role": "<your-role>",
  "batchId": "<n>",
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

function buildPrompt(role, ctx) {
  const {
    exAbs,
    workdir,
    workflowDir,
    batchIds,
    batchNumber,
    config,
    readFirstStatus,
    reviewRunId,
  } = ctx;

  const common = `
Workdir: ${workdir}
Execution index (--exFile): ${exAbs}
Workflow dir: ${pathJoin(workdir, workflowDir)}
Current batch number: ${batchNumber}
Active task IDs: ${(batchIds || []).join(', ') || '(none)'}
Review run ID: ${reviewRunId || '(not a review role)'}

Must read first (relative to workdir):
${listReadFirst(readFirstStatus) || '(none)'}
`.trim();

  if (role === 'executor') {
    return `
You are the EXECUTOR for general-batch-exe.

${common}

${config.executor_extra || ''}

Rules:
- Implement ONLY the active task IDs listed above.
- Do not implement later tasks.
- When done, mark those tasks done in the execution index (⬜ → ✅ or [ ] → [x]).
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
- ${reviewJsonContract().replace('{workflowDir}', workflowDir)}
- role must be "batch-reviewer".
`.trim();
  }

  if (role === 'fixer') {
    return `
You are the BATCH FIXER for general-batch-exe.

${common}

${config.fixer_extra || ''}

Rules:
- Read ${pathJoin(workdir, workflowDir)}/reviews/latest.json.
- Verify each issue still applies; fix only confirmed problems.
- Do not drive-by refactor.
- Do not write STATE.json.
- You may update task checkmarks in the execution index if needed.
`.trim();
  }

  if (role === 'final-reviewer') {
    return `
You are the FINAL REVIEWER (read-only) for general-batch-exe.

${common}

${config.final_reviewer_extra || config.reviewer_extra || ''}

Rules:
- Review the whole milestone for completeness, consistency, leftover TODOs/mocks, and test credibility.
- Do NOT modify application source code.
- ${reviewJsonContract().replace('{workflowDir}', workflowDir)}
- role must be "final-reviewer".
- On pass with no blocker/critical, recommendedNextState should be READY_FOR_MANUAL_QA.
`.trim();
  }

  if (role === 'final-fixer') {
    return `
You are the FINAL FIXER for general-batch-exe.

${common}

${config.fixer_extra || ''}

Rules:
- Read latest.json from the final review.
- Fix only confirmed issues from that report.
- Do not write STATE.json.
`.trim();
  }

  return `Unknown role: ${role}\n${common}`;
}

function pathJoin(a, b) {
  return require('path').join(a, b);
}

module.exports = { buildPrompt, reviewJsonContract };
