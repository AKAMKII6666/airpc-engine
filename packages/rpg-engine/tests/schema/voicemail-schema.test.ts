/**
 * V2-VM-2：cardKind=voicemail / entryMode=mailbox_open /
 * telephony.voicemails 槽与未读单一推导
 */
import { describe, expect, it } from "vitest";
import {
  CallCardDefinitionSchema,
  CardKindSchema,
  EntryModeSchema,
  PlayerProfileSchema,
  VoicemailSlotSchema,
  deriveVoicemailHasUnread,
  isVoicemailCard,
} from "../../src/index.js";

describe("voicemail schema (V2-VM-2)", () => {
  it("CardKindSchema 接受 voicemail", () => {
    expect(CardKindSchema.safeParse("voicemail").success).toBe(true);
    expect(CardKindSchema.safeParse("story").success).toBe(true);
  });

  it("EntryModeSchema 接受 mailbox_open", () => {
    expect(EntryModeSchema.safeParse("mailbox_open").success).toBe(true);
    expect(EntryModeSchema.safeParse("inbound_user_dial").success).toBe(true);
  });

  it("CallCardDefinition 可声明 voicemail + mailbox_open + playback_only", () => {
    const parsed = CallCardDefinitionSchema.safeParse({
      cardId: "lanxing_voicemail",
      ownerAgentId: "lanxing",
      cardKind: "voicemail",
      entryMode: "mailbox_open",
      interactionMode: "playback_only",
      toolPolicy: { mode: "deny_all" },
      context: { speakableBrief: "抱歉错过你的电话" },
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(isVoicemailCard(parsed.data)).toBe(true);
  });

  it("VoicemailSlotSchema 接受物化槽字段", () => {
    const ok = VoicemailSlotSchema.safeParse({
      id: "vm1",
      agentId: "lanxing",
      cardId: "lanxing_voicemail",
      packageId: "wrong_number_act1",
      text: "你好，我是蓝星…",
      audioRef: "assets/vm/lanxing_01.wav",
      status: "unread",
      createdAt: "2026-07-23T00:00:00.000Z",
    });
    expect(ok.success).toBe(true);
  });

  it("PlayerProfileSchema.parse 保留 telephony.voicemails（不 strip）", () => {
    const profile = PlayerProfileSchema.parse({
      schemaVersion: 1,
      userId: "u1",
      user: {
        userId: "u1",
        nickname: "测",
        createdAt: "2026-07-23T00:00:00.000Z",
        updatedAt: "2026-07-23T00:00:00.000Z",
      },
      telephony: {
        voicemails: [
          {
            id: "vm1",
            agentId: "lanxing",
            status: "unread",
            createdAt: "2026-07-23T00:00:00.000Z",
            text: "留言正文",
          },
        ],
      },
    });
    expect(profile.telephony?.voicemails).toHaveLength(1);
    expect(profile.telephony?.voicemails?.[0]?.status).toBe("unread");
  });

  it("deriveVoicemailHasUnread：unread / stub_pending 为真，其余为假", () => {
    expect(deriveVoicemailHasUnread(undefined)).toBe(false);
    expect(deriveVoicemailHasUnread({ voicemails: [] })).toBe(false);
    expect(
      deriveVoicemailHasUnread({
        voicemails: [{ status: "listened" }, { status: "pending_generate" }],
      }),
    ).toBe(false);
    expect(
      deriveVoicemailHasUnread({
        voicemails: [{ status: "generate_failed" }],
      }),
    ).toBe(false);
    expect(
      deriveVoicemailHasUnread({
        voicemails: [{ status: "unread" }],
      }),
    ).toBe(true);
    expect(
      deriveVoicemailHasUnread({
        voicemails: [{ status: "stub_pending" }],
      }),
    ).toBe(true);
    expect(
      deriveVoicemailHasUnread({
        voicemails: [{ status: "listened" }, { status: "unread" }],
      }),
    ).toBe(true);
  });
});
