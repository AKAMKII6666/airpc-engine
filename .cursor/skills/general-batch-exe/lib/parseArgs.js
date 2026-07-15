'use strict';

/**
 * Module: parseArgs
 * Purpose: CLI argument parsing for gbx.
 */

function parseArgs(argv) {
  const out = {
    help: false,
    dryRun: false,
    mockAgent: false,
    checkpoint: false,
    noCheckpoint: false,
    resetState: false,
    continueOnExecutorFail: false,
    exFile: null,
    config: null,
    workdir: process.cwd(),
    agentCmd: null,
    maxIterations: null,
  };

  const valueOptions = new Map([
    ['--exFile', 'exFile'],
    ['--ex-file', 'exFile'],
    ['--config', 'config'],
    ['--workdir', 'workdir'],
    ['--agent-cmd', 'agentCmd'],
    ['--max-iterations', 'maxIterations'],
  ]);

  function fail(message) {
    const error = new Error(message);
    error.code = 'CLI_INVALID_ARGUMENT';
    throw error;
  }

  function readValue(option, index) {
    const value = argv[index + 1];
    if (value == null || value.startsWith('--')) {
      fail(`Option ${option} requires a value`);
    }
    return value;
  }

  function setValue(key, option, value) {
    if (key === 'maxIterations') {
      const parsed = Number(value);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        fail(`${option} must be a positive integer`);
      }
      out[key] = parsed;
      return;
    }
    if (!value) {
      fail(`Option ${option} requires a non-empty value`);
    }
    out[key] = value;
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      out.help = true;
      continue;
    }
    if (arg === '--dry-run') {
      out.dryRun = true;
      continue;
    }
    if (arg === '--mock-agent') {
      out.mockAgent = true;
      continue;
    }
    if (arg === '--checkpoint') {
      out.checkpoint = true;
      continue;
    }
    if (arg === '--no-checkpoint') {
      out.noCheckpoint = true;
      continue;
    }
    if (arg === '--reset-state') {
      out.resetState = true;
      continue;
    }
    if (arg === '--continue-on-executor-fail') {
      out.continueOnExecutorFail = true;
      continue;
    }
    if (valueOptions.has(arg)) {
      const value = readValue(arg, i);
      setValue(valueOptions.get(arg), arg, value);
      i += 1;
      continue;
    }

    const equalsIndex = arg.indexOf('=');
    if (equalsIndex > 0) {
      const option = arg.slice(0, equalsIndex);
      if (valueOptions.has(option)) {
        setValue(valueOptions.get(option), option, arg.slice(equalsIndex + 1));
        continue;
      }
    }

    if (arg.startsWith('-')) {
      fail(`Unknown option: ${arg}`);
    }
    fail(`Unexpected positional argument: ${arg}`);
  }

  if (out.checkpoint && out.noCheckpoint) {
    fail('--checkpoint and --no-checkpoint cannot be used together');
  }

  return out;
}

module.exports = { parseArgs };
