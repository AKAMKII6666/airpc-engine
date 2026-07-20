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
const {
  loadLatestVerify,
  formatBlockedVerifyReport,
  buildVerifyExcerptForPrompt,
  summarizeVerify,
} = require('./verifyReport');
const { checkHardStop } = require('./hardStop');
const {
  archiveLatestReview,
  resolveClearBlockedNext,
} = require('./clearBlocked');
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
  const fixTrigger = state && state.fixTrigger ? state.fixTrigger : null;
  const latestVerify = loadLatestVerify(paths);
  const needsVerifyExcerpt =
    !fixTrigger || String(fixTrigger).includes('verify') || role === 'fixer' || role === 'final-fixer';
  const enrichedCtx = {
    ...promptCtx,
    fixTrigger,
    latestVerifyPath: paths.latestVerify,
    verifyExcerpt: needsVerifyExcerpt
      ? buildVerifyExcerptForPrompt(latestVerify)
      : '(not injected)',
  };

  if (mock || config.mock_agent) {
    if (!config.quiet) {
      console.error(
        `[gbx] mock agent role=${role} batch=${(enrichedCtx.batchIds || []).join(',') || '-'} trigger=${fixTrigger || '-'}`,
      );
    }
    return runMockAgent({ role, ctx: enrichedCtx, paths, state });
  }
  const prompt = buildPrompt(role, enrichedCtx);
  const promptDir = path.join(paths.root, 'prompts');
  if (!config.quiet) {
    console.error(
      `[gbx] spawn role=${role} batch=${(enrichedCtx.batchIds || []).join(',') || '-'} trigger=${fixTrigger || '-'} quiet=false`,
    );
  }
  return runCursorAgent({
    command: config.agent.command,
    printFlag: config.agent.print_flag || '-p',
    prompt,
    workdir,
    promptDir,
    quiet: Boolean(config.quiet),
    heartbeatMs: config.heartbeat_ms == null ? 15_000 : config.heartbeat_ms,
    label: `${role}${enrichedCtx.batchIds && enrichedCtx.batchIds.length ? `:${enrichedCtx.batchIds.join('+')}` : ''}`,
  });
}

function emitBlockedVerify(paths, state, blockedReason) {
  const report = loadLatestVerify(paths);
  const text = formatBlockedVerifyReport({
    blockedReason,
    state,
    report,
    latestVerifyPath: paths.latestVerify,
    latestReviewPath: paths.latestReview,
  });
  console.error(text);
  appendLog(paths, text.replace(/\n/g, ' | '));
}

function clearFixBookkeepingPartial() {
  return {
    fixTrigger: null,
    ineffectiveFixStreak: 0,
  };
}

/**
 * After VERIFY_*: update STATE fields, apply ineffective-fix melt, set fixTrigger when looping to FIX.
 * @param {{ checkboxMissing?: boolean, missingIds?: string[] }} [extra]
 */
