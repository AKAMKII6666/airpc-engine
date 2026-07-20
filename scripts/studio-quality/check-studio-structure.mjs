/**
 * Studio V2 结构门禁：文件/函数行数、圈复杂度、page 阈值、依赖边界、平放测试、目录聚类。
 *
 * 输出格式：规则编号  文件:行:列  问题说明  修复建议
 * 硬上限与边界违规 → 非零退出；告警线仅打印不阻断。
 *
 * 用法：
 *   node scripts/studio-quality/check-studio-structure.mjs
 *   node scripts/studio-quality/check-studio-structure.mjs --root <studioRoot>
 *   node scripts/studio-quality/check-studio-structure.mjs --json
 */
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureModalNestedLayout } from "./ensure-modal-layout.mjs";
import { ensureMigratedLayout } from "./ensure-migrated-layout.mjs";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

const RULE = {
  FILE_LINES: "STUDIO-STRUCT-001",
  FN_LINES: "STUDIO-STRUCT-002",
  COMPLEXITY: "STUDIO-STRUCT-003",
  PAGE_LINES: "STUDIO-STRUCT-004",
  ENGINE_WRITE: "STUDIO-STRUCT-005",
  DEEP_ENGINE: "STUDIO-STRUCT-006",
  COLOCATED_TEST: "STUDIO-STRUCT-007",
  CLUSTER: "STUDIO-STRUCT-008",
  BARREL: "STUDIO-STRUCT-009",
  BARE_FETCH: "STUDIO-STRUCT-010",
  ALLOWLIST: "STUDIO-STRUCT-011",
  LEGACY_ROOT: "STUDIO-STRUCT-012",
  COMPAT_FORWARD: "STUDIO-STRUCT-013",
  DUPLICATE_ENTRY: "STUDIO-STRUCT-014",
  INDEX_ENTRY: "STUDIO-STRUCT-015",
  COMMON_UI_LAYOUT: "STUDIO-STRUCT-016",
  TAB_INDENT: "STUDIO-STRUCT-017",
  JSX_COMPONENT_COMMENT: "STUDIO-STRUCT-018",
  COMPONENT_PROPS_DESTRUCTURE: "STUDIO-STRUCT-019",
};

/** @typedef {{ ruleId: string, file: string, line: number, column: number, message: string, suggestion: string, severity?: "error"|"warn" }} Violation */

/**
 * @param {string} dir
 * @param {Set<string>} excludeDirNames
 * @returns {Promise<string[]>}
 */
async function walkTsFiles(dir, excludeDirNames) {
  const out = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
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
 * @param {string} dir
 * @param {Set<string>} excludeDirNames
 * @returns {Promise<string[]>}
 */
async function walkStudioCodeFiles(dir, excludeDirNames) {
  const out = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (excludeDirNames.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walkStudioCodeFiles(full, excludeDirNames)));
      continue;
    }
    if (/\.(ts|tsx|scss)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
      out.push(full);
    }
  }
  return out;
}

/**
 * @param {string} text
 */
function sha1(text) {
  return createHash("sha1").update(text).digest("hex");
}

/**
 * 有效行：非空行（含注释）；空行不计。
 * @param {string} text
 */
export function countEffectiveLines(text) {
  return text.split(/\r?\n/).filter((l) => l.trim().length > 0).length;
}

/**
 * @param {string} text
 * @param {number} start
 * @param {number} end
 */
function countEffectiveLinesInRange(text, start, end) {
  return countEffectiveLines(text.slice(start, end));
}

/**
 * @param {string} relPosix
 */
export function classifyFileKind(relPosix) {
  const base = path.posix.basename(relPosix);
  if (base === "page.tsx") return "page";
  if (
    /(^|\/)(commands|store|services)\//.test(relPosix) ||
    /^use[A-Z]/.test(base.replace(/\.(ts|tsx)$/, ""))
  ) {
    return "hookOrCommand";
  }
  if (
    (relPosix.includes("/features/") ||
      relPosix.includes("/src/pageComponents/")) &&
    /\.tsx$/.test(base)
  ) {
    return "uiComponent";
  }
  return "other";
}

/**
 * @param {import('typescript').Node} node
 */
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

/**
 * McCabe 近似：分支 +1（if/for/while/case/catch/?:/&&/||/??）。
 * @param {import('typescript').Node} root
 */
