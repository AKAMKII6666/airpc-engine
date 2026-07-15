'use strict';

/**
 * Module: validation/config
 * Purpose: Reject unsafe or nonsensical merged workflow configuration before any writes.
 */

const path = require('path');

const ADAPTERS = new Set([null, 'table', 'checkbox', 'batch-block', 'batchBlock']);
const GROUPS = new Set(['order', 'milestone']);

function fail(message) {
  const error = new Error(`invalid workflow config: ${message}`);
  error.code = 'CONFIG_INVALID';
  throw error;
}

function assertInteger(config, key, { min }) {
  const value = config[key];
  if (!Number.isInteger(value) || value < min) {
    fail(`${key} must be an integer >= ${min}`);
  }
}

function assertBoolean(config, key) {
  if (typeof config[key] !== 'boolean') {
    fail(`${key} must be a boolean`);
  }
}

function assertStringArray(config, key, { allowEmpty = true } = {}) {
  const value = config[key];
  if (!Array.isArray(value)) {
    fail(`${key} must be an array of strings`);
  }
  if (!allowEmpty && value.length === 0) {
    fail(`${key} must not be empty`);
  }
  if (value.some((item) => typeof item !== 'string' || item.trim() === '')) {
    fail(`${key} must contain only non-empty strings`);
  }
}

function assertString(config, key) {
  if (typeof config[key] !== 'string') {
    fail(`${key} must be a string`);
  }
}

function assertInsideWorkdir(workdir, configuredPath, key, { allowRoot = false } = {}) {
  const absolute = path.resolve(workdir, configuredPath);
  const relative = path.relative(workdir, absolute);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    fail(`${key} must resolve inside --workdir`);
  }
  if (!allowRoot && relative === '') {
    fail(`${key} must resolve to a child path of --workdir`);
  }
}

function validateConfig(config, workdir) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    fail('root value must be a mapping');
  }

  assertInteger(config, 'batch_size', { min: 1 });
  assertInteger(config, 'max_rounds', { min: 1 });
  assertInteger(config, 'max_fix_attempts', { min: 0 });
  assertInteger(config, 'max_full_fix_attempts', { min: 0 });
  assertBoolean(config, 'stop_on_fail');
  assertBoolean(config, 'enable_checkpoint');
  assertBoolean(config, 'checkpoint_require_clean');
  assertBoolean(config, 'continue_on_executor_fail');
  assertStringArray(config, 'verify_default');
  assertStringArray(config, 'read_first');
  assertStringArray(config, 'hard_stop_patterns');
  for (const key of [
    'executor_extra',
    'reviewer_extra',
    'fixer_extra',
    'final_reviewer_extra',
  ]) {
    assertString(config, key);
  }
  if (config.mock_agent != null && typeof config.mock_agent !== 'boolean') {
    fail('mock_agent must be a boolean when configured');
  }
  if (config.enable_checkpoint && config.checkpoint_require_clean === false) {
    fail('checkpoint_require_clean=false is unsafe and unsupported when checkpoints are enabled');
  }

  if (!GROUPS.has(config.group)) {
    fail('group must be order or milestone');
  }
  if (!ADAPTERS.has(config.adapter)) {
    fail('adapter must be table, checkbox, or batch-block');
  }
  if (typeof config.workflow_dir !== 'string' || config.workflow_dir.trim() === '') {
    fail('workflow_dir must be a non-empty string');
  }
  assertInsideWorkdir(workdir, config.workflow_dir, 'workflow_dir');

  for (const readPath of config.read_first) {
    assertInsideWorkdir(workdir, readPath, 'read_first entry', { allowRoot: true });
  }
  for (const pattern of config.hard_stop_patterns) {
    try {
      new RegExp(pattern, 'i');
    } catch (error) {
      fail(`hard_stop_patterns contains invalid regex ${JSON.stringify(pattern)}: ${error.message}`);
    }
  }

  if (!config.agent || typeof config.agent !== 'object' || Array.isArray(config.agent)) {
    fail('agent must be a mapping');
  }
  if (typeof config.agent.command !== 'string' || config.agent.command.trim() === '') {
    fail('agent.command must be a non-empty string');
  }
  if (typeof config.agent.print_flag !== 'string' || config.agent.print_flag.trim() === '') {
    fail('agent.print_flag must be a non-empty string');
  }
}

function validateExecutionIndex(tasks) {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    fail('execution index must contain at least one parseable task');
  }
  const ids = new Set();
  for (const task of tasks) {
    if (!task || typeof task.id !== 'string' || task.id.trim() === '') {
      fail('every task must have a non-empty ID');
    }
    if (ids.has(task.id)) {
      fail(`task ID must be unique: ${task.id}`);
    }
    ids.add(task.id);
    if (task.status !== 'todo' && task.status !== 'done') {
      fail(`task ${task.id} has unsupported status: ${task.status}`);
    }
    if (task.verify != null && (typeof task.verify !== 'string' || task.verify.trim() === '')) {
      fail(`task ${task.id} verify must be a non-empty string when present`);
    }
  }
}

module.exports = { validateConfig, validateExecutionIndex };
