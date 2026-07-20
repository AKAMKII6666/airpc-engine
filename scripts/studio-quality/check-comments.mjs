/**
 * Studio V2 注释门禁（TypeScript AST，非纯正则）。
 *
 * 输出格式：规则编号  文件:行:列  问题说明  修复建议
 * 退出码：有违规非 0。
 *
 * 用法：
 *   node scripts/studio-quality/check-comments.mjs
 *   node scripts/studio-quality/check-comments.mjs --root <studioRoot>
 *   node scripts/studio-quality/check-comments.mjs --self-test
 */
import { createRequire } from "node:module";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

const RULE = {
  MISSING_EXPORT_DOC: "STUDIO-COMMENT-001",
  MISSING_FIELD_DOC: "STUDIO-COMMENT-002",
  SUPPRESS_NO_REASON: "STUDIO-COMMENT-003",
  PLACEHOLDER_COMMENT: "STUDIO-COMMENT-004",
};

/** @typedef {{ ruleId: string, file: string, line: number, column: number, message: string, suggestion: string }} Violation */

/**
 * @param {string} dir
 * @param {Set<string>} excludeDirNames
 * @returns {Promise<string[]>}
 */
async function walkTsFiles(dir, excludeDirNames) {
  const out = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (excludeDirNames.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walkTsFiles(full, excludeDirNames)));
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
      out.push(full);
    }
  }
  return out;
}

/**
 * @param {string} commentText
 */
function normalizeCommentBody(commentText) {
  return commentText
    .replace(/^\/\*+/, "")
    .replace(/\*+\/$/, "")
    .replace(/^\/\//, "")
    .replace(/^\s*\*\s?/gm, "")
    .trim();
}

/**
 * 复述声明名 / 空壳 / 统一占位词视为无效意图注释。
 * @param {string} body
 * @param {string} [declName]
 */
function isPlaceholderOrRestatement(body, declName) {
  const cleaned = body.replace(/\s+/g, " ").trim();
  if (cleaned.length === 0) return true;
  const lower = cleaned.toLowerCase();
  const placeholders = [
    "todo",
    "fixme",
    "placeholder",
    "占位",
    "说明一下",
    "待补充",
    "xxx",
  ];
  if (placeholders.some((p) => lower === p || lower.startsWith(`${p} `))) {
    return true;
  }
  if (!declName) return false;
  const name = declName.toLowerCase();
  const compact = lower.replace(/[^a-z0-9_\u4e00-\u9fff]/gi, "");
  const nameCompact = name.replace(/[^a-z0-9_]/gi, "");
  if (compact === nameCompact) return true;
  if (compact === `${nameCompact}函数` || compact === `${nameCompact}类型`) {
    return true;
  }
  if (
    compact === `the${nameCompact}` ||
    compact === `${nameCompact}function` ||
    compact === `${nameCompact}type` ||
    compact === `${nameCompact}interface`
  ) {
    return true;
  }
  return false;
}

/**
 * @param {import('typescript').SourceFile} sf
 * @param {import('typescript').Node} node
 */
function getLeadingCommentBodies(sf, node) {
  const text = sf.getFullText();
  /** node.pos 含 leading trivia；由此取声明前注释 */
  const ranges = ts.getLeadingCommentRanges(text, node.pos) ?? [];
  const fromRanges = ranges.map((r) => ({
    kind: r.kind,
    pos: r.pos,
    end: r.end,
    body: normalizeCommentBody(text.slice(r.pos, r.end)),
    raw: text.slice(r.pos, r.end),
  }));
  /** TS 挂载的 JSDoc 节点（部分场景比 trivia 范围更稳） */
  const fromJsDoc = ts
    .getJSDocCommentsAndTags(node)
    .filter(ts.isJSDoc)
    .map((j) => ({
      kind: ts.SyntaxKind.MultiLineCommentTrivia,
      pos: j.getStart(sf),
      end: j.getEnd(),
      body: normalizeCommentBody(j.getText(sf)),
      raw: j.getText(sf),
    }));
  const seen = new Set(fromRanges.map((c) => `${c.pos}:${c.end}`));
  for (const c of fromJsDoc) {
    const key = `${c.pos}:${c.end}`;
    if (!seen.has(key)) fromRanges.push(c);
  }
  return fromRanges;
}

/**
 * @param {import('typescript').Node} node
 */
function getExportName(node) {
  if (
    ts.isFunctionDeclaration(node) ||
    ts.isClassDeclaration(node) ||
    ts.isInterfaceDeclaration(node) ||
    ts.isTypeAliasDeclaration(node) ||
    ts.isEnumDeclaration(node)
  ) {
    return node.name?.getText() ?? null;
  }
  if (ts.isVariableStatement(node)) {
    const decl = node.declarationList.declarations[0];
    if (decl && ts.isIdentifier(decl.name)) return decl.name.text;
  }
  return null;
}

/**
 * @param {import('typescript').Node} node
 */
function isExported(node) {
  if (ts.canHaveModifiers(node)) {
    const mods = ts.getModifiers(node);
    if (mods?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) return true;
  }
  if (ts.isVariableStatement(node)) {
    return Boolean(
      node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword),
    );
  }
  return false;
}

