import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { countEffectiveLines } from "./check-studio-structure.mjs";

function countEffectiveLinesInRange(text, start, end) {
	return countEffectiveLines(text.slice(start, end));
}

const require = createRequire(import.meta.url);
const ts = require("typescript");

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const targets = [
	{
		file: "apps/studioV2/src/pageComponents/storyEditor/StoryEditorShell.tsx",
		name: "StoryEditorShell",
	},
	{
		file: "apps/studioV2/src/pageComponents/storyEditor/canvas/useStoryCanvasGraph.ts",
		name: "useStoryCanvasGraph",
	},
];

function functionDisplayName(node) {
	if (
		(ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) &&
		node.name &&
		ts.isIdentifier(node.name)
	) {
		return node.name.text;
	}
	if (ts.isVariableDeclaration(node.parent) && ts.isIdentifier(node.parent.name)) {
		return node.parent.name.text;
	}
	return "<anonymous>";
}

function isFunctionLike(node) {
	return (
		ts.isFunctionDeclaration(node) ||
		ts.isMethodDeclaration(node) ||
		ts.isFunctionExpression(node) ||
		ts.isArrowFunction(node) ||
		ts.isConstructorDeclaration(node) ||
		ts.isGetAccessorDeclaration(node) ||
		ts.isSetAccessorDeclaration(node)
	);
}

for (const target of targets) {
	const abs = path.join(repoRoot, target.file);
	const text = readFileSync(abs, "utf8");
	const sf = ts.createSourceFile(
		abs,
		text,
		ts.ScriptTarget.Latest,
		true,
		abs.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
	);
	const visit = (node) => {
		if (isFunctionLike(node) && node.body) {
			const name = functionDisplayName(node);
			if (name === target.name) {
				const bodyStart = node.body.getStart(sf);
				const bodyEnd = node.body.getEnd();
				const fnLines = countEffectiveLinesInRange(text, bodyStart, bodyEnd);
				const { line, character } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
				console.log(
					JSON.stringify({
						name,
						file: target.file,
						line: line + 1,
						column: character + 1,
						fnLines,
						bodyStart,
						bodyEnd,
					}),
				);
			}
		}
		ts.forEachChild(node, visit);
	};
	visit(sf);
}
