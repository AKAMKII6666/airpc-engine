/**
	* characters shell 加载映射：Def 列表 → CharactersLoadResult。
	*/
import { describe, expect, it } from "vitest";
import { toCharactersLoadResult } from "@studio-v2/src/bis/shellBis/characters/characters.shell.bis";
import type { CharacterDef } from "@studio-v2/typeFiles/library/characters/engineCharacterDef";

function minimalDef(agentId: string): CharacterDef {
	return {
		agentId,
		displayName: agentId,
	};
}

describe("toCharactersLoadResult", () => {
	it("映射为 ok 列表投影", function () {
		const result = toCharactersLoadResult([minimalDef("agent_1")]);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.characters).toHaveLength(1);
		expect(result.characters[0]?.agentId).toBe("agent_1");
	});
});
