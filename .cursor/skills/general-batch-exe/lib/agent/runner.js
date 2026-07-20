'use strict';

/**
 * Module: agent/runner
 * Purpose: Spawn cursor-agent / agent with prompt on disk (avoids ARG_MAX).
 * Default: live tee to console + log file + heartbeats (not silent).
 * --quiet / GBX_QUIET=1: capture-only (old behavior).
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

function commandExists(command) {
  const whichCmd = process.platform === 'win32' ? 'where' : 'which';
  const r = spawnSync(whichCmd, [command], { encoding: 'utf8' });
  return r.status === 0;
}

function readLog(logFile) {
  try {
    if (fs.existsSync(logFile)) {
      return fs.readFileSync(logFile, 'utf8');
    }
  } catch {
    /* ignore */
  }
  return '';
}

/**
 * Write full prompt to disk; argv only carries a short pointer (ARG_MAX safe).
 */
function runCursorAgent({
  command = 'cursor-agent',
  printFlag = '-p',
  prompt,
  workdir,
  promptDir = null,
  timeoutMs = 1_800_000,
  quiet = false,
  heartbeatMs = 15_000,
  label = 'agent',
}) {
  const dir = promptDir || path.join(os.tmpdir(), 'gbx-prompts');
  fs.mkdirSync(dir, { recursive: true });
  const stamp = Date.now();
  const promptFile = path.join(dir, `prompt-${stamp}.md`);
  const logFile = path.join(dir, `agent-${stamp}.log`);
  fs.writeFileSync(promptFile, prompt, 'utf8');

  const shortPrompt = [
    'Follow the instructions in the prompt file exactly. Do not skip sections.',
    `Prompt file (absolute path): ${promptFile}`,
    'Read that file now and execute it.',
  ].join('\n');

  const args = [printFlag, shortPrompt];
  const env = {
    ...process.env,
    GBX_PROMPT_FILE: promptFile,
  };

  if (quiet) {
    const result = spawnSync(command, args, {
      cwd: workdir,
      encoding: 'utf8',
      timeout: timeoutMs,
      env,
      maxBuffer: 20 * 1024 * 1024,
    });
    const stdout = result.stdout || '';
    const stderr = result.stderr || '';
    try {
      fs.writeFileSync(logFile, `${stdout}${stderr ? `\n--- stderr ---\n${stderr}` : ''}`, 'utf8');
    } catch {
      /* ignore */
    }
    return {
      ok: result.status === 0,
      exitCode: result.status == null ? 1 : result.status,
      stdout,
      stderr,
      error: result.error ? String(result.error.message) : null,
      promptFile,
      logFile,
    };
  }

  const teeChild = path.join(__dirname, 'teeChild.js');
  const payloadFile = path.join(dir, `spawn-${stamp}.json`);
  fs.writeFileSync(
    payloadFile,
    `${JSON.stringify(
      {
        command,
        args,
        workdir,
        logFile,
        heartbeatMs,
        label,
        env: { GBX_PROMPT_FILE: promptFile },
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  process.stderr.write(
    `[gbx] launching ${label} (${command}); live output below; log=${logFile}\n`,
  );

  const result = spawnSync(process.execPath, [teeChild, payloadFile], {
    cwd: workdir,
    stdio: 'inherit',
    timeout: timeoutMs,
    env,
  });

  const captured = readLog(logFile);
  return {
    ok: result.status === 0,
    exitCode: result.status == null ? 1 : result.status,
    stdout: captured,
    stderr: result.error ? String(result.error.message) : '',
    error: result.error ? String(result.error.message) : null,
    promptFile,
    logFile,
  };
}

module.exports = { runCursorAgent, commandExists };
