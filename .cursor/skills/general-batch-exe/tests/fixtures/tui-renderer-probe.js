#!/usr/bin/env node
'use strict';

const fs = require('fs');

const options = JSON.parse(process.env.GBX_TUI_OPTIONS || '{}');
let timer = null;

fs.writeSync(4, 'READY\n');

function dispatch(message) {
  if (message?.method === 'setAgent' && !timer) {
    timer = setInterval(() => {
      fs.appendFileSync(options.probeFile, 'render\n');
    }, 40);
    return;
  }
  if (message?.method === 'onTeeEvent') {
    fs.appendFileSync(options.probeFile, `event:${message.args?.[0]?.kind || 'unknown'}\n`);
    return;
  }
  if (message?.method === 'awaitDismiss') {
    fs.appendFileSync(
      options.probeFile,
      `dismiss:${message.args?.[0]?.message || ''}\n`,
    );
    fs.writeSync(4, 'DISMISSED\n');
    return;
  }
  if (message?.method === 'destroy') {
    if (timer) clearInterval(timer);
    process.exit(0);
  }
}

let controlBuffer = '';
const control = fs.createReadStream(null, {
  fd: 5,
  autoClose: false,
  encoding: 'utf8',
});
control.on('data', (chunk) => {
  controlBuffer += chunk;
  let newline;
  while ((newline = controlBuffer.indexOf('\n')) >= 0) {
    const line = controlBuffer.slice(0, newline);
    controlBuffer = controlBuffer.slice(newline + 1);
    if (line.trim()) dispatch(JSON.parse(line));
  }
});

process.on('disconnect', () => process.exit(0));
