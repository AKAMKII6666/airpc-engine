'use strict';

/**
 * Module: orchestrator
 * Purpose: Main FSM loop for general-batch-exe (Scheme B).
 */

const path = require('path');
const fs = require('fs');
const { loadExFile } = require('./loadExFile');
const {
  selectBatch,
  collectVerifyCommands,
  collectFullVerifyCommands,
  assertBatchChecked,
  todoTasks,
} = require('./tasks');
const {
  workflowPaths,
  loadOrInitState,
  patchState,
  appendLog,
  ensureWorkflowDirs,
  readState,
} = require('./stateStore');
const { STATUSES, isTerminal, exitCodeForStatus } = require('./fsm');
const {
  readLatestReview,
  decideAfterReview,
  decideAfterVerify,
} = require('./reviewDecision');
const { runVerifyCommands } = require('./verify');
const { checkHardStop } = require('./hardStop');
const { checkCheckpointPreflight, createCheckpoint } = require('./gitCheckpoint');
const { buildPrompt } = require('./prompts');
const { runCursorAgent, commandExists } = require('./agent/runner');
const { runMockAgent } = require('./agent/mockRunner');
const { truncate } = require('./util/truncate');
const {
  createReviewRunId,
  clearLatestReview,
  validateReviewReport,
} = require('./validation/reviewReport');

/** Cross-platform no-op success command for mock verify. */
const MOCK_OK_CMD = 'node -e "process.exit(0)"';

function assertReadFirst(loaded) {
  const missing = loaded.readFirstStatus.filter((r) => !r.exists);
  if (missing.length) {
    const list = missing.map((r) => r.path).join(', ');
    const err = new Error(`read_first missing under --workdir: ${list}`);
    err.code = 'READ_FIRST_MISSING';
    throw err;
  }
}

function assertHasVerify(loaded) {
  if (!loaded.config.verify_default.length && !loaded.tasks.some((t) => t.verify)) {
    const err = new Error('no verify_default and no task-level verify');
    err.code = 'VERIFY_MISSING';
    throw err;
  }
}

function printDryRun(loaded, workdir) {
  const batch = selectBatch(loaded.tasks, {
    batchSize: loaded.config.batch_size,
    group: loaded.config.group,
  });
  const verify = collectVerifyCommands(batch, loaded.config.verify_default);
  console.log('[gbx] dry-run parse OK');
  console.log(`  exFile: ${loaded.exAbs}`);
  console.log(`  workdir: ${workdir}`);
  console.log(`  adapter: ${loaded.adapter}`);
  console.log(`  tasks: ${loaded.tasks.length} (todo=${todoTasks(loaded.tasks).length})`);
  console.log(`  batch_size: ${loaded.config.batch_size}`);
  console.log(`  next batch IDs: ${batch.map((t) => t.id).join(', ') || '(none)'}`);
  console.log(`  verify: ${verify.join(' | ') || '(none)'}`);
  console.log(`  workflow_dir: ${loaded.config.workflow_dir}`);
  console.log(`  enable_checkpoint: ${Boolean(loaded.config.enable_checkpoint)}`);
  console.log('  read_first:');
  for (const r of loaded.readFirstStatus) {
    console.log(`    ${r.exists ? 'OK' : 'MISSING'}  ${r.path}`);
  }
  try {
    assertReadFirst(loaded);
    assertHasVerify(loaded);
  } catch (e) {
    console.error(`[gbx] dry-run error: ${e.message}`);
    return 1;
  }
  if (todoTasks(loaded.tasks).length === 0) {
    console.log('[gbx] dry-run note: no todo tasks (would go to FULL_REVIEW if run)');
  }
  return 0;
}

function runAgent(role, { mock, config, promptCtx, paths, state, workdir }) {
  if (mock || config.mock_agent) {
    return runMockAgent({ role, ctx: promptCtx, paths, state });
  }
  const prompt = buildPrompt(role, promptCtx);
  const promptDir = path.join(paths.root, 'prompts');
  return runCursorAgent({
    command: config.agent.command,
    printFlag: config.agent.print_flag || '-p',
    prompt,
    workdir,
    promptDir,
  });
}

function applyAgentPersist(paths, agentResult) {
  if (agentResult && agentResult.persist) {
    return patchState(paths, agentResult.persist);
  }
  return null;
}

