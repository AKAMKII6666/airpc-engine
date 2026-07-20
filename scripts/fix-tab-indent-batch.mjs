/**
 * Fix STUDIO-STRUCT-017: leading whitespace must be tabs only (no spaces).
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
	let lead = m[1];
	let rest = m[2];
	if (lead.includes(" ")) {
		let width = 0;
		for (const ch of lead) width += ch === "\t" ? TAB_WIDTH : 1;
		lead = "\t".repeat(Math.ceil(width / TAB_WIDTH));
	}
	if (rest.startsWith(" *") || rest.startsWith(" */")) {
		rest = rest.replace(/^ /, "");
	}
	return lead + rest;
}

for (const file of files) {
	const text = readFileSync(file, "utf8");
	const lines = text.split("\n");
	const badBefore = [];
	for (let i = 0; i < lines.length; i++) {
		const leading = lines[i].match(/^\s*/)?.[0] ?? "";
		if (leading.includes(" ")) badBefore.push(i + 1);
	}
	const converted = lines.map(convertLine).join("\n");
	writeFileSync(file, converted);
	const badAfter = converted.split("\n").filter((l) => {
		const leading = l.match(/^\s*/)?.[0] ?? "";
		return leading.includes(" ");
	});
	console.log(`${file}: before=${badBefore.length} after=${badAfter.length}`);
	if (badBefore.length > 0) {
		console.log(`  lines: ${badBefore.join(", ")}`);
	}
	if (badAfter.length > 0) {
		badAfter.slice(0, 5).forEach((l) =>
			console.log(`  still bad: ${JSON.stringify(l.slice(0, 60))}`),
		);
	}
}
