'use strict';

/**
 * Module: stateStore
 * Purpose: Read/write STATE.json — only orchestrator writes this.
 */

const fs = require('fs');
const path = require('path');

const INITIAL = {
  status: 'EXECUTE_BATCH',
  currentBatch: 1,
  batchFixAttempts: 0,
  fullFixAttempts: 0,
  iteration: 0,
  lastSuccessfulCommit: null,
  manualQaRequired: false,
  blockedReason: null,
  activeTaskIds: [],
  exFile: null,
};

function workflowPaths(workdir, workflowDir) {
  const root = path.resolve(workdir, workflowDir || '.ai-workflow');
  return {
    root,
    state: path.join(root, 'STATE.json'),
    reviews: path.join(root, 'reviews'),
    latestReview: path.join(root, 'reviews', 'latest.json'),
    reports: path.join(root, 'reports'),
    logs: path.join(root, 'logs'),
    logFile: path.join(root, 'logs', 'loop.log'),
  };
}

function ensureWorkflowDirs(paths) {
  for (const d of [paths.root, paths.reviews, paths.reports, paths.logs]) {
    fs.mkdirSync(d, { recursive: true });
  }
}

function readState(paths) {
  if (!fs.existsSync(paths.state)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(paths.state, 'utf8'));
}

function writeState(paths, state) {
  ensureWorkflowDirs(paths);
  fs.writeFileSync(paths.state, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

function initState(paths, { exFile }) {
  const state = {
    ...INITIAL,
    exFile,
    updatedAt: new Date().toISOString(),
  };
  writeState(paths, state);
  return state;
}

function loadOrInitState(paths, { exFile }) {
  ensureWorkflowDirs(paths);
  const existing = readState(paths);
  if (existing) {
    const expected = fs.realpathSync(exFile);
    let actual;
    if (typeof existing.exFile === 'string' && existing.exFile) {
      try {
        actual = fs.realpathSync(existing.exFile);
      } catch {
        actual = path.resolve(existing.exFile);
      }
    } else {
      actual = null;
    }
    if (actual !== expected) {
      const error = new Error(
        `workflow state belongs to another execution index (${existing.exFile || 'unknown'}); use --reset-state or a different workflow_dir`,
      );
      error.code = 'STATE_EXFILE_MISMATCH';
      throw error;
    }
    return existing;
  }
  return initState(paths, { exFile: fs.realpathSync(exFile) });
}

function patchState(paths, patch) {
  const cur = readState(paths) || { ...INITIAL };
  const next = {
    ...cur,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  writeState(paths, next);
  return next;
}

function appendLog(paths, line) {
  ensureWorkflowDirs(paths);
  const stamp = new Date().toISOString();
  fs.appendFileSync(paths.logFile, `[${stamp}] ${line}\n`, 'utf8');
}

module.exports = {
  INITIAL,
  workflowPaths,
  ensureWorkflowDirs,
  readState,
  writeState,
  initState,
  loadOrInitState,
  patchState,
  appendLog,
};
