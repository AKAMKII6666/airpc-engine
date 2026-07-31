/**
 * createStudioId 门禁冒烟：种类前缀 + 无连字符 UUID，不依赖 Host。
 */
import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
	createStudioId,
	newStudioUuidBody,
} from "@studio-v2/typeFiles/ids/createStudioId";

const ID_BODY = /^[a-f0-9]{32}$/;

describe("createStudioId", () => {
	it("生成带种类前缀的 uuid 体 id", () => {
		const id = createStudioId("package", "Demo Pack");
		assert.match(id, /^pkg_[a-f0-9]{32}$/);
		assert.notEqual(id, createStudioId("package", "Demo Pack"));
	});

	it("空 seed 仍可生成且互不相同", () => {
		const a = createStudioId("card");
		const b = createStudioId("card");
		assert.match(a, /^card_[a-f0-9]{32}$/);
		assert.match(b, /^card_[a-f0-9]{32}$/);
		assert.notEqual(a, b);
	});

	it("newStudioUuidBody 为 32 位 hex", () => {
		assert.match(newStudioUuidBody(), ID_BODY);
	});

	it("exit / effect 前缀与出口表单一致", () => {
		assert.match(createStudioId("exit"), /^exit_[a-f0-9]{32}$/);
		assert.match(createStudioId("effect"), /^fx_[a-f0-9]{32}$/);
		assert.match(createStudioId("scene"), /^scene_[a-f0-9]{32}$/);
	});
});
