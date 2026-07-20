'use strict';

/**
 * Module: mergeConfig
 * Purpose: Merge defaults < project config < exFile frontmatter < CLI overrides.
 */

const DEFAULTS = {
  batch_size: 3,
  max_rounds: 40,
  max_fix_attempts: 5,
  max_full_fix_attempts: 5,
  /** Scripts green but tasks still ⬜ — separate from hard verify fix budget. */
  max_checkbox_fix_attempts: 2,
  stop_on_fail: true,
  group: 'order',
  verify_default: [],
  read_first: [],
  hard_stop_patterns: [],
  executor_extra: '',
  reviewer_extra: '',
  fixer_extra: '',
  final_reviewer_extra: '',
  workflow_dir: '.ai-workflow',
  adapter: null,
  /** Default OFF: must pass --checkpoint to enable. */
  enable_checkpoint: false,
  /** If checkpoint enabled, refuse dirty worktrees (recommended). */
  checkpoint_require_clean: true,
  /** Executor non-zero exit → BLOCKED unless true. */
  continue_on_executor_fail: false,
  agent: {
    command: process.env.GBX_AGENT_CMD || 'cursor-agent',
    print_flag: '-p',
  },
  /** false = live tee + heartbeats (default). true = capture-only. */
  quiet: false,
  heartbeat_ms: 15_000,
  /** Same verify fingerprint failures before BLOCKED (even if fix budget remains). */
  max_ineffective_fixes: 2,
  verify_capture_max_bytes: 65536,
};

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function deepMerge(base, over) {
  if (!isPlainObject(over)) {
    return base;
  }
  const out = { ...base };
  for (const [k, v] of Object.entries(over)) {
    if (v === undefined || v === null) {
      continue;
    }
    if (isPlainObject(v) && isPlainObject(out[k])) {
      out[k] = deepMerge(out[k], v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

/**
 * @param {object} options
 * @param {object} [options.projectConfig] from --config yaml
 * @param {object} [options.frontmatter] from exFile
 * @param {object} [options.cli] selected CLI overrides
 */
function mergeConfig({ projectConfig = {}, frontmatter = {}, cli = {} } = {}) {
  let cfg = deepMerge(DEFAULTS, projectConfig);
  cfg = deepMerge(cfg, frontmatter);

  if (cli.agentCmd) {
    cfg.agent = { ...cfg.agent, command: cli.agentCmd };
  }
  if (cli.maxIterations != null && !Number.isNaN(cli.maxIterations)) {
    cfg.max_rounds = cli.maxIterations;
  }
  // Checkpoint: default off. --checkpoint enables; --no-checkpoint forces off.
  if (cli.checkpoint === true) {
    cfg.enable_checkpoint = true;
  }
  if (cli.noCheckpoint === true) {
    cfg.enable_checkpoint = false;
  }
  if (cli.mockAgent) {
    cfg.mock_agent = true;
  }
  if (cli.continueOnExecutorFail === true) {
    cfg.continue_on_executor_fail = true;
  }
  if (cli.quiet === true) {
    cfg.quiet = true;
  }
  if (cli.quiet === false) {
    cfg.quiet = false;
  }
  if (cli.noHeartbeat === true) {
    cfg.heartbeat_ms = 0;
  }

  return cfg;
}

module.exports = { DEFAULTS, mergeConfig, deepMerge };
