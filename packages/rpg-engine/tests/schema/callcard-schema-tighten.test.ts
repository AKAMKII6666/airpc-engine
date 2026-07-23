/**
 * S7：CallCard / Effect schema 收紧
 */
import { describe, expect, it } from "vitest";
import {
  CallCardDefinitionSchema,
  EffectSchema,
  EntryModeSchema,
  formatZodError,
} from "../../src/index.js";

describe("callCard schema tighten (S7)", () => {
  it("拒无效 entryMode / interactionMode", () => {
    const bad = CallCardDefinitionSchema.safeParse({
      cardId: "c1",
      ownerAgentId: "a1",
      entryMode: "not_a_mode",
      interactionMode: "realtime_dialogue",
    });
    expect(bad.success).toBe(false);
    if (bad.success) return;
    expect(formatZodError(bad.error)).toContain("entryMode");
  });

  it("拒未知 effect 名（parse 即失败）", () => {
    const bad = EffectSchema.safeParse({
      id: "e1",
      effect: "create_relay",
    });
    expect(bad.success).toBe(false);
  });

  it("接受白名单 effect + 扩展参数", () => {
    const ok = EffectSchema.safeParse({
      id: "attach_x",
      effect: "attach_call_card",
      agentId: "xiaopi",
      cardId: "xiaopi_waiting_user",
      activation: "inbound_user_dial",
    });
    expect(ok.success).toBe(true);
  });

  it("EntryModeSchema 含 either / 别名", () => {
    expect(EntryModeSchema.safeParse("either").success).toBe(true);
    expect(EntryModeSchema.safeParse("outbound").success).toBe(true);
  });

  it("EntryModeSchema 含 mailbox_open（语音留言）", () => {
    expect(EntryModeSchema.safeParse("mailbox_open").success).toBe(true);
  });
});
