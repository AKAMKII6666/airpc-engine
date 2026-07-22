#!/usr/bin/env node
'use strict';

/**
 * Module: ui/tuiProcessHost
 * Purpose: Run neo-blessed outside the synchronous orchestrator process.
 */

const fs = require('fs');
const { createTuiApp } = require('./tuiApp');

function notifyStartup(message) {
  try {
    fs.writeSync(4, `${message}\n`);
  } catch {
    /* Parent may have already exited. */
  }
}

function notifyDismissed() {
  try {
    fs.writeSync(4, 'DISMISSED\n');
  } catch {
    /* Parent may have already exited. */
  }
}

function main() {
  let options;
  try {
    options = JSON.parse(process.env.GBX_TUI_OPTIONS || '{}');
  } catch (error) {
    notifyStartup(`ERROR:${error.message}`);
    process.exit(1);
    return;
  }

  let ui;
  try {
    ui = createTuiApp(options);
    notifyStartup('READY');
  } catch (error) {
    notifyStartup(`ERROR:${error.message}`);
    process.exit(1);
    return;
  }

  function dispatch(message) {
    if (!message || typeof message.method !== 'string') return;
    if (message.method === 'destroy') {
      ui.destroy();
      process.exit(0);
      return;
    }
    if (message.method === 'awaitDismiss') {
      const ctx = Array.isArray(message.args) ? message.args[0] || {} : {};
      ui.awaitDismiss(ctx, notifyDismissed);
      return;
    }
    const method = ui[message.method];
    if (typeof method === 'function') {
      method(...(Array.isArray(message.args) ? message.args : []));
    }
  }

  let controlBuffer = '';
  const controlStream = fs.createReadStream(null, {
    fd: 5,
    autoClose: false,
    encoding: 'utf8',
  });
  controlStream.on('data', (chunk) => {
    controlBuffer += chunk;
    let newline;
    while ((newline = controlBuffer.indexOf('\n')) >= 0) {
      const line = controlBuffer.slice(0, newline);
      controlBuffer = controlBuffer.slice(newline + 1);
      if (!line.trim()) continue;
      try {
        dispatch(JSON.parse(line));
      } catch {
        /* Ignore malformed control messages without taking down the workflow. */
      }
    }
  });
  controlStream.on('error', () => {
    ui.destroy();
    process.exit(1);
  });

  // Kept as a compatibility path for older proxy callers.
  process.on('message', dispatch);

  process.on('disconnect', () => {
    ui.destroy();
    process.exit(0);
  });

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      ui.destroy();
      process.exit(0);
    });
  }
}

main();
