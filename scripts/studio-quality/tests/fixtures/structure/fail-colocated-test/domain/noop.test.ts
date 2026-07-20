import { noop } from "./noop";
import assert from "node:assert/strict";
import { test } from "node:test";

test("noop", () => {
  assert.equal(typeof noop, "function");
});
