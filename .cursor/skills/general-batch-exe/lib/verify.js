'use strict';

/**
 * Module: verify
 * Purpose: Run verify shell commands in workdir; record reports (incl. latest-verify.json).
 * Default: live stdout/stderr (+ optional heartbeat via teeChild).
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  buildVerifyReport,
  writeVerifyReports,
  verifyFingerprint,
} = require('./verifyReport');

function runOneQuiet(command, workdir, timeoutMs = 600_000, maxBytes = 65536) {
  const result = spawnSync(command, {
    cwd: workdir,
    shell: true,
    encoding: 'utf8',
    timeout: timeoutMs,
    env: process.env,
    maxBuffer: Math.max(maxBytes, 20 * 1024 * 1024),
  });
  return {
    command,
    exitCode: result.status == null ? 1 : result.status,
    signal: result.signal || null,
    stdout: (result.stdout || '').slice(0, maxBytes),
    stderr: (result.stderr || '').slice(0, maxBytes),
    error: result.error ? String(result.error.message) : null,
  };
}

function runOneLive(command, workdir, paths, timeoutMs = 600_000, maxBytes = 65536) {
  const teeChild = path.join(__dirname, 'agent', 'teeChild.js');
  const dir =
    paths && paths.logs
      ? paths.logs
      : path.join(os.tmpdir(), 'gbx-verify');
  fs.mkdirSync(dir, { recursive: true });
  const stamp = Date.now();
  const logFile = path.join(dir, `verify-${stamp}.log`);
  const payloadFile = path.join(dir, `verify-spawn-${stamp}.json`);

  const shell = process.platform === 'win32' ? process.env.ComSpec || 'cmd.exe' : '/bin/sh';
  const shellArgs =
    process.platform === 'win32' ? ['/d', '/s', '/c', command] : ['-c', command];

  fs.writeFileSync(
    payloadFile,
    `${JSON.stringify(
      {
        command: shell,
        args: shellArgs,
        workdir,
        logFile,
        heartbeatMs: 30_000,
        label: `verify:${command.slice(0, 60)}`,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  const result = spawnSync(process.execPath, [teeChild, payloadFile], {
    cwd: workdir,
    stdio: 'inherit',
    timeout: timeoutMs,
    env: process.env,
  });

  let captured = '';
  try {
    if (fs.existsSync(logFile)) captured = fs.readFileSync(logFile, 'utf8');
  } catch {
    /* ignore */
  }

  return {
    command,
    exitCode: result.status == null ? 1 : result.status,
    signal: result.signal || null,
    stdout: captured.slice(0, maxBytes),
    stderr: result.error ? String(result.error.message) : '',
    error: result.error ? String(result.error.message) : null,
  };
}

function runOne(
  command,
  workdir,
  timeoutMs = 600_000,
  { quiet = false, paths = null, maxBytes = 65536 } = {},
) {
  if (quiet) {
    return runOneQuiet(command, workdir, timeoutMs, maxBytes);
  }
  return runOneLive(command, workdir, paths, timeoutMs, maxBytes);
}

/**
 * @returns {{
 *   ok: boolean,
 *   results: object[],
 *   reason: string,
 *   report: object | null,
 *   fingerprint: string | null,
 *   latestFile: string | null,
 * }}
 */
function runVerifyCommands(commands, workdir, paths, label = 'verify', options = {}) {
  const quiet = Boolean(options.quiet);
  const maxBytes = options.maxBytes != null ? options.maxBytes : 65536;
  const phase = options.phase || 'batch';
  const activeTaskIds = options.activeTaskIds || [];
  const results = [];

  if (commands.length === 0) {
    const report = buildVerifyReport({
      label,
      ok: false,
      results: [],
      phase,
      activeTaskIds,
      reason: 'no verify commands configured',
      maxBytes,
    });
    const written = writeVerifyReports(paths, report);
    return {
      ok: false,
      results: [],
      reason: 'no verify commands configured',
      report,
      fingerprint: verifyFingerprint(report),
      latestFile: written.latestFile,
    };
  }

  for (const cmd of commands) {
    if (!quiet) {
      process.stderr.write(`[gbx] verify → ${cmd}\n`);
    }
    const r = runOne(cmd, workdir, 600_000, { quiet, paths, maxBytes });
    results.push(r);
    if (r.exitCode !== 0) {
      if (!quiet) {
        process.stderr.write(`[gbx] verify FAILED exit=${r.exitCode} cmd=${cmd}\n`);
      }
      break;
    }
    if (!quiet) {
      process.stderr.write(`[gbx] verify OK cmd=${cmd}\n`);
    }
  }

  const ok = results.length > 0 && results.every((r) => r.exitCode === 0);
  const report = buildVerifyReport({
    label,
    ok,
    results,
    phase,
    activeTaskIds,
    reason: ok ? 'all commands passed' : 'command failed',
    maxBytes,
  });
  const written = writeVerifyReports(paths, report);

  return {
    ok,
    results,
    reason: report.reason,
    report,
    fingerprint: verifyFingerprint(report),
    latestFile: written.latestFile,
  };
}

module.exports = { runOne, runVerifyCommands };
