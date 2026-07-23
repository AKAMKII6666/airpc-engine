'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { runOrchestrator } = require('../lib/orchestrator');

const SKILL_ROOT = path.resolve(__dirname, '..');

function makeIndex(tmp, { economy, deferVerifyEvery, batchSize = 1, taskCount = 3 }) {
  fs.writeFileSync(path.join(tmp, 'README.md'), '# tmp\n');
  const deferLine =
    deferVerifyEvery != null ? `defer_verify_every: ${deferVerifyEvery}\n` : '';
  const rows = [];
  for (let i = 1; i <= taskCount; i += 1) {
    rows.push(`| ⬜ | T${i} | Task ${i} | node -e "process.exit(0)" |`);
  }
  const body = `---
batch_size: ${batchSize}
max_rounds: 40
max_fix_attempts: 2
economy: ${economy}
${deferLine}stop_on_fail: true
group: order
verify_default:
  - 'node -e "process.exit(0)"'
read_first:
  - README.md
hard_stop_patterns:
  - "GBX_FORCE_HARD_STOP_TOKEN"
workflow_dir: .ai-workflow-economy
adapter: table
---

# Economy mode mock index

| 状态 | ID | 任务 | verify |
|------|-----|------|--------|
${rows.join('\n')}
`;
  fs.writeFileSync(path.join(tmp, 'index.md'), body);
}

function readLog(tmp) {
  return fs.readFileSync(
    path.join(tmp, '.ai-workflow-economy', 'logs', 'loop.log'),
    'utf8',
  );
}

describe('orchestrator economy modes', () => {
  it('economy=2 lean skips batch-reviewer', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gbx-econ2-'));
    makeIndex(tmp, { economy: 2 });
    const code = runOrchestrator({
      exFile: path.join(tmp, 'index.md'),
      workdir: tmp,
      mockAgent: true,
      quiet: true,
    });
    assert.equal(code, 0);
    const log = readLog(tmp);
    assert.match(log, /economy=2/);
    assert.match(log, /lean → VERIFY_BATCH/);
    assert.doesNotMatch(log, /status=BATCH_REVIEW/);
    assert.match(log, /status=FULL_REVIEW/);
    const state = JSON.parse(
      fs.readFileSync(path.join(tmp, '.ai-workflow-economy', 'STATE.json'), 'utf8'),
    );
    assert.equal(state.status, 'READY_FOR_MANUAL_QA');
    assert.equal(state.economy, 2);
  });

  it('economy=3 defer every=0 skips mid verify then closes via FULL_VERIFY', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gbx-econ3-'));
    makeIndex(tmp, { economy: 3, deferVerifyEvery: 0 });
    const code = runOrchestrator({
      exFile: path.join(tmp, 'index.md'),
      workdir: tmp,
      mockAgent: true,
      quiet: true,
    });
    assert.equal(code, 0);
    const log = readLog(tmp);
    assert.match(log, /economy=3/);
    assert.match(log, /defer → next EXECUTE/);
    assert.match(log, /FULL_VERIFY \(closing/);
    assert.match(log, /full verify pass \(defer closing\) → FULL_REVIEW/);
    // No batch review in the middle
    assert.doesNotMatch(log, /status=BATCH_REVIEW/);
    // Mid-batch VERIFY_BATCH should not appear before closing (closing uses FULL_VERIFY)
    // After first execute we skip; only FULL_VERIFY at end — so no "iter=… status=VERIFY_BATCH"
    assert.doesNotMatch(log, /status=VERIFY_BATCH/);
    const state = JSON.parse(
      fs.readFileSync(path.join(tmp, '.ai-workflow-economy', 'STATE.json'), 'utf8'),
    );
    assert.equal(state.status, 'READY_FOR_MANUAL_QA');
  });

  it('economy=3 defer_verify_every=3 mid-verifies on batch 3', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gbx-econ3m-'));
    // 4 tasks so batch 3 still has remaining todos after execute (mid-verify fires).
    makeIndex(tmp, { economy: 3, deferVerifyEvery: 3, batchSize: 1, taskCount: 4 });
    const code = runOrchestrator({
      exFile: path.join(tmp, 'index.md'),
      workdir: tmp,
      mockAgent: true,
      quiet: true,
    });
    assert.equal(code, 0);
    const log = readLog(tmp);
    assert.match(log, /defer mid-verify \(batch 3 % 3 == 0\)/);
    assert.match(log, /status=VERIFY_BATCH/);
    assert.match(log, /FULL_VERIFY before FULL_REVIEW|full verify pass \(defer closing\)/);
  });

  it('CLI --economy 2 overrides index economy 1', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gbx-econ-cli-'));
    makeIndex(tmp, { economy: 1 });
    const code = runOrchestrator({
      exFile: path.join(tmp, 'index.md'),
      workdir: tmp,
      mockAgent: true,
      quiet: true,
      economy: 2,
    });
    assert.equal(code, 0);
    const log = readLog(tmp);
    assert.match(log, /economy=2/);
    assert.doesNotMatch(log, /status=BATCH_REVIEW/);
  });
});