/**
 * @param {string} relFile
 * @param {string[]} strictDirs relative to studio root, e.g. ["domain","commands"]
 * @param {string} studioRootAbs
 */
function isInStrictContract(relFile, strictDirs, studioRootAbs) {
  const abs = path.resolve(studioRootAbs, relFile);
  const norm = abs.split(path.sep).join("/");
  return strictDirs.some((dir) => {
    const marker = `/${dir}/`;
    return norm.includes(marker) || norm.endsWith(`/${dir}`);
  });
}

/**
 * 抑制指令是否带有效原因。调用方已判定 isSuppress 时，无原因必须返回 false。
 * 不得用「是否含原因标记」反推是否为 suppress——裸 eslint-disable 无标记也会漏检。
 * @param {string} body
 * @param {string} raw
 */
function suppressHasReason(body, raw) {
  const isSuppress =
    /eslint-disable(?:-next-line|-line)?/i.test(raw) ||
    /@ts-(?:ignore|expect-error|nocheck)\b/.test(raw) ||
    /eslint-disable(?:-next-line|-line)?/i.test(body) ||
    /@ts-(?:ignore|expect-error|nocheck)\b/.test(body);
  if (!isSuppress) return true;

  const stripped = raw
    .replace(/^\/\*+/, "")
    .replace(/\*+\/$/, "")
    .replace(/^\/\//, "")
    .trim();

  // 显式原因分隔：-- / 原因: / reason: / because
  const marker = /(?:\s+--\s+|\s+原因[:：]\s*|\s+reason[:：]\s*|\s+because\b\s+)/i;
  const markerMatch = stripped.match(marker);
  if (markerMatch && markerMatch.index != null) {
    const afterMarker = stripped
      .slice(markerMatch.index + markerMatch[0].length)
      .trim();
    return afterMarker.length >= 4;
  }

  // 无分隔符：去掉指令与规则名列表，残留必须是散文原因（规则 id 不算）
  const after = stripped
    .replace(
      /^(?:eslint-disable(?:-next-line|-line)?|@ts-(?:ignore|expect-error|nocheck))\s*/i,
      "",
    )
    .replace(/^[a-z0-9@/\-_.]+(?:\s*,\s*[a-z0-9@/\-_.]+)*\s*/i, "")
    .replace(/^[:：\-–—]+\s*/, "")
    .trim();

  if (after.length < 4) return false;
  if (/^[a-z0-9@/\-_,.\s]+$/i.test(after)) {
    const tokens = after.split(/[\s,]+/).filter(Boolean);
    if (tokens.every((t) => /^[a-z0-9@/\-_.]+$/i.test(t))) return false;
  }
  return true;
}

/**
 * @param {string} filePath
 * @param {string} sourceText
 * @param {{ studioRootAbs: string, strictDirs: string[], repoRoot: string }} ctx
 * @returns {Violation[]}
 */
function analyzeFile(filePath, sourceText, ctx) {
  const sf = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const rel = path.relative(ctx.repoRoot, filePath).split(path.sep).join("/");
  const strict = isInStrictContract(
    path.relative(ctx.studioRootAbs, filePath),
    ctx.strictDirs,
    ctx.studioRootAbs,
  );
  /** @type {Violation[]} */
  const violations = [];

  const push = (ruleId, nodeOrPos, message, suggestion) => {
    const pos =
      typeof nodeOrPos === "number" ? nodeOrPos : nodeOrPos.getStart(sf);
    const { line, character } = sf.getLineAndCharacterOfPosition(pos);
    violations.push({
      ruleId,
      file: rel,
      line: line + 1,
      column: character + 1,
      message,
      suggestion,
    });
  };

  // 全文件注释：抑制指令 + 占位检测（对绑定到声明的再验）
  const allComments = [
    ...(ts.getLeadingCommentRanges(sourceText, 0) ?? []),
  ];
  // walk trivia via scanner-like: collect every comment range on full text
  const collected = new Set();
  const collectCommentsOnNode = (node) => {
    for (const r of ts.getLeadingCommentRanges(sourceText, node.pos) ?? []) {
      const key = `${r.pos}:${r.end}`;
      if (collected.has(key)) continue;
      collected.add(key);
      allComments.push(r);
    }
    for (const r of ts.getTrailingCommentRanges(sourceText, node.end) ?? []) {
      const key = `${r.pos}:${r.end}`;
      if (collected.has(key)) continue;
      collected.add(key);
      allComments.push(r);
    }
    ts.forEachChild(node, collectCommentsOnNode);
  };
  collectCommentsOnNode(sf);

  for (const r of allComments) {
    const raw = sourceText.slice(r.pos, r.end);
    const body = normalizeCommentBody(raw);
    const isSuppress =
      /eslint-disable(?:-next-line|-line)?/i.test(raw) ||
      /@ts-(?:ignore|expect-error|nocheck)\b/.test(raw);
    if (isSuppress && !suppressHasReason(body, raw)) {
      push(
        RULE.SUPPRESS_NO_REASON,
        r.pos,
        "抑制指令缺少就近原因说明",
        "在 eslint-disable / @ts-expect-error 后写明原因；临时项还须写退出条件",
      );
    }
  }

  if (!strict) {
    return violations;
  }

  const visit = (node) => {
    if (isExported(node)) {
      const name = getExportName(node) ?? "(anonymous)";
      const leading = getLeadingCommentBodies(sf, node);
      const meaningful = leading.filter((c) => {
        const isSuppress =
          /eslint-disable/i.test(c.raw) || /@ts-/.test(c.raw);
        return !isSuppress;
      });

      if (meaningful.length === 0) {
        push(
          RULE.MISSING_EXPORT_DOC,
          node,
          `严格契约目录中的导出「${name}」缺少意图注释或 JSDoc`,
          "在声明上方补充说明为什么存在、约束或副作用",
        );
      } else {
        for (const c of meaningful) {
          if (isPlaceholderOrRestatement(c.body, name)) {
            push(
              RULE.PLACEHOLDER_COMMENT,
              c.pos,
              `导出「${name}」的注释为复述/占位，不构成有效意图说明`,
              "改写为意图、约束、时序、所有权或副作用说明，禁止只重复声明名",
            );
          }
        }
      }

      // 字段级：导出 interface / type literal
      if (ts.isInterfaceDeclaration(node)) {
        for (const member of node.members) {
          if (!ts.isPropertySignature(member) || !member.name) continue;
          const fieldName = member.name.getText(sf);
          const fieldLeading = getLeadingCommentBodies(sf, member);
          const jsdocs = ts.getJSDocCommentsAndTags(member);
          const hasJsDoc = jsdocs.length > 0;
          const hasLine = fieldLeading.some((c) => c.body.length > 0);
          if (!hasJsDoc && !hasLine) {
            push(
              RULE.MISSING_FIELD_DOC,
              member,
              `严格契约字段「${name}.${fieldName}」缺少字段级说明`,
              "补充单位、可空语义、所有权、持久化或生命周期说明",
            );
          } else {
            const bodies = [
              ...fieldLeading.map((c) => c.body),
              ...jsdocs
                .filter(ts.isJSDoc)
                .map((j) => normalizeCommentBody(j.getText(sf))),
            ];
            for (const b of bodies) {
              if (isPlaceholderOrRestatement(b, fieldName)) {
                push(
                  RULE.PLACEHOLDER_COMMENT,
                  member,
                  `字段「${name}.${fieldName}」注释为复述/占位`,
                  "写明单位、时序、所有权或可空语义，勿只重复字段名",
                );
              }
            }
          }
        }
      }

      if (ts.isTypeAliasDeclaration(node) && ts.isTypeLiteralNode(node.type)) {
        for (const member of node.type.members) {
          if (!ts.isPropertySignature(member) || !member.name) continue;
          const fieldName = member.name.getText(sf);
          const fieldLeading = getLeadingCommentBodies(sf, member);
          const jsdocs = ts.getJSDocCommentsAndTags(member);
          if (fieldLeading.length === 0 && jsdocs.length === 0) {
            push(
              RULE.MISSING_FIELD_DOC,
              member,
              `严格契约字段「${name}.${fieldName}」缺少字段级说明`,
              "补充单位、可空语义、所有权、持久化或生命周期说明",
            );
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sf);
  return violations;
}

/**
 * @param {{ studioRoot?: string, configPath?: string }} opts
 */
export async function runCommentGate(opts = {}) {
  const configPath =
    opts.configPath ??
    path.join(__dirname, "comment-gate-config.json");
  const config = JSON.parse(await readFile(configPath, "utf8"));
  const studioRootAbs = path.resolve(
    repoRoot,
    opts.studioRoot ?? config.studioRoot,
  );
  const excludeDirNames = new Set(config.excludeDirNames ?? []);
  const files = await walkTsFiles(studioRootAbs, excludeDirNames);
  /** @type {Violation[]} */
  const all = [];
  for (const file of files) {
    const text = await readFile(file, "utf8");
    all.push(
      ...analyzeFile(file, text, {
        studioRootAbs,
        strictDirs: config.strictContractDirs ?? [],
        repoRoot,
      }),
    );
  }
  return { violations: all, filesChecked: files.length, studioRootAbs };
}

/**
 * @param {Violation} v
 */
export function formatViolation(v) {
  return `${v.ruleId}  ${v.file}:${v.line}:${v.column}  ${v.message}  ${v.suggestion}`;
}

async function runSelfTest() {
  const fixturesRoot = path.join(__dirname, "tests", "fixtures", "comments");
  const cases = [
    {
      name: "pass-contract",
      expectFail: false,
    },
    {
      name: "fail-missing-export-doc",
      expectFail: true,
      rule: RULE.MISSING_EXPORT_DOC,
    },
    {
      name: "fail-missing-field-doc",
      expectFail: true,
      rule: RULE.MISSING_FIELD_DOC,
    },
    {
      name: "fail-placeholder-comment",
      expectFail: true,
      rule: RULE.PLACEHOLDER_COMMENT,
    },
    {
      name: "fail-suppress-no-reason",
      expectFail: true,
      rule: RULE.SUPPRESS_NO_REASON,
    },
    {
      name: "pass-suppress-with-reason",
      expectFail: false,
    },
  ];

  let failed = 0;
  for (const c of cases) {
    const dir = path.join(fixturesRoot, c.name);
    const result = await runCommentGate({
      studioRoot: path.relative(repoRoot, dir),
      configPath: path.join(dir, "comment-gate-config.json"),
    });
    const hasRule = c.rule
      ? result.violations.some((v) => v.ruleId === c.rule)
      : result.violations.length > 0;
    const ok = c.expectFail ? hasRule : result.violations.length === 0;
    if (!ok) {
      failed += 1;
      console.error(
        `SELF-TEST FAIL ${c.name}: expectFail=${c.expectFail}, violations=${result.violations.length}`,
      );
      for (const v of result.violations) console.error("  ", formatViolation(v));
    } else {
      console.log(`SELF-TEST PASS ${c.name}`);
    }
  }
  if (failed > 0) {
    process.exitCode = 1;
    console.error(`check:comments self-test failed (${failed})`);
  } else {
    console.log("check:comments self-test ok");
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--self-test")) {
    await runSelfTest();
    return;
  }
  const rootIdx = args.indexOf("--root");
  const studioRoot =
    rootIdx >= 0 && args[rootIdx + 1] ? args[rootIdx + 1] : undefined;
  const { violations, filesChecked } = await runCommentGate({ studioRoot });
  if (violations.length > 0) {
    for (const v of violations) {
      console.error(formatViolation(v));
    }
    console.error(
      `check:comments failed (${violations.length} issues, ${filesChecked} files)`,
    );
    process.exitCode = 1;
    return;
  }
  console.log(`check:comments ok (${filesChecked} files)`);
}

const isDirect =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirect) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
