'use strict';

/**
 * Module: agent/runner
 * Purpose: Spawn cursor-agent with prompt written to a file (avoids ARG_MAX).
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
}) {
  const dir = promptDir || path.join(os.tmpdir(), 'gbx-prompts');
  fs.mkdirSync(dir, { recursive: true });
  const promptFile = path.join(dir, `prompt-${Date.now()}.md`);
  fs.writeFileSync(promptFile, prompt, 'utf8');

  const shortPrompt = [
    'Follow the instructions in the prompt file exactly. Do not skip sections.',
    `Prompt file (absolute path): ${promptFile}`,
    'Read that file now and execute it.',
  ].join('\n');

  const result = spawnSync(command, [printFlag, shortPrompt], {
    cwd: workdir,
    encoding: 'utf8',
    timeout: timeoutMs,
    env: {
      ...process.env,
      GBX_PROMPT_FILE: promptFile,
    },
    maxBuffer: 20 * 1024 * 1024,
  });

  return {
    ok: result.status === 0,
    exitCode: result.status == null ? 1 : result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    error: result.error ? String(result.error.message) : null,
    promptFile,
  };
}

module.exports = { runCursorAgent, commandExists };
