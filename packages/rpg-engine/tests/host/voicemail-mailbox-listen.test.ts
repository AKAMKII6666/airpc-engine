/**
 * V2-VM-11 / FR-1–2：mailbox_open 听完路径
 */
import { rm } from "node:fs/promises";
import { afterEach, describe, it } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	runMailboxOpenListenPath,
	runUserDialRejectsBoardVoicemail,
} from "./voicemail-mailbox-listen.helpers.js";

const repoRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../../../..",
);
const dataSrc = path.join(repoRoot, "data");

describe("voicemail mailbox_open listen path", () => {
	let tmpRoot: string | undefined;

	afterEach(async () => {
		if (tmpRoot) {
			await rm(tmpRoot, { recursive: true, force: true });
			tmpRoot = undefined;
		}
	});

	it("mailbox_open → exits + slot listened + unread false", async () => {
		tmpRoot = await runMailboxOpenListenPath(dataSrc);
	});

	it("user_dial 不得接通 Board 上的 voicemail", async () => {
		tmpRoot = await runUserDialRejectsBoardVoicemail(dataSrc);
	});
});
