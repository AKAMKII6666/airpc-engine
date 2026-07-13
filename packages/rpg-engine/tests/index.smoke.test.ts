/**
 * 模块名称：rpg-engine 烟测
 */
import { describe, expect, it } from "vitest";
import { getEnginePackageName } from "../src/index.js";

describe("rpg-engine smoke", () => {
  it("exports package name via public facade", () => {
    expect(getEnginePackageName()).toBe("@airpc/rpg-engine");
  });
});