function patchAfterVerifyFailure(state, cfg, { v, decision, phase, checkboxMissing, missingIds }) {
  if (checkboxMissing) {
    const goingToFix =
      decision.next === STATUSES.FIX_BATCH || decision.next === STATUSES.FULL_FIX;
    return {
      lastVerifyOk: true,
      lastVerifySummary: `verify ok; checkbox missing: ${(missingIds || []).join(',') || '(none)'}`,
      lastVerifyFingerprint: null,
      lastVerifyReportPath: null,
      ineffectiveFixStreak: 0,
      status: decision.next,
      blockedReason: decision.next === STATUSES.BLOCKED ? decision.reason : null,
      fixTrigger:
        goingToFix || decision.next === STATUSES.BLOCKED
          ? 'checkbox_missing'
          : state.fixTrigger || null,
    };
  }

  const report = v.report || null;
  const fingerprint = v.fingerprint || null;
  let streak = state.ineffectiveFixStreak || 0;

  if (
    fingerprint &&
    state.lastVerifyFingerprint &&
    fingerprint === state.lastVerifyFingerprint &&
    ((state.batchFixAttempts || 0) > 0 || (state.fullFixAttempts || 0) > 0)
  ) {
    streak += 1;
  } else if (fingerprint && fingerprint !== state.lastVerifyFingerprint) {
    streak = 0;
  }

  const maxIneffective = cfg.max_ineffective_fixes != null ? cfg.max_ineffective_fixes : 2;
  let next = decision.next;
  let reason = decision.reason;
  if (
    !v.ok &&
    streak >= maxIneffective &&
    (next === STATUSES.FIX_BATCH || next === STATUSES.FULL_FIX || next === STATUSES.BLOCKED)
  ) {
    next = STATUSES.BLOCKED;
    reason = `ineffective fix loop; verify still failing with same fingerprint (${streak}/${maxIneffective})`;
  }

  const trigger = phase === 'full' ? 'full_verify_fail' : 'verify_fail';
  const goingToFix = next === STATUSES.FIX_BATCH || next === STATUSES.FULL_FIX;

  return {
    lastVerifyOk: false,
    lastVerifySummary: summarizeVerify(report),
    lastVerifyFingerprint: fingerprint,
    lastVerifyReportPath: null, // filled by caller with paths.latestVerify
    ineffectiveFixStreak: streak,
    status: next,
    blockedReason: next === STATUSES.BLOCKED ? reason : null,
    fixTrigger: goingToFix ? trigger : next === STATUSES.BLOCKED ? state.fixTrigger || trigger : null,
  };
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
    let cmd = loaded.config.agent.command;
    if (!commandExists(cmd)) {
      if (cmd === 'cursor-agent' && commandExists('agent')) {
        cmd = 'agent';
        loaded.config.agent.command = 'agent';
        console.error('[gbx] agent command: cursor-agent missing; using `agent`');
      } else if (cmd === 'agent' && commandExists('cursor-agent')) {
        cmd = 'cursor-agent';
        loaded.config.agent.command = 'cursor-agent';
        console.error('[gbx] agent command: agent missing; using `cursor-agent`');
      } else {
        console.error(
          `error: agent command not found: ${cmd}. Install Cursor CLI, set GBX_AGENT_CMD, or use --mock-agent.`,
        );
        return 1;
      }
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

  if (cli.clearBlocked) {
    if (state.status !== STATUSES.BLOCKED) {
      console.error(
        `error: --clear-blocked requires STATUS=BLOCKED (current=${state.status}). Use --reset-state for a full restart.`,
      );
      return 1;
    }
    loaded = reload(cli.exFile, workdir, cli.config, cli);
    const priorActive = Array.isArray(state.activeTaskIds) ? [...state.activeTaskIds] : [];
    const priorFixTrigger = state.fixTrigger || null;
    const archived = archiveLatestReview(paths.latestReview, paths.reviews);
    if (archived) {
      console.error(`[gbx] --clear-blocked: archived stale review → ${archived}`);
    }
    const resolved = resolveClearBlockedNext({
      tasks: loaded.tasks,
      activeTaskIds: priorActive,
      fixTrigger: priorFixTrigger,
      afterManual: Boolean(cli.afterManual),
    });
    state = patchState(paths, {
      status: resolved.next,
      blockedReason: null,
      lastAgentStdout: '',
      lastAgentStderr: '',
      activeTaskIds: resolved.activeTaskIds,
      // Keep fixTrigger when resuming FIX_BATCH so Fixer prompt still knows why.
      fixTrigger:
        resolved.next === STATUSES.FIX_BATCH || resolved.next === STATUSES.FULL_FIX
          ? resolved.fixTrigger || priorFixTrigger
          : null,
      batchFixAttempts: 0,
      fullFixAttempts: 0,
      checkboxFixAttempts: 0,
      ineffectiveFixStreak: 0,
      skipHardStopOnce: true,
    });
    appendLog(
      paths,
      `clear-blocked afterManual=${Boolean(cli.afterManual)} → ${resolved.next} (${resolved.reason})`,
    );
    console.error(
      `[gbx] --clear-blocked${cli.afterManual ? ' --after-manual' : ''}: was BLOCKED; now ${resolved.next}`,
    );
    console.error(`[gbx]   reason: ${resolved.reason}`);
    console.error(
      `[gbx]   todos=${todoTasks(loaded.tasks).length}; activeTaskIds=${resolved.activeTaskIds.join(',') || '-'}; stdout+latest.json cleared/archived`,
    );
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
  const quietMode = Boolean(loaded.config.quiet);
  if (!quietMode) {
    console.error(
      `[gbx] live console ON (default). Use --quiet for capture-only. workflow=${paths.root}`,
    );
  }

  for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
    state = patchState(paths, { iteration });
    appendLog(paths, `iter=${iteration} status=${state.status}`);
    console.log(`[gbx] Iteration=${iteration} Status=${state.status}`);
    if (!quietMode && state.activeTaskIds && state.activeTaskIds.length) {
      console.error(`[gbx] activeTaskIds=${state.activeTaskIds.join(',')}`);
    }

    if (isTerminal(state.status)) {
      console.log(`[gbx] terminal: ${state.status}`);
      if (state.status === STATUSES.READY_FOR_MANUAL_QA) {
        console.log(`[gbx] Manual QA required. workflow: ${paths.root}`);
      }
      if (state.blockedReason) {
        console.log(`[gbx] blockedReason: ${state.blockedReason}`);
      }
      if (
        state.status === STATUSES.BLOCKED &&
        state.blockedReason &&
        /verify|ineffective fix/i.test(state.blockedReason)
      ) {
        emitBlockedVerify(paths, state, state.blockedReason);
      }
      return exitCodeForStatus(state.status);
    }

    loaded = reload(cli.exFile, workdir, cli.config, cli);
    const cfg = loaded.config;

    const review = readLatestReview(paths.latestReview);
    if (state.skipHardStopOnce) {
      state = patchState(paths, { skipHardStopOnce: false });
      if (!quietMode) {
        console.error(
          '[gbx] hard_stop: skipped once after --clear-blocked (stale review already archived)',
        );
      }
    } else {
      const hs = checkHardStop(
        [state.lastAgentStdout, state.lastAgentStderr, review ? JSON.stringify(review) : ''],
        cfg.hard_stop_patterns,
      );
      if (hs.hit) {
        const reason = `hard_stop matched ${hs.pattern}: ${hs.snippet}`;
        console.error(`[gbx] ${reason}`);
        if (hs.context) {
          console.error(`[gbx] hard_stop context: …${hs.context}…`);
        }
        console.error(
          '[gbx] hint: if this is a "we do NOT implement X" mention, patterns should use action verbs; or re-run with --clear-blocked [--after-manual] after fixing patterns.',
        );
        state = patchState(paths, {
          status: STATUSES.BLOCKED,
          blockedReason: reason,
        });
        continue;
      }
      if (hs.skippedNegations > 0 && !quietMode) {
        console.error(
          `[gbx] hard_stop: skipped ${hs.skippedNegations} negated mention(s) (out-of-scope wording)`,
        );
      }
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
          fixTrigger: decision.next === STATUSES.FIX_BATCH ? 'review_fail' : state.fixTrigger,
        });
        break;
      }

      case STATUSES.FIX_BATCH: {
        const isCheckbox = state.fixTrigger === 'checkbox_missing';
        const maxCheckbox =
          cfg.max_checkbox_fix_attempts != null ? cfg.max_checkbox_fix_attempts : 2;
        if (isCheckbox) {
          if ((state.checkboxFixAttempts || 0) >= maxCheckbox) {
            const reason = `checkbox_missing; fix budget exhausted (${state.checkboxFixAttempts || 0}/${maxCheckbox})`;
            state = patchState(paths, {
              status: STATUSES.BLOCKED,
              blockedReason: reason,
              fixTrigger: 'checkbox_missing',
            });
            emitBlockedVerify(paths, state, reason);
            break;
          }
        } else if (state.batchFixAttempts >= cfg.max_fix_attempts) {
          const reason = 'batch fix attempts exceeded';
          state = patchState(paths, {
            status: STATUSES.BLOCKED,
            blockedReason: reason,
          });
          emitBlockedVerify(paths, state, reason);
          break;
        }
        if (
          state.fixTrigger &&
          String(state.fixTrigger).includes('verify') &&
          state.fixTrigger !== 'checkbox_missing' &&
          !loadLatestVerify(paths)
        ) {
          const reason = 'fixTrigger is verify_* but reports/latest-verify.json is missing';
          state = patchState(paths, {
            status: STATUSES.BLOCKED,
            blockedReason: reason,
          });
          emitBlockedVerify(paths, state, reason);
          break;
        }
        if (isCheckbox) {
          state = patchState(paths, {
            checkboxFixAttempts: (state.checkboxFixAttempts || 0) + 1,
          });
        } else {
          state = patchState(paths, { batchFixAttempts: state.batchFixAttempts + 1 });
        }
        const fixResult = runAgent('fixer', {
          mock: cli.mockAgent,
          config: cfg,
          promptCtx,
          paths,
          state: readState(paths) || state,
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
        const v = runVerifyCommands(cmds, workdir, paths, `batch-${state.currentBatch}`, {
          quiet: Boolean(cfg.quiet),
          phase: 'batch',
          activeTaskIds: ids,
          maxBytes: cfg.verify_capture_max_bytes,
        });
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
          checkboxFixAttempts: state.checkboxFixAttempts || 0,
          maxCheckboxFixAttempts:
            cfg.max_checkbox_fix_attempts != null ? cfg.max_checkbox_fix_attempts : 2,
          missingTaskIds: check.missing || [],
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
          `verify ok=${verifyOk} checks=${checksOk} → ${decision.next} (${decision.reason}) fingerprint=${v.fingerprint || '-'}`,
        );

        if (!verifyOk || !checksOk) {
          const checkboxMissing = Boolean(verifyOk && !checksOk);
          const failPatch = patchAfterVerifyFailure(state, cfg, {
            v,
            decision,
            phase: 'batch',
            checkboxMissing,
            missingIds: check.missing || [],
          });
          failPatch.lastVerifyReportPath = paths.latestVerify;
          if (checkboxMissing) {
            console.error(
              `[gbx] verify scripts OK but tasks not checked: ${(check.missing || []).join(',')}; fixTrigger=checkbox_missing`,
            );
          }
          state = patchState(paths, failPatch);
          if (state.status === STATUSES.BLOCKED) {
            emitBlockedVerify(paths, state, state.blockedReason);
          } else if (state.fixTrigger) {
            console.error(
              `[gbx] ${checkboxMissing ? 'checkbox gap' : 'verify failed'} → ${state.status}; fixTrigger=${state.fixTrigger}; ${state.lastVerifySummary || ''}`,
            );
          }
          break;
        }

        const patch = {
          status: decision.next,
          blockedReason: null,
          lastVerifyOk: true,
          lastVerifySummary: summarizeVerify(v.report),
          lastVerifyFingerprint: null,
          lastVerifyReportPath: paths.latestVerify,
          checkboxFixAttempts: 0,
          ...clearFixBookkeepingPartial(),
        };
        if (decision.next === STATUSES.EXECUTE_BATCH) {
          patch.currentBatch = state.currentBatch + 1;
          patch.batchFixAttempts = 0;
          patch.checkboxFixAttempts = 0;
          patch.activeTaskIds = [];
        }
        if (decision.next === STATUSES.FULL_REVIEW) {
          patch.activeTaskIds = [];
          patch.batchFixAttempts = 0;
          patch.checkboxFixAttempts = 0;
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
          fixTrigger: decision.next === STATUSES.FULL_FIX ? 'full_review_fail' : state.fixTrigger,
        });
        break;
      }

      case STATUSES.FULL_FIX: {
        const isCheckbox = state.fixTrigger === 'checkbox_missing';
        const maxCheckbox =
          cfg.max_checkbox_fix_attempts != null ? cfg.max_checkbox_fix_attempts : 2;
        if (isCheckbox) {
          if ((state.checkboxFixAttempts || 0) >= maxCheckbox) {
            const reason = `checkbox_missing; fix budget exhausted (${state.checkboxFixAttempts || 0}/${maxCheckbox})`;
            state = patchState(paths, {
              status: STATUSES.BLOCKED,
              blockedReason: reason,
              fixTrigger: 'checkbox_missing',
            });
            emitBlockedVerify(paths, state, reason);
            break;
          }
        } else if (state.fullFixAttempts >= cfg.max_full_fix_attempts) {
          const reason = 'full fix attempts exceeded';
          state = patchState(paths, {
            status: STATUSES.BLOCKED,
            blockedReason: reason,
          });
          emitBlockedVerify(paths, state, reason);
          break;
        }
        if (
          state.fixTrigger &&
          String(state.fixTrigger).includes('verify') &&
          state.fixTrigger !== 'checkbox_missing' &&
          !loadLatestVerify(paths)
        ) {
          const reason = 'fixTrigger is full_verify_* but reports/latest-verify.json is missing';
          state = patchState(paths, {
            status: STATUSES.BLOCKED,
            blockedReason: reason,
          });
          emitBlockedVerify(paths, state, reason);
          break;
        }
        if (isCheckbox) {
          state = patchState(paths, {
            checkboxFixAttempts: (state.checkboxFixAttempts || 0) + 1,
          });
        } else {
          state = patchState(paths, { fullFixAttempts: state.fullFixAttempts + 1 });
        }
        const ff = runAgent('final-fixer', {
          mock: cli.mockAgent,
          config: cfg,
          promptCtx,
          paths,
          state: readState(paths) || state,
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
        const v = runVerifyCommands(runCmds, workdir, paths, 'full', {
          quiet: Boolean(cfg.quiet),
          phase: 'full',
          activeTaskIds: allTaskIds,
          maxBytes: cfg.verify_capture_max_bytes,
        });
        const decision = decideAfterVerify({
          verifyOk: v.ok,
          checksOk: check.ok,
          phase: 'full',
          hasRemainingTodos: false,
          batchFixAttempts: state.batchFixAttempts,
          fullFixAttempts: state.fullFixAttempts,
          maxFixAttempts: cfg.max_fix_attempts,
          maxFullFixAttempts: cfg.max_full_fix_attempts,
          checkboxFixAttempts: state.checkboxFixAttempts || 0,
          maxCheckboxFixAttempts:
            cfg.max_checkbox_fix_attempts != null ? cfg.max_checkbox_fix_attempts : 2,
          missingTaskIds: check.missing || [],
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
          state = patchState(paths, {
            status: STATUSES.READY_FOR_MANUAL_QA,
            manualQaRequired: true,
            lastVerifyOk: true,
            lastVerifySummary: summarizeVerify(v.report),
            lastVerifyFingerprint: null,
            lastVerifyReportPath: paths.latestVerify,
            checkboxFixAttempts: 0,
            ...clearFixBookkeepingPartial(),
          });
          break;
        }

        appendLog(
          paths,
          `full verify ok=${v.ok} checks=${check.ok} → ${decision.next} (${decision.reason})`,
        );
        const checkboxMissing = Boolean(v.ok && !check.ok);
        const failPatch = patchAfterVerifyFailure(state, cfg, {
          v,
          decision,
          phase: 'full',
          checkboxMissing,
          missingIds: check.missing || [],
        });
        failPatch.lastVerifyReportPath = paths.latestVerify;
        if (decision.next === STATUSES.READY_FOR_MANUAL_QA) {
          failPatch.status = STATUSES.READY_FOR_MANUAL_QA;
          failPatch.manualQaRequired = true;
          failPatch.blockedReason = null;
        }
        state = patchState(paths, failPatch);
        if (state.status === STATUSES.BLOCKED) {
          emitBlockedVerify(paths, state, state.blockedReason);
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
