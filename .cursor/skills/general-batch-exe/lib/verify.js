'use strict';

/**
 * Module: verify
 * Purpose: Run verify shell commands in workdir; record reports.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function runOne(command, workdir, timeoutMs = 600_000) {
  const result = spawnSync(command, {
    cwd: workdir,
    shell: true,
    encoding: 'utf8',
    timeout: timeoutMs,
    env: process.env,
  });
  return {
    command,
    exitCode: result.status == null ? 1 : result.status,
    signal: result.signal || null,
    stdout: (result.stdout || '').slice(0, 8000),
    stderr: (result.stderr || '').slice(0, 8000),
    error: result.error ? String(result.error.message) : null,
  };
}

/**
 * @returns {{ ok: boolean, results: object[] }}
 */
function runVerifyCommands(commands, workdir, paths, label = 'verify') {
  const results = [];
  for (const cmd of commands) {
    const r = runOne(cmd, workdir);
    results.push(r);
    if (r.exitCode !== 0) {
      break;
    }
  }
  const ok = results.length > 0 && results.every((r) => r.exitCode === 0);
  if (commands.length === 0) {
    return { ok: false, results: [], reason: 'no verify commands configured' };
  }
  const report = {
    label,
    at: new Date().toISOString(),
    ok,
    results: results.map((r) => ({
      command: r.command,
      exitCode: r.exitCode,
      stderrTail: (r.stderr || '').slice(-500),
      stdoutTail: (r.stdout || '').slice(-500),
      error: r.error,
    })),
  };
  if (paths && paths.reports) {
    fs.mkdirSync(paths.reports, { recursive: true });
    const file = path.join(paths.reports, `${label}-${Date.now()}.json`);
    fs.writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }
  return { ok, results, reason: ok ? 'all commands passed' : 'command failed' };
}

module.exports = { runOne, runVerifyCommands };
