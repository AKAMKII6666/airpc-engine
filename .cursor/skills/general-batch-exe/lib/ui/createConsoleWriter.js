'use strict';

/**
 * Module: ui/createConsoleWriter
 * Purpose: Factory for plain vs neo-blessed TUI console writers.
 */

const { createPlainWriter } = require('./plainWriter');
const { createTuiProcessProxy } = require('./tuiProcessProxy');
const { loadSplashArt } = require('./splashArt');
const path = require('path');

function isTtyCapable() {
  if (process.env.GBX_TUI === '0' || process.env.GBX_TUI === 'false') {
    return false;
  }
  if (!process.stdout.isTTY || !process.stderr.isTTY) {
    return false;
  }
  if (process.env.CI === 'true' || process.env.CI === '1') {
    return false;
  }
  return true;
}

/**
 * @param {'auto'|'tui'|'plain'} mode
 * @param {boolean} quiet
 */
function resolveConsoleUiMode(mode, quiet) {
  if (quiet) return 'plain';
  const m = mode || 'auto';
  if (m === 'plain') return 'plain';
  if (m === 'tui') {
    return isTtyCapable() ? 'tui' : 'plain';
  }
  return isTtyCapable() ? 'tui' : 'plain';
}

function createConsoleWriter(options = {}) {
  const mode = resolveConsoleUiMode(options.mode, options.quiet);
  if (mode === 'tui') {
    try {
      const splashText = loadSplashArt(
        options.splashFile ||
          path.join(__dirname, '..', '..', 'image', 'ascii-art.txt'),
      );
      return createTuiProcessProxy({
        title: options.title || 'general-batch-exe',
        exFile: options.exFile,
        workflow: options.workflow,
        mouse: options.mouse === true,
        showShortcuts: options.showShortcuts !== false,
        splashText,
        splashMs: options.splashMs == null ? 1_600 : options.splashMs,
      });
    } catch (error) {
      const plain = createPlainWriter();
      plain.log(`[gbx] TUI init failed (${error.message}); falling back to plain console.`, {
        level: 'warn',
      });
      return plain;
    }
  }
  return createPlainWriter();
}

module.exports = { createConsoleWriter, resolveConsoleUiMode, isTtyCapable };
