'use strict';

/**
 * Module: ui/tuiProcessProxy
 * Purpose: Synchronous writer facade backed by an independent TUI process.
 */

const { fork } = require('child_process');
const fs = require('fs');
const path = require('path');

const FORWARDED_METHODS = [
  'log',
  'setHeader',
  'setFsm',
  'setAgent',
  'clearAgent',
  'onTeeEvent',
  'render',
];

function nativeFd(stream) {
  return stream?.fd ?? stream?._handle?.fd;
}

function waitUntilFirstFrame(child) {
  const readyPipe = child.stdio[4];
  // Node does not expose .fd on every Pipe wrapper; the native handle is
  // available immediately after spawn and is required for this sync handshake.
  const readyFd = nativeFd(readyPipe);
  if (!Number.isInteger(readyFd)) {
    throw new Error('TUI startup handshake pipe is unavailable');
  }
  const buffer = Buffer.alloc(4096);
  const waitCell = new Int32Array(new SharedArrayBuffer(4));
  const deadline = Date.now() + 5_000;
  let bytes = 0;
  while (bytes === 0) {
    try {
      bytes = fs.readSync(readyFd, buffer, 0, buffer.length, null);
    } catch (error) {
      if (error.code !== 'EAGAIN') throw error;
      if (Date.now() >= deadline) {
        throw new Error('TUI renderer did not produce its first frame within 5 seconds');
      }
      Atomics.wait(waitCell, 0, 0, 10);
    }
  }
  const response = buffer.toString('utf8', 0, bytes).trim();
  if (response !== 'READY') {
    throw new Error(response.replace(/^ERROR:/, '') || 'TUI renderer exited before first frame');
  }
}

function writeControlMessage(fd, message) {
  const payload = Buffer.from(`${JSON.stringify(message)}\n`, 'utf8');
  const waitCell = new Int32Array(new SharedArrayBuffer(4));
  const deadline = Date.now() + 2_000;
  let offset = 0;

  while (offset < payload.length) {
    try {
      const written = fs.writeSync(fd, payload, offset, payload.length - offset);
      if (written === 0) {
        if (Date.now() >= deadline) return false;
        Atomics.wait(waitCell, 0, 0, 2);
        continue;
      }
      offset += written;
    } catch (error) {
      if (error.code !== 'EAGAIN') return false;
      if (Date.now() >= deadline) return false;
      Atomics.wait(waitCell, 0, 0, 2);
    }
  }
  return true;
}

function waitUntilDismissed(child, timeoutMs = 3_600_000) {
  const ackPipe = child.stdio[4];
  const ackFd = nativeFd(ackPipe);
  if (!Number.isInteger(ackFd)) {
    throw new Error('TUI dismiss handshake pipe is unavailable');
  }
  const buffer = Buffer.alloc(4096);
  const waitCell = new Int32Array(new SharedArrayBuffer(4));
  const deadline = Date.now() + timeoutMs;
  let bytes = 0;
  while (bytes === 0) {
    try {
      bytes = fs.readSync(ackFd, buffer, 0, buffer.length, null);
    } catch (error) {
      if (error.code !== 'EAGAIN') throw error;
      if (Date.now() >= deadline) {
        throw new Error('TUI dismiss wait timed out');
      }
      Atomics.wait(waitCell, 0, 0, 50);
    }
  }
  const response = buffer.toString('utf8', 0, bytes).trim();
  if (response !== 'DISMISSED') {
    throw new Error(response.replace(/^ERROR:/, '') || 'TUI renderer exited before dismiss');
  }
}

function createTuiProcessProxy(options = {}, dependencies = {}) {
  const hostFile = dependencies.hostFile || path.join(__dirname, 'tuiProcessHost.js');
  const child = fork(hostFile, [], {
    env: {
      ...process.env,
      GBX_TUI_OPTIONS: JSON.stringify(options),
    },
    // fd 4: one-shot first-frame handshake. fd 5: synchronous event pipe.
    stdio: ['inherit', 'inherit', 'inherit', 'ipc', 'pipe', 'pipe'],
  });

  try {
    waitUntilFirstFrame(child);
  } catch (error) {
    child.kill('SIGTERM');
    throw error;
  }
  const controlFd = nativeFd(child.stdio[5]);
  if (!Number.isInteger(controlFd)) {
    child.kill('SIGTERM');
    throw new Error('TUI control pipe is unavailable');
  }
  let destroyed = false;

  function send(method, args = []) {
    if (destroyed) return;
    if (!writeControlMessage(controlFd, { method, args })) {
      destroyed = true;
      child.kill('SIGTERM');
    }
  }

  const proxy = {
    mode: 'tui',
    rendererPid: child.pid,
    destroy() {
      if (destroyed) return;
      const delivered = writeControlMessage(controlFd, { method: 'destroy', args: [] });
      destroyed = true;
      if (!delivered) {
        child.kill('SIGTERM');
      }
    },
    awaitDismiss(ctx = {}) {
      if (destroyed) return;
      if (!writeControlMessage(controlFd, { method: 'awaitDismiss', args: [ctx] })) {
        destroyed = true;
        child.kill('SIGTERM');
        return;
      }
      try {
        waitUntilDismissed(child);
      } catch (error) {
        destroyed = true;
        child.kill('SIGTERM');
        throw error;
      }
    },
  };

  for (const method of FORWARDED_METHODS) {
    proxy[method] = (...args) => send(method, args);
  }

  child.on('error', () => {
    destroyed = true;
  });
  child.on('exit', () => {
    destroyed = true;
  });

  return proxy;
}

module.exports = {
  createTuiProcessProxy,
  waitUntilFirstFrame,
  waitUntilDismissed,
  writeControlMessage,
};
