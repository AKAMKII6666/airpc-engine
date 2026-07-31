/**
 * 测试用：从已迁移的 golden_handoff 章复制出独立 chapter_02 容器。
 */
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export async function cloneChapter02(dataRoot: string): Promise<void> {
	const srcChapter = path.join(
		dataRoot,
		"storis-packages/golden_handoff/chapters/golden_handoff",
	);
	const dstPkg = path.join(dataRoot, "storis-packages/chapter_02");
	const dstChapter = path.join(dstPkg, "chapters/chapter_02");
	await mkdir(path.dirname(dstChapter), { recursive: true });
	await cp(srcChapter, dstChapter, { recursive: true });

	await writeFile(
		path.join(dstPkg, "package.conf.json"),
		`${JSON.stringify(
			{
				schemaVersion: 1,
				packageId: "chapter_02",
				title: "Chapter 02",
				entryChapterId: "chapter_02",
				chapters: [{ chapterId: "chapter_02" }],
			},
			null,
			2,
		)}\n`,
	);

	const confPath = path.join(dstChapter, "story.conf.json");
	const conf = JSON.parse(await readFile(confPath, "utf8")) as {
		chapterId?: string;
		title?: string;
		entryCardId?: string;
	};
	conf.chapterId = "chapter_02";
	conf.title = "Chapter 02";
	conf.entryCardId = "xiaopi_waiting_user";
	await writeFile(confPath, `${JSON.stringify(conf, null, 2)}\n`);
}

/** 向 golden_handoff 章写入 playback_stub 卡并更新 conf 索引。 */
export async function seedPlaybackStubCard(dataRoot: string): Promise<string> {
	const cardId = "playback_stub";
	const cardsDir = path.join(
		dataRoot,
		"storis-packages/golden_handoff/chapters/golden_handoff/cards",
	);
	await writeFile(
		path.join(cardsDir, `${cardId}.s-card.json`),
		JSON.stringify(
			{
				cardId,
				cardKind: "story",
				title: "播放桩",
				ownerAgentId: "lanxing",
				entryMode: "outbound_auto",
				interactionMode: "hybrid",
				context: {
					playbackClipId: "clip_hello",
					privateBrief: "",
					speakableBrief: "播放中",
				},
				objectives: { requiredBeats: [] },
				toolPolicy: {
					mode: "allowlist",
					allowedToolIds: ["share_expert_number"],
				},
				exits: [
					{
						exitId: "play_done",
						exitKind: "terminal",
						title: "播完",
						priority: 100,
						condition: { op: "always" },
						effects: [],
					},
				],
			},
			null,
			2,
		),
		"utf8",
	);
	const confPath = path.join(
		dataRoot,
		"storis-packages/golden_handoff/chapters/golden_handoff/story.conf.json",
	);
	const conf = JSON.parse(await readFile(confPath, "utf8")) as {
		cards: Array<{ cardId: string }>;
	};
	conf.cards.push({ cardId });
	await writeFile(confPath, JSON.stringify(conf, null, 2) + "\n", "utf8");
	return cardId;
}
