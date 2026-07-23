'use strict';

/**
 * Module: ui/tuiApp
 * Purpose: neo-blessed dashboard — header, scrollable log, status bar, help overlay.
 */

const path = require('path');
const { roleStyle, truncateText } = require('../consoleTheme');
const { fitSplashArt } = require('./splashArt');

const HUE_TAG = {
  blue: 'blue-fg',
  cyan: 'cyan-fg',
  yellow: 'yellow-fg',
  magenta: 'magenta-fg',
  red: 'red-fg',
  green: 'green-fg',
  white: 'white-fg',
};

const TUI_LAYOUT = Object.freeze({
  headerHeight: 5,
  headerContentLines: 3,
  statusHeight: 4,
  statusContentLines: 2,
});

/**
 * Escape literal `{`/`}` so neo-blessed `tags:true` won't treat agent/verify text as markup.
 * Upstream neo-blessed crashes on multi-part attrs like `{a,b}` (`_attr(...).slice` on null).
 */
function escapeBlessedTags(text) {
  // Single-pass: sequential replaces would corrupt `{open}` via its trailing `}`.
  return String(text ?? '').replace(/[{}]/g, (ch) => (ch === '{' ? '{open}' : '{close}'));
}

function tag(hue, text, { bold = false, dim = false } = {}) {
  const colorTag = dim && hue === 'white' ? 'gray-fg' : HUE_TAG[hue] || 'white-fg';
  const open = `${bold ? '{bold}' : ''}{${colorTag}}`;
  // Body is user-controlled; markup delimiters stay outside escapeBlessedTags.
  return `${open}${escapeBlessedTags(text)}{/}`;
}

