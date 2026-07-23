/**
	* validate issue.path → 画布定位解析。
	*/
import { describe, expect, it } from "vitest";
import {
	callCardNodeIdFromCardId,
	parseValidationLocate,
} from "@studio-v2/src/bis/pageBis/storyEditor/package/validate/parseValidationLocate";

describe("parseValidationLocate", () => {
	it("extracts cardId from relative card path", () => {
		expect(
			parseValidationLocate("cards/lanxing_wrong_number.s-card.json"),
		).toEqual({ cardId: "lanxing_wrong_number" });
	});

	it("extracts cardId and exitId from exits fragment", () => {
		expect(
			parseValidationLocate(
				"cards/demo.s-card.json#exits.exit_ok.effects.e1",
			),
		).toEqual({ cardId: "demo", exitId: "exit_ok" });
	});

	it("accepts absolute-ish paths containing /cards/", () => {
		expect(
			parseValidationLocate(
				"/tmp/data/storis-packages/pkg/cards/abc.s-card.json#exits",
			),
		).toEqual({ cardId: "abc" });
	});

	it("returns empty for package-level paths", () => {
		expect(parseValidationLocate("story.conf.json#entryCardId")).toEqual(
			{},
		);
		expect(parseValidationLocate("characters/lanxing.json")).toEqual({});
	});

	it("maps cardId to canvas node id", () => {
		expect(callCardNodeIdFromCardId("lanxing_wrong_number")).toBe(
			"card_lanxing_wrong_number",
		);
	});
});
