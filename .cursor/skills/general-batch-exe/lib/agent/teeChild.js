#!/usr/bin/env node
'use strict';

/**
 * Module: agent/teeChild
 * Purpose: Child helper — spawn a command, tee stdout/stderr to console + log file,
 *          and emit heartbeats only when the child has been silent (so live agent
 *          text is not drowned out by "still running … log=…" spam).
 *
 * Invoked as: node teeChild.js <payload.json>
 * Parent should use stdio: 'inherit' so tee/heartbeats appear live.
 */

const { spawn } = require('child_process');
const fs = require('fs');

function main() {
  const payloadPath = process.argv[2];
  if (!payloadPath) {
    process.stderr.write('[gbx-tee] missing payload path\n');
    process.exit(2);
  }

  let payload;
  try {
    payload = JSON.parse(fs.readFileSync(payloadPath, 'utf8'));
  } catch (error) {
    process.stderr.write(`[gbx-tee] bad payload: ${error.message}\n`);
    process.exit(2);
  }

  const {
    command,
    args = [],
    workdir,
    logFile,
    heartbeatMs = 15_000,
    label = 'agent',
    env: extraEnv = {},
  } = payload;

  if (!command || !logFile) {
    process.stderr.write('[gbx-tee] payload requires command + logFile\n');
    process.exit(2);
  }

  fs.mkdirSync(require('path').dirname(logFile), { recursive: true });
  const log = fs.createWriteStream(logFile, { flags: 'a' });

  const started = Date.now();
  let lastOutputAt = started;
  const beatEvery = Number(heartbeatMs);
  const heartbeatsEnabled = Number.isFinite(beatEvery) && beatEvery > 0;

  const header = `[gbx] ▶ ${label} start cmd=${command} cwd=${workdir || process.cwd()}\n`;
  process.stderr.write(header);
  log.write(header);

  const child = spawn(command, args, {
    cwd: workdir || process.cwd(),
    env: { ...process.env, ...extraEnv },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  function attach(stream, out) {
    stream.on('data', (buf) => {
      lastOutputAt = Date.now();
      out.write(buf);
      log.write(buf);
    });
  }

  attach(child.stdout, process.stdout);
  attach(child.stderr, process.stderr);

  let hb = null;
  if (heartbeatsEnabled) {
    const interval = Math.max(5_000, beatEvery);
    hb = setInterval(() => {
      const silentMs = Date.now() - lastOutputAt;
      // Only heartbeat when the child has been quiet for a full beat window.
      if (silentMs < interval) {
        return;
      }
      const elapsed = Math.round((Date.now() - started) / 1000);
      const silentSec = Math.round(silentMs / 1000);
      const line = `[gbx] … ${label} still running (${elapsed}s elapsed, no output for ${silentSec}s)\n`;
      process.stderr.write(line);
      log.write(line);
    }, interval);
  }

  child.on('error', (error) => {
    if (hb) clearInterval(hb);
    const line = `[gbx] ✖ ${label} spawn error: ${error.message}\n`;
    process.stderr.write(line);
    log.write(line);
    log.end(() => process.exit(1));
  });

  child.on('close', (code, signal) => {
    if (hb) clearInterval(hb);
    const elapsed = Math.round((Date.now() - started) / 1000);
    const exit = code == null ? 1 : code;
    const line = `[gbx] ■ ${label} done exit=${exit}${signal ? ` signal=${signal}` : ''} elapsed=${elapsed}s\n`;
    process.stderr.write(line);
    // 同步落盘 footer：避免 WriteStream 未刷盘就 exit，导致 verify 日志缺 done、被误判为中断失败
    try {
      fs.appendFileSync(logFile, line);
    } catch {
      /* ignore */
    }
    log.end(() => process.exit(exit));
  });
}

main();