function reload(exRel, workdir, configPath, cli) {
  return loadExFile({ exFile: exRel, workdir, configPath, cli });
}

function resetWorkflowState(paths) {
  if (fs.existsSync(paths.state)) {
    fs.unlinkSync(paths.state);
  }
}

function workflowExcludePaths(workdir, paths) {
  return [path.relative(workdir, paths.root)];
}

function blockForAgentFailure(paths, state, role, result) {
  appendLog(paths, `${role} failed exit=${result.exitCode}`);
  return patchState(paths, {
    lastAgentStdout: truncate(result.stdout),
    lastAgentStderr: truncate(result.stderr),
    status: STATUSES.BLOCKED,
    blockedReason: `${role} failed (exit ${result.exitCode}${result.error ? `: ${result.error}` : ''})`,
  });
}

function mockVerifyCmds(cmds, cli) {
  if (cli.mockAgent && process.env.GBX_MOCK_REAL_VERIFY !== '1') {
    return cmds.length ? [MOCK_OK_CMD] : [];
  }
  return cmds;
}

function runOrchestrator(cli) {
  const workdir = path.resolve(cli.workdir || process.cwd());
  if (!cli.exFile) {
    console.error('error: --exFile is required');
    return 1;
  }

  let loaded;
  try {
    loaded = loadExFile({
      exFile: cli.exFile,
      workdir,
      configPath: cli.config,
      cli,
    });
  } catch (e) {
    console.error(`error: ${e.message}`);
    return 1;
  }

  if (cli.dryRun) {
    return printDryRun(loaded, workdir);
  }

  try {
    assertReadFirst(loaded);
    assertHasVerify(loaded);
  } catch (e) {
    console.error(`error: ${e.message}`);
    return 1;
  }

  if (!cli.mockAgent && !loaded.config.mock_agent) {
    const cmd = loaded.config.agent.command;
    if (!commandExists(cmd)) {
      console.error(
        `error: agent command not found: ${cmd}. Install Cursor CLI, set GBX_AGENT_CMD, or use --mock-agent.`,
      );
      return 1;
    }
  }

  const paths = workflowPaths(workdir, loaded.config.workflow_dir);
  ensureWorkflowDirs(paths);

  if (cli.resetState) {
    resetWorkflowState(paths);
    appendLog(paths, 'reset-state: removed STATE.json');
    console.log('[gbx] --reset-state: cleared STATE.json');
  }

  let state;
  try {
    state = loadOrInitState(paths, { exFile: loaded.exAbs });
  } catch (error) {
    console.error(`error: ${error.message}`);
    return 1;
  }

  const checkpointOptions = {
    enabled: Boolean(loaded.config.enable_checkpoint),
    requireClean: loaded.config.checkpoint_require_clean !== false,
    excludePaths: workflowExcludePaths(workdir, paths),
  };
  const checkpointPreflight = checkCheckpointPreflight(workdir, checkpointOptions);
  appendLog(
    paths,
    `checkpoint preflight skipped=${checkpointPreflight.skipped} ${checkpointPreflight.reason || ''}`,
  );
  if (checkpointPreflight.error) {
    state = patchState(paths, {
      status: STATUSES.BLOCKED,
      blockedReason: checkpointPreflight.reason,
    });
  }
  appendLog(paths, `start status=${state.status} mock=${Boolean(cli.mockAgent)}`);

  const maxIterations = loaded.config.max_rounds || 40;

  for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
    state = patchState(paths, { iteration });
    appendLog(paths, `iter=${iteration} status=${state.status}`);
    console.log(`[gbx] Iteration=${iteration} Status=${state.status}`);

    if (isTerminal(state.status)) {
      console.log(`[gbx] terminal: ${state.status}`);
      if (state.status === STATUSES.READY_FOR_MANUAL_QA) {
        console.log(`[gbx] Manual QA required. workflow: ${paths.root}`);
      }
      if (state.blockedReason) {
        console.log(`[gbx] blockedReason: ${state.blockedReason}`);
      }
      return exitCodeForStatus(state.status);
    }

    loaded = reload(cli.exFile, workdir, cli.config, cli);
    const cfg = loaded.config;

    const review = readLatestReview(paths.latestReview);
    const hs = checkHardStop(
      [state.lastAgentStdout, state.lastAgentStderr, review ? JSON.stringify(review) : ''],
      cfg.hard_stop_patterns,
    );
    if (hs.hit) {
      state = patchState(paths, {
        status: STATUSES.BLOCKED,
        blockedReason: `hard_stop matched ${hs.pattern}: ${hs.snippet}`,
      });
      continue;
    }

    const batch = selectBatch(loaded.tasks, {
      batchSize: cfg.batch_size,
      group: cfg.group,
    });
    const batchIds =
      state.activeTaskIds && state.activeTaskIds.length
        ? state.activeTaskIds
        : batch.map((t) => t.id);

    const promptCtx = {
      exAbs: loaded.exAbs,
      workdir,
      workflowDir: cfg.workflow_dir,
      batchIds,
      batchNumber: state.currentBatch,
      config: cfg,
      readFirstStatus: loaded.readFirstStatus,
    };

    switch (state.status) {
      case STATUSES.EXECUTE_BATCH: {
        if (todoTasks(loaded.tasks).length === 0) {
          state = patchState(paths, {
            status: STATUSES.FULL_REVIEW,
            activeTaskIds: [],
          });
          break;
        }
        const selected = selectBatch(loaded.tasks, {
          batchSize: cfg.batch_size,
          group: cfg.group,
        });
        const ids = selected.map((t) => t.id);

        state = patchState(paths, { activeTaskIds: ids });
        promptCtx.batchIds = ids;
        const execResult = runAgent('executor', {
          mock: cli.mockAgent,
          config: cfg,
          promptCtx,
          paths,
          state,
          workdir,
        });
        applyAgentPersist(paths, execResult);

        if (!execResult.ok && !cfg.continue_on_executor_fail) {
          appendLog(paths, `executor failed exit=${execResult.exitCode}`);
          state = patchState(paths, {
            lastAgentStdout: truncate(execResult.stdout),
            lastAgentStderr: truncate(execResult.stderr),
            status: STATUSES.BLOCKED,
            blockedReason: `executor failed (exit ${execResult.exitCode}${execResult.error ? `: ${execResult.error}` : ''})`,
          });
          break;
        }

        state = patchState(paths, {
          lastAgentStdout: truncate(execResult.stdout),
          lastAgentStderr: truncate(execResult.stderr),
          status: STATUSES.BATCH_REVIEW,
        });
        if (!execResult.ok) {
          appendLog(paths, `executor exit ${execResult.exitCode} — continue_on_executor_fail`);
        }
        break;
      }

      case STATUSES.BATCH_REVIEW: {
        const reviewRunId = createReviewRunId('batch-reviewer', state.currentBatch);
        clearLatestReview(paths.latestReview);
        promptCtx.reviewRunId = reviewRunId;
        const revResult = runAgent('batch-reviewer', {
          mock: cli.mockAgent,
          config: cfg,
          promptCtx,
          paths,
          state,
          workdir,
        });
        applyAgentPersist(paths, revResult);
        if (!revResult.ok) {
          state = blockForAgentFailure(paths, state, 'batch-reviewer', revResult);
          break;
        }
        state = patchState(paths, {
          lastAgentStdout: truncate(revResult.stdout),
          lastAgentStderr: truncate(revResult.stderr),
        });
        state = readState(paths) || state;
        const report = readLatestReview(paths.latestReview);
        const validation = validateReviewReport(report, {
          role: 'batch-reviewer',
          batchId: state.currentBatch,
          reviewRunId,
        });
        if (!validation.ok) {
          state = patchState(paths, {
            status: STATUSES.BLOCKED,
            blockedReason: validation.reason,
          });
          break;
        }
        const decision = decideAfterReview(validation.report, {
          phase: 'batch',
          batchFixAttempts: state.batchFixAttempts,
          maxFixAttempts: cfg.max_fix_attempts,
          hasRemainingTodos: false,
        });
        appendLog(paths, `batch review → ${decision.next} (${decision.reason})`);
        state = patchState(paths, {
          status: decision.next,
          blockedReason: decision.next === STATUSES.BLOCKED ? decision.reason : null,
        });
        break;
      }

      case STATUSES.FIX_BATCH: {
        if (state.batchFixAttempts >= cfg.max_fix_attempts) {
          state = patchState(paths, {
            status: STATUSES.BLOCKED,
            blockedReason: 'batch fix attempts exceeded',
          });
          break;
        }
        state = patchState(paths, { batchFixAttempts: state.batchFixAttempts + 1 });
        const fixResult = runAgent('fixer', {
          mock: cli.mockAgent,
          config: cfg,
          promptCtx,
          paths,
          state,
          workdir,
        });
        applyAgentPersist(paths, fixResult);
        if (!fixResult.ok) {
          state = blockForAgentFailure(paths, state, 'fixer', fixResult);
          break;
        }
        state = patchState(paths, {
          lastAgentStdout: truncate(fixResult.stdout),
          lastAgentStderr: truncate(fixResult.stderr),
          status: STATUSES.VERIFY_BATCH,
        });
        break;
      }

      case STATUSES.VERIFY_BATCH: {
        loaded = reload(cli.exFile, workdir, cli.config, cli);
        const ids = state.activeTaskIds || [];
        const check = assertBatchChecked(loaded.tasks, ids);
        const batchTasks = loaded.tasks.filter((t) => ids.includes(t.id));
        const cmds = mockVerifyCmds(
          collectVerifyCommands(batchTasks, cfg.verify_default),
          cli,
        );
        const v = runVerifyCommands(cmds, workdir, paths, `batch-${state.currentBatch}`);
        const verifyOk = v.ok;
        const checksOk = check.ok;
        if (!check.ok) {
          appendLog(paths, `checkbox missing: ${check.missing.join(',')}`);
        }
        const decision = decideAfterVerify({
          verifyOk,
          checksOk,
          phase: 'batch',
          hasRemainingTodos: todoTasks(loaded.tasks).length > 0,
          batchFixAttempts: state.batchFixAttempts,
          fullFixAttempts: state.fullFixAttempts,
          maxFixAttempts: cfg.max_fix_attempts,
          maxFullFixAttempts: cfg.max_full_fix_attempts,
        });

        if (verifyOk && checksOk) {
          const cp = createCheckpoint(workdir, state.currentBatch, {
            enabled: Boolean(cfg.enable_checkpoint),
            excludePaths: workflowExcludePaths(workdir, paths),
          });
          appendLog(paths, `checkpoint skipped=${cp.skipped} sha=${cp.sha} ${cp.reason || ''}`);
          if (cp.error) {
            state = patchState(paths, {
              status: STATUSES.BLOCKED,
              blockedReason: cp.reason,
            });
            break;
          }
          if (cp.sha) {
            state = patchState(paths, { lastSuccessfulCommit: cp.sha });
          }
        }
        appendLog(
          paths,
          `verify ok=${verifyOk} checks=${checksOk} → ${decision.next} (${decision.reason})`,
        );
        const patch = {
          status: decision.next,
          blockedReason: decision.next === STATUSES.BLOCKED ? decision.reason : null,
        };
        if (decision.next === STATUSES.EXECUTE_BATCH) {
          patch.currentBatch = state.currentBatch + 1;
          patch.batchFixAttempts = 0;
          patch.activeTaskIds = [];
        }
        if (decision.next === STATUSES.FULL_REVIEW) {
          patch.activeTaskIds = [];
          patch.batchFixAttempts = 0;
        }
        state = patchState(paths, patch);
        break;
      }

      case STATUSES.FULL_REVIEW: {
        const reviewRunId = createReviewRunId('final-reviewer', 'final');
        clearLatestReview(paths.latestReview);
        promptCtx.reviewRunId = reviewRunId;
        const fr = runAgent('final-reviewer', {
          mock: cli.mockAgent,
          config: cfg,
          promptCtx: { ...promptCtx, batchIds: [] },
          paths,
          state,
          workdir,
        });
        applyAgentPersist(paths, fr);
        if (!fr.ok) {
          state = blockForAgentFailure(paths, state, 'final-reviewer', fr);
          break;
        }
        state = patchState(paths, {
          lastAgentStdout: truncate(fr.stdout),
          lastAgentStderr: truncate(fr.stderr),
        });
        const report = readLatestReview(paths.latestReview);
        const validation = validateReviewReport(report, {
          role: 'final-reviewer',
          batchId: 'final',
          reviewRunId,
        });
        if (!validation.ok) {
          state = patchState(paths, {
            status: STATUSES.BLOCKED,
            blockedReason: validation.reason,
          });
          break;
        }
        const decision = decideAfterReview(validation.report, {
          phase: 'full',
          fullFixAttempts: state.fullFixAttempts,
          maxFullFixAttempts: cfg.max_full_fix_attempts,
          batchFixAttempts: 0,
          maxFixAttempts: cfg.max_fix_attempts,
          hasRemainingTodos: false,
        });
        appendLog(paths, `full review → ${decision.next} (${decision.reason})`);
        state = patchState(paths, {
          status: decision.next,
          blockedReason: decision.next === STATUSES.BLOCKED ? decision.reason : null,
          manualQaRequired: decision.next === STATUSES.READY_FOR_MANUAL_QA,
        });
        break;
      }

      case STATUSES.FULL_FIX: {
        if (state.fullFixAttempts >= cfg.max_full_fix_attempts) {
          state = patchState(paths, {
            status: STATUSES.BLOCKED,
            blockedReason: 'full fix attempts exceeded',
          });
          break;
        }
        state = patchState(paths, { fullFixAttempts: state.fullFixAttempts + 1 });
        const ff = runAgent('final-fixer', {
          mock: cli.mockAgent,
          config: cfg,
          promptCtx,
          paths,
          state,
          workdir,
        });
        applyAgentPersist(paths, ff);
        if (!ff.ok) {
          state = blockForAgentFailure(paths, state, 'final-fixer', ff);
          break;
        }
        state = patchState(paths, {
          lastAgentStdout: truncate(ff.stdout),
          lastAgentStderr: truncate(ff.stderr),
          status: STATUSES.FULL_VERIFY,
        });
        break;
      }

      case STATUSES.FULL_VERIFY: {
        loaded = reload(cli.exFile, workdir, cli.config, cli);
        const allTaskIds = loaded.tasks.map((task) => task.id);
        const check = assertBatchChecked(loaded.tasks, allTaskIds);
        let runCmds = collectFullVerifyCommands(loaded.tasks, cfg.verify_default);
        if (cli.mockAgent && process.env.GBX_MOCK_REAL_VERIFY !== '1') {
          runCmds = [MOCK_OK_CMD];
        }
        const v = runVerifyCommands(runCmds, workdir, paths, 'full');
        const decision = decideAfterVerify({
          verifyOk: v.ok,
          checksOk: check.ok,
          phase: 'full',
          hasRemainingTodos: false,
          batchFixAttempts: state.batchFixAttempts,
          fullFixAttempts: state.fullFixAttempts,
          maxFixAttempts: cfg.max_fix_attempts,
          maxFullFixAttempts: cfg.max_full_fix_attempts,
        });
        if (v.ok && check.ok) {
          const cp = createCheckpoint(workdir, 'final', {
            enabled: Boolean(cfg.enable_checkpoint),
            excludePaths: workflowExcludePaths(workdir, paths),
          });
          appendLog(paths, `final checkpoint skipped=${cp.skipped} sha=${cp.sha} ${cp.reason || ''}`);
          if (cp.error) {
            state = patchState(paths, {
              status: STATUSES.BLOCKED,
              blockedReason: cp.reason,
            });
            break;
          }
          if (cp.sha) {
            state = patchState(paths, { lastSuccessfulCommit: cp.sha });
          }
        }
        if (decision.next === STATUSES.READY_FOR_MANUAL_QA) {
          state = patchState(paths, {
            status: STATUSES.READY_FOR_MANUAL_QA,
            manualQaRequired: true,
          });
        } else {
          state = patchState(paths, {
            status: decision.next,
            blockedReason: decision.next === STATUSES.BLOCKED ? decision.reason : null,
          });
        }
        break;
      }

      default: {
        console.error(`[gbx] unknown status: ${state.status}`);
        return 4;
      }
    }
  }

  console.error('[gbx] Maximum iteration count reached.');
  appendLog(paths, 'max iterations');
  return 5;
}

module.exports = { runOrchestrator, printDryRun };
