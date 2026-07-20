/**
 * createStudioId 门禁冒烟：ID 工厂须稳定、可测，且不依赖 Host。
 */
import assert from "node:assert/strict";
import { describe, it, beforeEach } from "vitest";
import {
  createStudioId,
  resetStudioIdSeq,
} from "@studio-v2/typeFiles/ids/createStudioId";

describe("createStudioId", () => {
  beforeEach(() => {
    resetStudioIdSeq(0);
  });

  it("生成带种类前缀的 snake_case id", () => {
    const id = createStudioId("package", "Demo Pack");
    assert.match(id, /^pkg_demo_pack_\w+$/);
  });

  it("空 seed 仍可生成", () => {
    const id = createStudioId("card");
    assert.match(id, /^card_\d+_\w+$/);
  });
});