function stripAnsi(text) {
  return String(text || '').replace(/\x1b\[[0-9;]*m/g, '');
}

function formatHeartbeatLine(event) {
  const recent = event.text ? ` · 最近: ${truncateText(event.text, 72)}` : '';
  return tag(
    'white',
    `… ${event.label || 'agent'} 仍在运行 · ${event.elapsed || 0}s${recent}`,
    { dim: true },
  );
}

function createTuiApp(options = {}) {
  let blessed;
  try {
    blessed = require('neo-blessed');
  } catch (error) {
    throw new Error(
      `neo-blessed is required for TUI mode (${error.message}). Run npm install in general-batch-exe.`,
    );
  }

  const state = {
    title: options.title || 'gbx',
    exFile: options.exFile || '',
    workflow: options.workflow || '',
    iteration: 0,
    status: 'INIT',
    batchIds: [],
    taskIds: [],
    recovery: null,
    recoveryKind: null,
    agentLabel: null,
    agentRole: null,
    agentElapsed: 0,
    lastActivity: '',
    blockedReason: null,
    terminalStatus: null,
    currentLogFile: null,
    reportPaths: {},
    agentStartedAt: null,
  };

  const screen = blessed.screen({
    smartCSR: true,
    fullUnicode: true,
    title: 'gbx',
    dockBorders: true,
  });

  const header = blessed.box({
    parent: screen,
    top: 0,
    left: 0,
    width: '100%',
    height: TUI_LAYOUT.headerHeight,
    tags: true,
    border: { type: 'line' },
    style: { border: { fg: 'cyan' } },
  });

  const logBox = blessed.log({
    parent: screen,
    top: TUI_LAYOUT.headerHeight,
    left: 0,
    width: '100%',
    bottom: TUI_LAYOUT.statusHeight,
    tags: true,
    scrollable: true,
    alwaysScroll: true,
    scrollbar: { ch: ' ', inverse: true },
    mouse: options.mouse === true,
    style: { fg: 'white', bg: 'black' },
  });

  const statusBar = blessed.box({
    parent: screen,
    bottom: 0,
    left: 0,
    width: '100%',
    height: TUI_LAYOUT.statusHeight,
    tags: true,
    border: { type: 'line' },
    style: { border: { fg: 'blue' } },
  });

  const helpBox = blessed.box({
    parent: screen,
    hidden: true,
    top: 'center',
    left: 'center',
    width: '86%',
    height: '70%',
    tags: true,
    border: { type: 'line' },
    label: ' 帮助 ',
    scrollable: true,
    alwaysScroll: true,
    style: { border: { fg: 'yellow' }, bg: 'black' },
    content: [
      '{bold}快捷键{/bold}',
      '  q     退出 TUI（不中断正在运行的子进程；Ctrl+C 硬中断）',
      '  ?     显示/隐藏本帮助',
      '  ↑/↓   日志逐行滚动',
      '  PgUp/PgDn 日志翻页',
      '  g/G   日志滚到顶/底',
      '  l     在日志中打印当前 agent log 路径',
      '  o     在日志中打印 latest-verify / block-repair 报告路径',
      '',
      '{bold}布局{/bold}',
      '  顶栏：索引、workflow、FSM 状态',
      '  中间：orchestrator + agent 活动（键盘滚动，保留终端文字选择）',
      '  底栏：当前 agent / 最近活动 / 快捷键提示',
      '',
      '{bold}逃生{/bold}',
      '  --plain 或 GBX_TUI=0 回退 v0.6 行输出',
      '  --quiet 完全捕获，无 TUI',
    ].join('\n'),
  });

  const dismissBox = blessed.box({
    parent: screen,
    hidden: true,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    tags: false,
    align: 'center',
    valign: 'middle',
    wrap: true,
    style: { fg: 'green', bg: 'black' },
  });
  let dismissActive = false;
  let dismissFinish = null;

  const splashBox = options.splashText
    ? blessed.box({
        parent: screen,
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        tags: false,
        align: 'center',
        valign: 'middle',
        wrap: false,
        style: { fg: 'cyan', bg: 'black' },
      })
    : null;
  let splashTimer = null;

  function updateSplashContent() {
    if (!splashBox) return;
    const maxWidth = Math.max(1, Number(screen.width) - 4);
    const maxHeight = Math.max(1, Number(screen.height) - 4);
    splashBox.setContent(fitSplashArt(options.splashText, maxWidth, maxHeight));
  }

  function renderHeader() {
    const batch = escapeBlessedTags(state.batchIds.join(',') || '-');
    const tasks = escapeBlessedTags(state.taskIds.join(',') || '-');
    const ex = truncateText(path.basename(state.exFile) || '-', 40);
    const wf = truncateText(state.workflow || '-', 36);
    const rec =
      state.recovery != null
        ? ` · recovery ${state.recovery.current}/${state.recovery.max}`
        : '';
    const kind = state.recoveryKind
      ? ` · ${escapeBlessedTags(String(state.recoveryKind))}`
      : '';
    header.setContent(
      [
        `${tag('cyan', 'gbx', { bold: true })} ${tag('white', state.title, { dim: true })} · ${tag('yellow', ex)}`,
        `${tag('white', `iter ${state.iteration}`, { dim: true })} · ${tag('green', state.status, { bold: true })} · batch ${batch} · tasks ${tasks}${rec}${kind}`,
        `${tag('white', `workflow: ${wf}`, { dim: true })}`,
      ].join('\n'),
    );
  }

  function renderStatus() {
    const shortcuts = options.showShortcuts !== false
      ? tag('white', 'q 退出 · ? 帮助 · ↑/↓/PgUp/PgDn 滚屏 · g/G 顶/底 · l 日志 · o 报告', {
          dim: true,
        })
      : '';
    let agentLine = tag('white', '等待 agent…', { dim: true });
    if (state.agentLabel) {
      const hue = roleStyle(state.agentRole || 'default').hue;
      const elapsed = state.agentElapsed ? ` · ${state.agentElapsed}s` : '';
      const recent = state.lastActivity
        ? ` · 最近: ${truncateText(state.lastActivity, 48)}`
        : '';
      agentLine = `${tag(hue, `▶ ${state.agentLabel}`, { bold: true })}${tag('white', `${elapsed}${recent}`, { dim: true })}`;
    } else if (state.terminalStatus) {
      const hue = state.terminalStatus === 'BLOCKED' ? 'red' : 'green';
      agentLine = tag(hue, `■ ${state.terminalStatus}`, { bold: true });
      if (state.blockedReason) {
        agentLine += ` ${tag('white', truncateText(state.blockedReason, 56), { dim: true })}`;
      }
    }
    statusBar.setContent(`${agentLine}\n${shortcuts}`);
  }

  function render() {
    try {
      renderHeader();
      renderStatus();
      screen.render();
    } catch {
      // neo-blessed tag parse can still throw on residual markup; keep orchestrator alive.
    }
  }

  function appendLogLine(line) {
    const plain = stripAnsi(line);
    if (!plain.trim()) return;
    try {
      logBox.log(plain);
    } catch {
      // Last resort: treat entire line as literal (loses intentional color tags).
      try {
        logBox.log(escapeBlessedTags(plain));
      } catch {
        /* ignore */
      }
    }
  }

  const ui = {
    mode: 'tui',
    screen,
    log(text, { level = 'log', multiline = false } = {}) {
      const body = String(text || '');
      if (!body) return;
      const prefix =
        level === 'error'
          ? tag('red', '[error] ', { bold: true })
          : level === 'warn'
            ? tag('yellow', '[warn] ', { bold: true })
            : '';
      if (multiline) {
        for (const line of body.split('\n')) {
          if (line.trim()) appendLogLine(prefix + escapeBlessedTags(line));
        }
      } else {
        for (const line of body.split('\n')) {
          appendLogLine(prefix + escapeBlessedTags(line));
        }
      }
      render();
    },
    setHeader(ctx = {}) {
      if (ctx.title != null) state.title = ctx.title;
      if (ctx.exFile != null) state.exFile = ctx.exFile;
      if (ctx.workflow != null) state.workflow = ctx.workflow;
      render();
    },
    setFsm(ctx = {}) {
      if (ctx.iteration != null) state.iteration = ctx.iteration;
      if (ctx.status != null) state.status = ctx.status;
      if (ctx.batchIds) state.batchIds = ctx.batchIds;
      if (ctx.taskIds) state.taskIds = ctx.taskIds;
      if (ctx.recovery != null) state.recovery = ctx.recovery;
      if (ctx.recoveryKind != null) state.recoveryKind = ctx.recoveryKind;
      if (ctx.terminalStatus != null) state.terminalStatus = ctx.terminalStatus;
      if (ctx.blockedReason != null) state.blockedReason = ctx.blockedReason;
      if (ctx.reportPaths) state.reportPaths = { ...state.reportPaths, ...ctx.reportPaths };
      render();
    },
    setAgent(ctx = {}) {
      const nextLabel = ctx.label != null ? ctx.label : state.agentLabel;
      if (nextLabel && nextLabel !== state.agentLabel) {
        state.agentStartedAt = Date.now();
      }
      if (ctx.label != null) state.agentLabel = ctx.label;
      if (ctx.role != null) state.agentRole = ctx.role;
      if (ctx.elapsed != null) state.agentElapsed = ctx.elapsed;
      if (ctx.lastActivity != null) state.lastActivity = ctx.lastActivity;
      if (ctx.logFile != null) state.currentLogFile = ctx.logFile;
      render();
    },
    clearAgent() {
      state.agentLabel = null;
      state.agentRole = null;
      state.agentElapsed = 0;
      state.lastActivity = '';
      state.agentStartedAt = null;
      render();
    },
    onTeeEvent(ev) {
      if (!ev || !ev.kind) return;
      if (ev.role) state.agentRole = ev.role;
      if (ev.label) state.agentLabel = ev.label;
      if (ev.logFile) state.currentLogFile = ev.logFile;
      if (ev.elapsed != null) state.agentElapsed = ev.elapsed;
      if (ev.text) state.lastActivity = ev.text;

      if (ev.kind === 'start') {
        const hue = roleStyle(ev.role || 'default').hue;
        appendLogLine(tag(hue, `▶ ${ev.label || 'agent'}`, { bold: true }));
      } else if (ev.kind === 'activity') {
        const hue = roleStyle(ev.role || 'default').hue;
        appendLogLine(
          `${tag(hue, '· ', { bold: true })}${escapeBlessedTags(truncateText(ev.text, 96))}`,
        );
      } else if (ev.kind === 'heartbeat') {
        appendLogLine(formatHeartbeatLine(ev));
      } else if (ev.kind === 'done') {
        const ok = ev.exitCode === 0;
        const hue = ok ? 'green' : 'red';
        appendLogLine(
          tag(hue, `■ ${ev.label || 'agent'} done exit=${ev.exitCode} elapsed=${ev.elapsed || 0}s`, {
            bold: true,
          }),
        );
        ui.clearAgent();
      } else if (ev.kind === 'error') {
        appendLogLine(tag('red', `✖ ${ev.label}: ${ev.text}`, { bold: true }));
      } else if (ev.kind === 'result') {
        for (const line of String(ev.text || '').split('\n')) {
          if (line.trim()) appendLogLine(escapeBlessedTags(line));
        }
      } else if (ev.kind === 'stderr') {
        for (const line of String(ev.text || '').split('\n')) {
          if (line.trim()) appendLogLine(tag('red', line, { dim: true }));
        }
      } else if (ev.kind === 'banner') {
        for (const line of ev.lines || []) {
          // Banner may mix ANSI (stripped) with literal braces from themes/paths.
          appendLogLine(escapeBlessedTags(stripAnsi(line)));
        }
      }
      render();
    },
    render,
    awaitDismiss(ctx = {}, onAck) {
      const message = String(ctx.message || '').trim() || '按任意键退出...';
      const hue = ctx.status === 'BLOCKED' ? 'red' : 'green';
      if (splashBox) splashBox.hide();
      helpBox.hide();
      dismissBox.style = { fg: hue, bg: 'black' };
      dismissBox.setContent(message);
      dismissBox.show();
      dismissBox.setFront();
      dismissActive = true;
      render();

      const finish = () => {
        if (!dismissActive) return;
        dismissActive = false;
        dismissFinish = null;
        dismissBox.hide();
        render();
        if (typeof onAck === 'function') onAck();
      };
      dismissFinish = finish;
      screen.once('keypress', finish);
    },
    destroy() {
      clearInterval(refreshTimer);
      if (splashTimer) clearTimeout(splashTimer);
      try {
        screen.destroy();
      } catch {
        /* ignore */
      }
    },
  };

  // 渲染器必须独立刷新；Agent 静默时也要持续显示存活时长。
  const refreshTimer = setInterval(() => {
    if (state.agentStartedAt) {
      state.agentElapsed = Math.max(
        state.agentElapsed || 0,
        Math.floor((Date.now() - state.agentStartedAt) / 1000),
      );
    }
    render();
  }, 1000);
  refreshTimer.unref?.();

  screen.key(['q', 'C-c'], () => {
    if (dismissActive && dismissFinish) {
      dismissFinish();
      return;
    }
    ui.log('按 q 退出 TUI 视图（子进程若仍在运行请用终端 Ctrl+C）', { level: 'warn' });
    ui.destroy();
  });

  screen.key(['?'], () => {
    helpBox.hidden = !helpBox.hidden;
    if (!helpBox.hidden) helpBox.setFront();
    render();
  });

  screen.key(['g'], () => {
    logBox.setScrollPerc(0);
    render();
  });
  screen.key(['G'], () => {
    logBox.setScrollPerc(100);
    render();
  });
  screen.key(['up', 'k'], () => {
    logBox.scroll(-1);
    render();
  });
  screen.key(['down', 'j'], () => {
    logBox.scroll(1);
    render();
  });
  screen.key(['pageup'], () => {
    logBox.scroll(-Math.max(1, logBox.height - 2));
    render();
  });
  screen.key(['pagedown'], () => {
    logBox.scroll(Math.max(1, logBox.height - 2));
    render();
  });

  screen.key(['l'], () => {
    if (state.currentLogFile) {
      ui.log(`agent log: ${state.currentLogFile}`, { level: 'info' });
    } else {
      ui.log('尚无 agent log 路径', { level: 'warn' });
    }
  });

  screen.key(['o'], () => {
    const parts = [];
    if (state.reportPaths.latestVerify) parts.push(`verify: ${state.reportPaths.latestVerify}`);
    if (state.reportPaths.latestBlockRepair) {
      parts.push(`block-repair: ${state.reportPaths.latestBlockRepair}`);
    }
    if (state.reportPaths.latestBlockAnalysis) {
      parts.push(`block-analysis: ${state.reportPaths.latestBlockAnalysis}`);
    }
    if (parts.length) ui.log(parts.join('\n'), { level: 'info', multiline: true });
    else ui.log('尚无报告路径', { level: 'warn' });
  });

  screen.on('resize', () => {
    if (splashBox && !splashBox.hidden) updateSplashContent();
    render();
  });

  renderHeader();
  renderStatus();
  if (splashBox) {
    updateSplashContent();
    splashBox.setFront();
    splashTimer = setTimeout(() => {
      splashBox.hide();
      render();
    }, Math.max(0, Number(options.splashMs) || 0));
    splashTimer.unref?.();
  }
  screen.render();

  return ui;
}

module.exports = {
  createTuiApp,
  tag,
  stripAnsi,
  escapeBlessedTags,
  formatHeartbeatLine,
  TUI_LAYOUT,
};
