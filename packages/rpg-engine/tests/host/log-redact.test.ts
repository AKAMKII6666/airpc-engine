/**
 * 模块名称：jsonl 脱敏单元测
 */
import { describe, expect, it } from "vitest";
import { redactSensitive } from "@airpc/rpg-engine";

describe("redactSensitive", function () {
  it("redacts privateBrief and openingPrivate", function () {
    const out = redactSensitive({
      openingSpeakable: "hi",
      openingPrivate: "secret",
      nested: { privateBrief: "x", keep: 1 },
    }) as Record<string, unknown>;
    expect(out.openingSpeakable).toBe("hi");
    expect(out.openingPrivate).toBe("[redacted]");
    expect((out.nested as { privateBrief: string; keep: number }).privateBrief).toBe(
      "[redacted]",
    );
    expect((out.nested as { keep: number }).keep).toBe(1);
  });
});
