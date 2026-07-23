'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeEconomy,
  shouldDeferMidVerify,
  nextAfterExecuteSuccess,
  nextAfterBatchVerifyComplete,
} = require('../lib/economy');
const { STATUSES } = require('../lib/fsm');
const { mergeConfig } = require('../lib/mergeConfig');
const { parseArgs } = require('../lib/parseArgs');

describe('economy normalize', () => {
  it('accepts 1|2|3 and aliases', () => {
    assert.equal(normalizeEconomy(1), 1);
    assert.equal(normalizeEconomy('2'), 2);
    assert.equal(normalizeEconomy('defer'), 3);
    assert.equal(normalizeEconomy('lean'), 2);
    assert.equal(normalizeEconomy('strict'), 1);
    assert.equal(normalizeEconomy('nope'), null);
  });
});

describe('economy helpers', () => {
  it('shouldDeferMidVerify', () => {
    assert.equal(shouldDeferMidVerify(3, 3), true);
    assert.equal(shouldDeferMidVerify(2, 3), false);
    assert.equal(shouldDeferMidVerify(3, 0), false);
  });

  it('nextAfterExecuteSuccess mode 1/2/3', () => {
    assert.equal(
      nextAfterExecuteSuccess({
        economy: 1,
        hasRemainingTodos: true,
        currentBatch: 1,
        deferVerifyEvery: 0,
      }).status,
      STATUSES.BATCH_REVIEW,
    );
    assert.equal(
      nextAfterExecuteSuccess({
        economy: 2,
        hasRemainingTodos: true,
        currentBatch: 1,
        deferVerifyEvery: 0,
      }).status,
      STATUSES.VERIFY_BATCH,
    );
    const skip = nextAfterExecuteSuccess({
      economy: 3,
      hasRemainingTodos: true,
      currentBatch: 1,
      deferVerifyEvery: 0,
    });
    assert.equal(skip.status, STATUSES.EXECUTE_BATCH);
    assert.equal(skip.advanceBatch, true);

    const mid = nextAfterExecuteSuccess({
      economy: 3,
      hasRemainingTodos: true,
      currentBatch: 3,
      deferVerifyEvery: 3,
    });
    assert.equal(mid.status, STATUSES.VERIFY_BATCH);

    const close = nextAfterExecuteSuccess({
      economy: 3,
      hasRemainingTodos: false,
      currentBatch: 2,
      deferVerifyEvery: 0,
    });
    assert.equal(close.status, STATUSES.FULL_VERIFY);
    assert.equal(close.deferClosingVerify, true);
  });

  it('nextAfterBatchVerifyComplete defer closing', () => {
    const d = nextAfterBatchVerifyComplete({ economy: 3, hasRemainingTodos: false });
    assert.equal(d.status, STATUSES.FULL_VERIFY);
    assert.equal(d.deferClosingVerify, true);
    const s = nextAfterBatchVerifyComplete({ economy: 1, hasRemainingTodos: false });
    assert.equal(s.status, STATUSES.FULL_REVIEW);
  });
});

describe('economy config/cli', () => {
  it('mergeConfig defaults economy=1', () => {
    const cfg = mergeConfig({});
    assert.equal(cfg.economy, 1);
    assert.equal(cfg.defer_verify_every, 0);
  });

  it('CLI --economy overrides frontmatter', () => {
    const cfg = mergeConfig({
      frontmatter: { economy: 3 },
      cli: { economy: 2 },
    });
    assert.equal(cfg.economy, 2);
  });

  it('parseArgs --economy 3', () => {
    const args = parseArgs(['--exFile', 'x.md', '--economy', '3', '--defer-verify-every', '3']);
    assert.equal(args.economy, 3);
    assert.equal(args.deferVerifyEvery, 3);
  });
});
