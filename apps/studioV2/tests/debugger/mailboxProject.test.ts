/**
	* 调试器信箱投影单测（不启 Host）。
	*/
import { describe, expect, it } from "vitest";
import { PlayerProfileSchema } from "@airpc/rpg-engine";
import { projectMailboxSnapshot } from "../../src/utils/server/debugger/mailboxProject.server";

describe("projectMailboxSnapshot", () => {
	it("projects unread and hasUnread", () => {
		const profile = PlayerProfileSchema.parse({
			schemaVersion: 1,
			userId: "demo-user",
			user: {
				userId: "demo-user",
				nickname: "测",
				createdAt: "2026-01-01T00:00:00.000Z",
				updatedAt: "2026-01-01T00:00:00.000Z",
			},
			telephony: {
				voicemails: [
					{
						id: "vm1",
						agentId: "lanxing",
						cardId: "lanxing_voicemail",
						packageId: "wrong_number_act1",
						status: "unread",
						text: "hello world from voicemail body that is long enough",
						createdAt: "2026-07-23T00:00:00.000Z",
					},
				],
			},
		});
		const snap = projectMailboxSnapshot("demo-user", profile);
		expect(snap.hasUnread).toBe(true);
		expect(snap.slots).toHaveLength(1);
		expect(snap.slots[0]?.status).toBe("unread");
		expect(snap.slots[0]?.textPreview.length).toBeGreaterThan(0);
	});
});
