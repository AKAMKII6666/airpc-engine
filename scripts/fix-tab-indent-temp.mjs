/**
 * One-off: convert leading space indentation to tabs (2 spaces = 1 tab).
 * Handles mixed tab+space by visual width (tab = 2 spaces).
 */
import { readFileSync, writeFileSync } from "node:fs";

const TAB_WIDTH = 2;

const files = [
	"apps/studioV2/src/commonUiComponents/form/AutoForm/comsMap.ts",
	"apps/studioV2/src/commonUiComponents/form/AutoForm/index.tsx",
	"apps/studioV2/src/commonUiComponents/form/autoFormTypes.ts",
	"apps/studioV2/src/commonUiComponents/form/fields/FormAutoTextArea/index.tsx",
	"apps/studioV2/src/commonUiComponents/form/fields/FormCheckboxField/index.tsx",
	"apps/studioV2/src/commonUiComponents/form/fields/FormDateField/index.tsx",
	"apps/studioV2/src/commonUiComponents/form/fields/FormIntegerInput/index.tsx",
	"apps/studioV2/src/commonUiComponents/form/fields/FormSelectField/index.tsx",
	"apps/studioV2/src/commonUiComponents/form/fields/FormTextField/index.tsx",
	"apps/studioV2/src/commonUiComponents/form/fields/formBoundFieldProps.ts",
	"apps/studioV2/src/commonUiComponents/form/fields/types/formBoundTypes.ts",
];

function leadingWidth(leading) {
	let width = 0;
	for (const ch of leading) {
		if (ch === "\t") width += TAB_WIDTH;
		else if (ch === " ") width += 1;
	}
	return width;
}

function convertLine(line) {
	const m = line.match(/^(\s*)(.*)$/);
	if (!m) return line;
	const [, leading, rest] = m;
	if (!leading.includes(" ")) return line;
	const levels = Math.ceil(leadingWidth(leading) / TAB_WIDTH);
	return `${"\t".repeat(levels)}${rest}`;
}

for (const file of files) {
	const text = readFileSync(file, "utf8");
	const converted = text.split("\n").map(convertLine).join("\n");
	writeFileSync(file, converted);
	const bad = converted.split("\n").filter((l) => {
		const leading = l.match(/^\s*/)?.[0] ?? "";
		return leading.includes(" ");
	});
	console.log(`${file}: ${bad.length} lines still have spaces in leading indent`);
	if (bad.length > 0) {
		bad.slice(0, 3).forEach((l) => console.log("  ", JSON.stringify(l.slice(0, 50))));
	}
}