export function computeCyclomaticComplexity(root) {
  let complexity = 1;
  const visit = (node) => {
    if (
      ts.isIfStatement(node) ||
      ts.isForStatement(node) ||
      ts.isForInStatement(node) ||
      ts.isForOfStatement(node) ||
      ts.isWhileStatement(node) ||
      ts.isDoStatement(node) ||
      ts.isCatchClause(node) ||
      ts.isConditionalExpression(node) ||
      ts.isCaseClause(node)
    ) {
      complexity += 1;
    } else if (ts.isBinaryExpression(node)) {
      const k = node.operatorToken.kind;
      if (
        k === ts.SyntaxKind.AmpersandAmpersandToken ||
        k === ts.SyntaxKind.BarBarToken ||
        k === ts.SyntaxKind.QuestionQuestionToken
      ) {
        complexity += 1;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(root);
  return complexity;
}

/**
 * @param {import('typescript').Node} node
 */
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

/**
 * @param {string} fileAbs
 * @param {string} text
 * @param {object} ctx
 * @returns {Violation[]}
 */
function analyzeSizeAndComplexity(fileAbs, text, ctx) {
  /** @type {Violation[]} */
  const violations = [];
  const rel = path.relative(ctx.repoRoot, fileAbs).split(path.sep).join("/");
  const kind = classifyFileKind(rel);
  const thresholds = ctx.config.thresholds;
  const fileThresh =
    kind === "page"
      ? thresholds.page
      : kind === "uiComponent"
        ? thresholds.uiComponent
        : kind === "hookOrCommand"
          ? thresholds.hookOrCommand
          : thresholds.other;
  const lines = countEffectiveLines(text);
  const ruleId = kind === "page" ? RULE.PAGE_LINES : RULE.FILE_LINES;

  if (lines > fileThresh.hardLines) {
    if (!isAllowlisted(ctx, ruleId, rel)) {
      violations.push({
        ruleId,
        file: rel,
        line: 1,
        column: 1,
        severity: "error",
        message: `${kind} 有效行数 ${lines} 超过硬上限 ${fileThresh.hardLines}`,
        suggestion: "按职责拆出 feature / 纯函数 / 子组件，禁止压空行或删注释凑行数",
      });
    }
  } else if (lines > fileThresh.warnLines) {
    violations.push({
      ruleId,
      file: rel,
      line: 1,
      column: 1,
      severity: "warn",
      message: `${kind} 有效行数 ${lines} 超过告警线 ${fileThresh.warnLines}`,
      suggestion: "尽快拆分，避免逼近硬上限",
    });
  }

  const sf = ts.createSourceFile(
    fileAbs,
    text,
    ts.ScriptTarget.Latest,
    true,
    fileAbs.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  const visit = (node) => {
    if (isFunctionLike(node) && node.body) {
      const name = functionDisplayName(node);
      const bodyStart = node.body.getStart(sf);
      const bodyEnd = node.body.getEnd();
      const fnLines = countEffectiveLinesInRange(text, bodyStart, bodyEnd);
      const complexity = computeCyclomaticComplexity(node);
      const { line, character } = sf.getLineAndCharacterOfPosition(node.getStart(sf));

      if (fnLines > thresholds.function.hardLines) {
        if (!isAllowlisted(ctx, RULE.FN_LINES, rel, name)) {
          violations.push({
            ruleId: RULE.FN_LINES,
            file: rel,
            line: line + 1,
            column: character + 1,
            severity: "error",
            message: `函数 ${name} 有效行数 ${fnLines} 超过硬上限 ${thresholds.function.hardLines}`,
            suggestion: "拆出步骤函数、命令对象或纯计算",
          });
        }
      } else if (fnLines > thresholds.function.warnLines) {
        violations.push({
          ruleId: RULE.FN_LINES,
          file: rel,
          line: line + 1,
          column: character + 1,
          severity: "warn",
          message: `函数 ${name} 有效行数 ${fnLines} 超过告警线 ${thresholds.function.warnLines}`,
          suggestion: "考虑拆分以保持可测性",
        });
      }

      if (complexity > thresholds.complexity.hard) {
        if (!isAllowlisted(ctx, RULE.COMPLEXITY, rel, name)) {
          violations.push({
            ruleId: RULE.COMPLEXITY,
            file: rel,
            line: line + 1,
            column: character + 1,
            severity: "error",
            message: `函数 ${name} 圈复杂度 ${complexity} 超过硬上限 ${thresholds.complexity.hard}`,
            suggestion: "用查表、状态机或早返回降低分支",
          });
        }
      } else if (complexity > thresholds.complexity.warn) {
        violations.push({
          ruleId: RULE.COMPLEXITY,
          file: rel,
          line: line + 1,
          column: character + 1,
          severity: "warn",
          message: `函数 ${name} 圈复杂度 ${complexity} 超过告警线 ${thresholds.complexity.warn}`,
          suggestion: "重构条件分支，避免继续堆叠",
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return violations;
}

/**
 * @param {string} fileAbs
 * @param {string} text
 * @param {object} ctx
 */
function analyzeDependencies(fileAbs, text, ctx) {
  /** @type {Violation[]} */
  const violations = [];
  const rel = path.relative(ctx.repoRoot, fileAbs).split(path.sep).join("/");
  const isClient =
    /^\s*["']use client["']/.test(text) ||
    /(^|\/)features\//.test(rel) ||
    /(^|\/)store\//.test(rel);

  const sf = ts.createSourceFile(
    fileAbs,
    text,
    ts.ScriptTarget.Latest,
    true,
    fileAbs.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  const bannedSymbols = new Set(ctx.config.bannedClientEngineWriteSymbols ?? []);
  const bannedPatterns = ctx.config.bannedImportPatterns ?? [];

  for (const stmt of sf.statements) {
    if (!ts.isImportDeclaration(stmt) || !ts.isStringLiteral(stmt.moduleSpecifier)) {
      continue;
    }
    const spec = stmt.moduleSpecifier.text;
    const { line, character } = sf.getLineAndCharacterOfPosition(stmt.getStart(sf));

    for (const pat of bannedPatterns) {
      if (spec.includes(pat) || spec.startsWith(pat)) {
        if (!isAllowlisted(ctx, RULE.DEEP_ENGINE, rel)) {
          violations.push({
            ruleId: RULE.DEEP_ENGINE,
            file: rel,
            line: line + 1,
            column: character + 1,
            severity: "error",
            message: `禁止深挖引擎内部路径：${spec}`,
            suggestion: "仅允许 import from \"@airpc/rpg-engine\" 门面，且 client 禁写口",
          });
        }
      }
    }

    if (!isClient) continue;

    const clause = stmt.importClause;
    if (!clause) continue;
    /** @type {string[]} */
    const names = [];
    if (clause.name) names.push(clause.name.text);
    if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
      for (const el of clause.namedBindings.elements) {
        names.push(el.propertyName?.text ?? el.name.text);
      }
    }
    if (
      (spec === "@airpc/rpg-engine" || spec.startsWith("@airpc/rpg-engine/")) &&
      names.some((n) => bannedSymbols.has(n))
    ) {
      const hit = names.filter((n) => bannedSymbols.has(n)).join(", ");
      if (!isAllowlisted(ctx, RULE.ENGINE_WRITE, rel)) {
        violations.push({
          ruleId: RULE.ENGINE_WRITE,
          file: rel,
          line: line + 1,
          column: character + 1,
          severity: "error",
          message: `client 侧禁止导入引擎写口：${hit}`,
          suggestion: "写口仅经 Next API 门面；client 只请求与展示",
        });
      }
    }
  }

  // 展示组件裸 fetch：features 下 tsx 且含 fetch( 调用
  if (
    isClient &&
    rel.includes("/features/") &&
    /\.tsx$/.test(rel) &&
    /\bfetch\s*\(/.test(text)
  ) {
    if (!isAllowlisted(ctx, RULE.BARE_FETCH, rel)) {
      violations.push({
        ruleId: RULE.BARE_FETCH,
        file: rel,
        line: 1,
        column: 1,
        severity: "error",
        message: "UI 组件内发现裸 fetch；请求应落在 services / shell 层",
        suggestion: "把网络编排移出展示组件",
      });
    }
  }

  return violations;
}

/**
 * @param {string} studioRootAbs
 * @param {object} ctx
 */
async function analyzeColocatedTestsAndBarrels(studioRootAbs, ctx) {
  /** @type {Violation[]} */
  const violations = [];
  const exclude = new Set(ctx.config.excludeDirNames ?? []);

  const walk = async (dir) => {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    const files = entries.filter((e) => e.isFile()).map((e) => e.name);
    for (const name of files) {
      const full = path.join(dir, name);
      const rel = path.relative(ctx.repoRoot, full).split(path.sep).join("/");
      // 相对 studio 根判断：walk 已跳过名为 tests 的目录；不得用仓库绝对/相对路径
      // 含 "/tests/" 误放行（夹具自身常落在 scripts/.../tests/fixtures/ 下）。
      const relToStudio = path
        .relative(studioRootAbs, full)
        .split(path.sep)
        .join("/");
      const underStudioTests =
        relToStudio === "tests" ||
        relToStudio.startsWith("tests/") ||
        /(^|\/)tests\//.test(relToStudio);
      if (/\.(test|spec)\.(ts|tsx)$/.test(name) && !underStudioTests) {
        if (!isAllowlisted(ctx, RULE.COLOCATED_TEST, rel)) {
          violations.push({
            ruleId: RULE.COLOCATED_TEST,
            file: rel,
            line: 1,
            column: 1,
            severity: "error",
            message: "测试文件不得与业务源码平放",
            suggestion: "移至 apps/studioV2/tests/ 按模块分子目录",
          });
        }
      }
      if (name === "index.ts" || name === "index.tsx") {
        const relToStudio = path
          .relative(studioRootAbs, full)
          .split(path.sep)
          .join("/");
        const parentName = path.posix.basename(path.posix.dirname(relToStudio));
        const allowedPageIndex =
          name === "index.tsx" &&
          relToStudio.startsWith(
            ctx.config.allowedPageComponentIndexPattern ??
              "src/pageComponents/",
          ) &&
          relToStudio.split("/").length === 3;
        const allowedCommonUiComponentIndex =
          name === "index.tsx" &&
          relToStudio.startsWith("src/commonUiComponents/") &&
          /^[A-Z][A-Za-z0-9]*$/.test(parentName);
        // app/ 路由段允许；src/pageComponents/<page>/index.tsx 是页面主组件；其余禁 barrel
        if (
          !rel.includes("/app/") &&
          !allowedPageIndex &&
          !allowedCommonUiComponentIndex
        ) {
          if (!isAllowlisted(ctx, RULE.BARREL, rel)) {
            violations.push({
              ruleId: RULE.BARREL,
              file: rel,
              line: 1,
              column: 1,
              severity: "error",
              message: "Studio V2 禁止 barrel index.ts",
              suggestion: "改为直引具体文件路径",
            });
          }
        }
      }
    }
    for (const entry of entries) {
      if (!entry.isDirectory() || exclude.has(entry.name)) continue;
      await walk(path.join(dir, entry.name));
    }
  };

  await walk(studioRootAbs);
  return violations;
}

/**
 * Studio V2 目录落点硬规则：禁止旧顶层业务目录、兼容转发壳和同名重复入口。
 * @param {string} studioRootAbs
 * @param {object} ctx
 */
async function analyzeStudioV2Layout(studioRootAbs, ctx) {
  /** @type {Violation[]} */
  const violations = [];
  const exclude = new Set(ctx.config.excludeDirNames ?? []);
  const allowedRoots = new Set(
    ctx.config.allowedBusinessRootDirs ?? [
      "app",
      "src",
      "typeFiles",
      "tests",
      "public",
      "scripts",
    ],
  );
  const legacyRoots = new Set(
    ctx.config.legacyBusinessRootDirs ?? [
      "features",
      "domain",
      "services",
      "commands",
      "store",
    ],
  );

  let rootEntries = [];
  try {
    rootEntries = await readdir(studioRootAbs, { withFileTypes: true });
  } catch {
    return violations;
  }

  for (const entry of rootEntries) {
    if (!entry.isDirectory()) continue;
    if (exclude.has(entry.name)) continue;
    if (legacyRoots.has(entry.name) || !allowedRoots.has(entry.name)) {
      const rel = path
        .relative(ctx.repoRoot, path.join(studioRootAbs, entry.name))
        .split(path.sep)
        .join("/");
      violations.push({
        ruleId: RULE.LEGACY_ROOT,
        file: rel,
        line: 1,
        column: 1,
        severity: "error",
        message: `Studio V2 禁止旧式或未登记顶层业务目录：${entry.name}`,
        suggestion:
          "按 09 目录规则迁入 app/src/typeFiles/tests；不要保留旧目录兼容期",
      });
    }
  }

  const files = await walkTsFiles(studioRootAbs, exclude);
  const seenBySemanticPath = new Map();
  for (const file of files) {
    const text = await readFile(file, "utf8");
    const rel = path.relative(ctx.repoRoot, file).split(path.sep).join("/");
    const relToStudio = path.relative(studioRootAbs, file).split(path.sep).join("/");
    const base = path.posix.basename(relToStudio);

    if (
      /@deprecated\s+.*(?:已迁至|迁至)|兼容转发|兼容路径|re-export/i.test(text) &&
      /export\s+(?:type\s+)?(?:\{|\*)/.test(text)
    ) {
      violations.push({
        ruleId: RULE.COMPAT_FORWARD,
        file: rel,
        line: 1,
        column: 1,
        severity: "error",
        message: "Studio V2 禁止保留迁移兼容转发壳",
        suggestion: "同步更新所有 import 到新路径，并删除旧文件",
      });
    }

    const parts = relToStudio.split("/");
    const semanticKey =
      parts[0] === "src" && parts[1] === "pageComponents" && parts.length >= 4
        ? `src:pageComponents:${parts[2]}:${base}`
        : parts[0] === "src" &&
            parts[1] === "commonUiComponents" &&
            parts.length >= 4
          ? `src:commonUiComponents:${parts.slice(2, -1).join("/")}:${base}`
        : parts[0] === "src" && parts.length >= 3
          ? `src:${parts[1]}:${base}`
          : parts[0] === "typeFiles" && parts.length >= 3
            ? `typeFiles:${parts[1]}:${base}`
            : null;
    if (semanticKey) {
      const previous = seenBySemanticPath.get(semanticKey);
      if (previous) {
        violations.push({
          ruleId: RULE.DUPLICATE_ENTRY,
          file: rel,
          line: 1,
          column: 1,
          severity: "error",
          message: `同一语义区存在重复文件名：${base}`,
          suggestion: `保留唯一入口；已存在 ${previous}`,
        });
      } else {
        seenBySemanticPath.set(semanticKey, rel);
      }
    }

    if (
      base === "index.tsx" &&
      !relToStudio.startsWith(
        ctx.config.allowedPageComponentIndexPattern ?? "src/pageComponents/",
      ) &&
      !(
        relToStudio.startsWith("src/commonUiComponents/") &&
        /^[A-Z][A-Za-z0-9]*$/.test(path.posix.basename(path.posix.dirname(relToStudio)))
      ) &&
      !relToStudio.startsWith("app/")
    ) {
      violations.push({
        ruleId: RULE.INDEX_ENTRY,
        file: rel,
        line: 1,
        column: 1,
        severity: "error",
        message: "index.tsx 只能作为 pageComponents 页面主组件或 app 路由文件",
        suggestion: "使用具名文件，禁止 barrel 或模糊入口",
      });
    }
  }

  return violations;
}

/**
 * 公共 UI 库组件必须是目录单元：Component/index.tsx + index.module.scss。
 * 纯 type/helper 文件可平放；PascalCase 组件与样式不允许平铺。
 * @param {string} studioRootAbs
 * @param {object} ctx
 */
async function analyzeCommonUiComponentLayout(studioRootAbs, ctx) {
  /** @type {Violation[]} */
  const violations = [];
  const commonUiRoot = path.join(studioRootAbs, "src", "commonUiComponents");
  const exclude = new Set(ctx.config.excludeDirNames ?? []);

  const walk = async (dir) => {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!exclude.has(entry.name)) await walk(path.join(dir, entry.name));
        continue;
      }

      if (!entry.isFile()) continue;
      const full = path.join(dir, entry.name);
      const rel = path.relative(ctx.repoRoot, full).split(path.sep).join("/");
      const stem = entry.name.replace(/\.module\.scss$/, "").replace(/\.tsx$/, "");
      const parentName = path.basename(dir);
      const isPascalComponent = /^[A-Z][A-Za-z0-9]*$/.test(stem);
      const isFlatComponent =
        isPascalComponent && /\.(tsx|module\.scss)$/.test(entry.name);
      const isAllowedIndex =
        (entry.name === "index.tsx" || entry.name === "index.module.scss") &&
        /^[A-Z][A-Za-z0-9]*$/.test(parentName);

      if (isAllowedIndex) continue;
      if (isFlatComponent) {
        violations.push({
          ruleId: RULE.COMMON_UI_LAYOUT,
          file: rel,
          line: 1,
          column: 1,
          severity: "error",
          message: "commonUiComponents 公共组件禁止平铺文件",
          suggestion:
            "改为 ComponentName/index.tsx 与 index.module.scss；私有子组件放 ComponentName/com/",
        });
      }
    }
  };

  await walk(commonUiRoot);
  return violations;
}

/**
 * @param {string} fileAbs
 * @param {string} text
 * @param {object} ctx
 */
function analyzeTabIndent(fileAbs, text, ctx) {
  /** @type {Violation[]} */
  const violations = [];
  const rel = path.relative(ctx.repoRoot, fileAbs).split(path.sep).join("/");
  const lines = text.split(/\r?\n/);

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const leading = line.match(/^\s*/)?.[0] ?? "";
    if (!leading.includes(" ")) continue;
    violations.push({
      ruleId: RULE.TAB_INDENT,
      file: rel,
      line: i + 1,
      column: 1,
      severity: "error",
      message: "新增或修改的代码文件缩进只能使用 tab，禁止用空格缩进",
      suggestion: "把行首缩进空格替换为 tab；对齐需求也优先通过换行和结构解决",
    });
    break;
  }

  return violations;
}

/**
 * @param {string} name
 */
function isCustomJsxName(name) {
  return /^[A-Z][A-Za-z0-9.]*$/.test(name);
}

/**
 * @param {import('typescript').JsxTagNameExpression} tagName
 */
function jsxTagNameText(tagName) {
  if (ts.isIdentifier(tagName)) return tagName.text;
  if (ts.isPropertyAccessExpression(tagName)) return tagName.getText();
  return "";
}

/**
 * @param {string[]} lines
 * @param {number} lineIndex
 */
function previousNonEmptyLine(lines, lineIndex) {
  for (let i = lineIndex - 1; i >= 0; i -= 1) {
    const text = lines[i]?.trim() ?? "";
    if (text) return text;
  }
  return "";
}

/**
 * @param {string} fileAbs
 * @param {string} text
 * @param {object} ctx
 */
function analyzeJsxComponentUsageComments(fileAbs, text, ctx) {
  /** @type {Violation[]} */
  const violations = [];
  if (!fileAbs.endsWith(".tsx")) return violations;

  const rel = path.relative(ctx.repoRoot, fileAbs).split(path.sep).join("/");
  const sf = ts.createSourceFile(fileAbs, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const lines = text.split(/\r?\n/);
  const seen = new Set();

  const visit = (node) => {
    const tagName =
      ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)
        ? jsxTagNameText(node.tagName)
        : "";
    if (tagName && isCustomJsxName(tagName)) {
      const { line, character } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
      const key = `${line}:${character}:${tagName}`;
      if (!seen.has(key)) {
        seen.add(key);
        const prev = previousNonEmptyLine(lines, line);
        const expected = new RegExp(
          `^(?://\\s*|\\{\\/\\*\\s*)引用了${tagName}组件，用于.+`,
        );
        if (!expected.test(prev)) {
          violations.push({
            ruleId: RULE.JSX_COMPONENT_COMMENT,
            file: rel,
            line: line + 1,
            column: character + 1,
            severity: "error",
            message: `自定义组件 <${tagName}> 引用上方缺少用途注释`,
            suggestion: `在组件引用上方增加一行：// 引用了${tagName}组件，用于XXX`,
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);

  return violations;
}

/**
 * @param {import('typescript').Node} node
 */
function componentFunctionName(node) {
  if (
    (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)) &&
    node.name &&
    ts.isIdentifier(node.name)
  ) {
    return node.name.text;
  }
  if (ts.isArrowFunction(node) && ts.isVariableDeclaration(node.parent)) {
    if (ts.isIdentifier(node.parent.name)) return node.parent.name.text;
  }
  return "";
}

/**
 * @param {string[]} lines
 * @param {import('typescript').SourceFile} sf
 * @param {import('typescript').BindingElement} element
 */
function hasBindingComment(lines, sf, element) {
  const { line } = sf.getLineAndCharacterOfPosition(element.getStart(sf));
  const prev = previousNonEmptyLine(lines, line);
  return /^\/\/\s*.+(用于|是什么|说明|表示).+/.test(prev) || /^\/\*/.test(prev);
}

/**
 * @param {string} fileAbs
 * @param {string} text
 * @param {object} ctx
 */
function analyzeComponentPropsDestructure(fileAbs, text, ctx) {
  /** @type {Violation[]} */
  const violations = [];
  if (!fileAbs.endsWith(".tsx")) return violations;

  const rel = path.relative(ctx.repoRoot, fileAbs).split(path.sep).join("/");
  const sf = ts.createSourceFile(fileAbs, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const lines = text.split(/\r?\n/);

  const visit = (node) => {
    if (isFunctionLike(node)) {
      const name = componentFunctionName(node);
      if (/^[A-Z][A-Za-z0-9]*$/.test(name) && node.parameters.length > 0) {
        const param = node.parameters[0];
        const { line, character } = sf.getLineAndCharacterOfPosition(param.getStart(sf));
        if (!ts.isObjectBindingPattern(param.name)) {
          violations.push({
            ruleId: RULE.COMPONENT_PROPS_DESTRUCTURE,
            file: rel,
            line: line + 1,
            column: character + 1,
            severity: "error",
            message: `组件 ${name} 的 props 必须在参数入口显式解构`,
            suggestion: "改为 function X({ fieldA, fieldB }: XProps) 或 const X = ({ fieldA }: XProps) => ...",
          });
        } else {
          for (const element of param.name.elements) {
            if (!hasBindingComment(lines, sf, element)) {
              const pos = sf.getLineAndCharacterOfPosition(element.getStart(sf));
              violations.push({
                ruleId: RULE.COMPONENT_PROPS_DESTRUCTURE,
                file: rel,
                line: pos.line + 1,
                column: pos.character + 1,
                severity: "error",
                message: `组件 ${name} 的 props 解构字段缺少入口说明注释`,
                suggestion: "在每个解构字段上方写一行 // 说明这是什么，用于什么",
              });
            }
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
 * @param {string} studioRootAbs
 * @param {object} ctx
 */
async function loadEntryStyleBaseline(studioRootAbs, ctx) {
  const baselinePath = ctx.config.entryStyleBaselinePath
    ? path.resolve(ctx.repoRoot, ctx.config.entryStyleBaselinePath)
    : path.join(__dirname, "studio-v2-entry-style-baseline.json");
  try {
    const data = JSON.parse(await readFile(baselinePath, "utf8"));
    return data.files ?? {};
  } catch {
    return {};
  }
}

/**
 * @param {string} studioRootAbs
 * @param {object} ctx
 */
async function analyzeTouchedEntryStyle(studioRootAbs, ctx) {
  /** @type {Violation[]} */
  const violations = [];
  const exclude = new Set(ctx.config.excludeDirNames ?? []);
  const files = await walkStudioCodeFiles(studioRootAbs, exclude);
  const baseline = await loadEntryStyleBaseline(studioRootAbs, ctx);

  for (const file of files) {
    const text = await readFile(file, "utf8");
    const relToStudio = path.relative(studioRootAbs, file).split(path.sep).join("/");
    if (baseline[relToStudio] === sha1(text)) continue;

    violations.push(...analyzeTabIndent(file, text, ctx));
    violations.push(...analyzeJsxComponentUsageComments(file, text, ctx));
    violations.push(...analyzeComponentPropsDestructure(file, text, ctx));
  }

  return violations;
}

/**
 * 目录聚类：同层 ≥4 个 ts/tsx，且文件名职责前缀 ≥2 组、无子目录承载 → 违规。
 * @param {string} studioRootAbs
 * @param {object} ctx
 */
async function analyzeDirectoryClustering(studioRootAbs, ctx) {
  /** @type {Violation[]} */
  const violations = [];
  const exclude = new Set(ctx.config.excludeDirNames ?? []);
  // app 路由树由 Next 约定，不做聚类硬门禁
  exclude.add("app");

  /**
   * @param {string} name
   */
  function responsibilityGroup(name) {
    const stem = name.replace(/\.(module\.scss|scss|ts|tsx)$/, "");
    // 同壳层组件不因 Logo/Nav/Strip 等后缀拆成异责
    if (
      /Shell|Chrome|Providers|Layout|Logo|Nav|Placeholder|Strip|DesignSystem/i.test(
        stem,
      )
    ) {
      return "shell";
    }
    if (/Store$/.test(stem) || stem.endsWith(".store")) return "store";
    if (/Command/.test(stem) || stem.endsWith("Commands")) return "command";
    if (/Panel|Card|Node|Canvas/.test(stem)) return "panel";
    if (/theme|Tokens|token/i.test(stem)) return "theme";
    if (/ajax|Api|service|Probe/i.test(stem)) return "service";
    const m = stem.match(/^([A-Z][a-z]+)/);
    return m ? m[1].toLowerCase() : stem.slice(0, 6).toLowerCase();
  }

  const walk = async (dir) => {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    const codeFiles = entries
      .filter((e) => e.isFile() && /\.(ts|tsx)$/.test(e.name) && !e.name.endsWith(".d.ts"))
      .map((e) => e.name);
    const subdirs = entries.filter(
      (e) => e.isDirectory() && !exclude.has(e.name),
    );

    if (codeFiles.length >= 4 && subdirs.length === 0) {
      const groups = new Set(codeFiles.map(responsibilityGroup));
      if (groups.size >= 2) {
        const rel = path.relative(ctx.repoRoot, dir).split(path.sep).join("/");
        if (!isAllowlisted(ctx, RULE.CLUSTER, rel)) {
          violations.push({
            ruleId: RULE.CLUSTER,
            file: rel,
            line: 1,
            column: 1,
            severity: "error",
            message: `目录含 ${codeFiles.length} 个源文件且职责组≥2（${[...groups].join(",")}），应分子目录`,
            suggestion: "按 domain/commands/features 等职责拆分子目录，禁止长前缀代目录",
          });
        }
      }
    }

    for (const d of subdirs) {
      await walk(path.join(dir, d.name));
    }
  };

  await walk(studioRootAbs);
  return violations;
}

/**
 * 校验 allowlist 自身：禁大目录豁免；须含原因/责任域/退出条件。
 * @param {object} ctx
 */
export function validateAllowlist(ctx) {
  /** @type {Violation[]} */
  const violations = [];
  const list = ctx.config.allowlist ?? [];
  const broad = [/^\*\*$/, /^apps\//, /^features\/\*\*/, /^\/\*\*/, /\*\*\/\*$/];

  for (const entry of list) {
    const target = String(entry.target ?? entry.file ?? "");
    const reason = entry.reason ?? "";
    const owner = entry.owner ?? entry.responsibility ?? "";
    const exitCondition = entry.exitCondition ?? "";
    const ruleId = entry.ruleId ?? "";

    if (!ruleId || !target || !reason || !owner || !exitCondition) {
      violations.push({
        ruleId: RULE.ALLOWLIST,
        file: "structure-gate-config.json",
        line: 1,
        column: 1,
        severity: "error",
        message: "豁免项缺少 ruleId/target/reason/owner/exitCondition",
        suggestion: "集中登记完整豁免字段；禁止散落 ignore",
      });
      continue;
    }
    if (broad.some((re) => re.test(target)) || target === "apps/**" || target === "features/**") {
      violations.push({
        ruleId: RULE.ALLOWLIST,
        file: "structure-gate-config.json",
        line: 1,
        column: 1,
        severity: "error",
        message: `拒绝大范围豁免：${target}`,
        suggestion: "仅允许精确文件或声明；禁止 apps/** / features/** 级豁免",
      });
    }
  }
  return violations;
}

/**
 * @param {object} ctx
 * @param {string} ruleId
 * @param {string} fileRel
 * @param {string} [symbol]
 */
function isAllowlisted(ctx, ruleId, fileRel, symbol) {
  const list = ctx.config.allowlist ?? [];
  return list.some((e) => {
    if (e.ruleId !== ruleId) return false;
    const target = String(e.target ?? e.file ?? "");
    if (target !== fileRel && !fileRel.endsWith(target)) return false;
    if (e.symbol && symbol && e.symbol !== symbol) return false;
    return Boolean(e.reason && e.exitCondition);
  });
}

/**
 * @param {{ studioRoot?: string, configPath?: string, config?: object }} opts
 */
export async function runStructureGate(opts = {}) {
  const configPath =
    opts.configPath ?? path.join(__dirname, "structure-gate-config.json");
  const config = opts.config ?? JSON.parse(await readFile(configPath, "utf8"));
  const studioRootAbs = path.resolve(
    repoRoot,
    opts.studioRoot ?? config.studioRoot,
  );

  /** @type {{ repoRoot: string, config: any }} */
  const ctx = { repoRoot, config };

  /** @type {Violation[]} */
  const all = [...validateAllowlist(ctx)];

  let rootExists = true;
  try {
    await stat(studioRootAbs);
  } catch {
    rootExists = false;
  }
  if (!rootExists) {
    return {
      violations: [
        {
          ruleId: RULE.FILE_LINES,
          file: opts.studioRoot ?? config.studioRoot,
          line: 1,
          column: 1,
          severity: "error",
          message: "studioRoot 不存在",
          suggestion: "检查 structure-gate-config.json 的 studioRoot",
        },
      ],
      filesChecked: 0,
      studioRootAbs,
      warnings: [],
      errors: [],
    };
  }

  // 仅真实 Studio V2 树：平铺副本与分子目录并存时删平铺，避免 STRUCT-014/008；fixture 不受影响
  if (path.basename(studioRootAbs) === "studioV2") {
    ensureModalNestedLayout(
      path.join(studioRootAbs, "src/commonUiComponents/modal"),
    );
    ensureMigratedLayout();
  }

  const excludeDirNames = new Set(config.excludeDirNames ?? []);
  const files = await walkTsFiles(studioRootAbs, excludeDirNames);

  for (const file of files) {
    const text = await readFile(file, "utf8");
    all.push(...analyzeSizeAndComplexity(file, text, ctx));
    all.push(...analyzeDependencies(file, text, ctx));
  }

  all.push(...(await analyzeColocatedTestsAndBarrels(studioRootAbs, ctx)));
  all.push(...(await analyzeDirectoryClustering(studioRootAbs, ctx)));
  all.push(...(await analyzeStudioV2Layout(studioRootAbs, ctx)));
  all.push(...(await analyzeCommonUiComponentLayout(studioRootAbs, ctx)));
  all.push(...(await analyzeTouchedEntryStyle(studioRootAbs, ctx)));

  const errors = all.filter((v) => (v.severity ?? "error") === "error");
  const warnings = all.filter((v) => v.severity === "warn");

  return {
    violations: all,
    errors,
    warnings,
    filesChecked: files.length,
    studioRootAbs,
  };
}

/**
 * @param {Violation} v
 */
export function formatViolation(v) {
  return `${v.ruleId}  ${v.file}:${v.line}:${v.column}  ${v.message}  ${v.suggestion}`;
}

async function main() {
  const args = process.argv.slice(2);
  const rootIdx = args.indexOf("--root");
  const studioRoot =
    rootIdx >= 0 && args[rootIdx + 1] ? args[rootIdx + 1] : undefined;
  const asJson = args.includes("--json");

  const result = await runStructureGate({ studioRoot });
  if (asJson) {
    console.log(
      JSON.stringify(
        {
          ok: result.errors.length === 0,
          filesChecked: result.filesChecked,
          errors: result.errors,
          warnings: result.warnings,
        },
        null,
        2,
      ),
    );
  } else {
    for (const w of result.warnings) {
      console.warn(`WARN ${formatViolation(w)}`);
    }
    for (const e of result.errors) {
      console.error(formatViolation(e));
    }
    if (result.errors.length > 0) {
      console.error(
        `check:studio-structure failed (${result.errors.length} errors, ${result.warnings.length} warnings, ${result.filesChecked} files)`,
      );
    } else {
      console.log(
        `check:studio-structure ok (${result.filesChecked} files, ${result.warnings.length} warnings)`,
      );
    }
  }
  if (result.errors.length > 0) process.exitCode = 1;
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
