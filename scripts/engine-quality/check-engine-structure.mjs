/**
 * 引擎结构门禁：文件/函数行数、圈复杂度、平放测试、抑制注释、历史基线止血。
 *
 * 输出格式：规则编号  文件:行:列  当前值  允许值/基线值  修复建议
 * （含 path:line:col，便于 gbx verifyLocations 解析）
 *
 * 用法：
 *   node scripts/engine-quality/check-engine-structure.mjs
 *   node scripts/engine-quality/check-engine-structure.mjs --root <engineSrcOrPackageRoot>
 *   node scripts/engine-quality/check-engine-structure.mjs --json
 */
import { createRequire } from "node:module";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

const RULE = {
  FILE_LINES: "ENGINE-STRUCT-001",
  FN_LINES: "ENGINE-STRUCT-002",
  COMPLEXITY: "ENGINE-STRUCT-003",
  COLOCATED_TEST: "ENGINE-STRUCT-004",
  FORBIDDEN_IMPORT: "ENGINE-STRUCT-005",
  SUPPRESS: "ENGINE-STRUCT-006",
  BASELINE: "ENGINE-STRUCT-007",
  BASELINE_META: "ENGINE-STRUCT-008",
  CLUSTER: "ENGINE-STRUCT-009",
};

/** @typedef {{ ruleId: string, file: string, line: number, column: number, message: string, suggestion: string, severity?: "error"|"warn", current?: string|number, allowed?: string|number }} Violation */

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

/** 有效行：非空行（含注释）；空行不计。 */
export function countEffectiveLines(text) {
  return text.split(/\r?\n/).filter((l) => l.trim().length > 0).length;
}

function countEffectiveLinesInRange(text, start, end) {
  return countEffectiveLines(text.slice(start, end));
}

/**
 * host / composition vs ordinary source vs test.
 * @param {string} relPosix repo-relative posix path
 * @param {string} enginePackageRootRel e.g. packages/rpg-engine
 */
export function classifyEngineFile(relPosix, enginePackageRootRel) {
  const prefix = enginePackageRootRel.replace(/\/$/, "");
  const relToPkg = relPosix.startsWith(prefix + "/")
    ? relPosix.slice(prefix.length + 1)
    : relPosix;
  if (relToPkg === "tests" || relToPkg.startsWith("tests/")) return "test";
  if (
    relToPkg.startsWith("src/host/") ||
    /createEngineHost\.ts$/.test(relToPkg) ||
    /composition/i.test(relToPkg)
  ) {
    return "host";
  }
  return "source";
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
 * @param {string} text
 * @param {string} fileAbs
 */
export function collectFileMetrics(text, fileAbs) {
  const effectiveLines = countEffectiveLines(text);
  const sf = ts.createSourceFile(
    fileAbs,
    text,
    ts.ScriptTarget.Latest,
    true,
    fileAbs.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  let maxFnLines = 0;
  let maxComplexity = 0;
  /** @type {{ name: string, lines: number, complexity: number, line: number, column: number }[]} */
  const functions = [];

  const visit = (node) => {
    if (isFunctionLike(node) && node.body) {
      const name = functionDisplayName(node);
      const bodyStart = node.body.getStart(sf);
      const bodyEnd = node.body.getEnd();
      const fnLines = countEffectiveLinesInRange(text, bodyStart, bodyEnd);
      const complexity = computeCyclomaticComplexity(node);
      const { line, character } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
      functions.push({
        name,
        lines: fnLines,
        complexity,
        line: line + 1,
        column: character + 1,
      });
      if (fnLines > maxFnLines) maxFnLines = fnLines;
      if (complexity > maxComplexity) maxComplexity = complexity;
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return { effectiveLines, maxFnLines, maxComplexity, functions, sourceFile: sf };
}

const FORBIDDEN_IMPORT_RES = [
  /\bfrom\s+['"]react(?:-dom)?(?:\/[^'"]*)?['"]/,
  /\bfrom\s+['"]next(?:\/[^'"]*)?['"]/,
  /\bfrom\s+['"]@xyflow\/[^'"]+['"]/,
];

/**
 * 无理由 suppress：同行或上一行须含原因说明（中文/英文均可，至少含「原因|because|exit|临时|TODO」之一或较长说明）。
 * @param {string} text
 * @param {string} rel
 */
function analyzeSuppressions(text, rel) {
  /** @type {Violation[]} */
  const violations = [];
  const lines = text.split(/\r?\n/);
  const suppressRe =
    /^\s*\/\/\s*eslint-disable(?:-next-line)?\b|^\s*\/\*\s*eslint-disable|@ts-ignore|@ts-expect-error/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!suppressRe.test(line) && !/@ts-ignore|@ts-expect-error/.test(line)) {
      continue;
    }
    const prev = i > 0 ? lines[i - 1] : "";
    const combined = `${prev}\n${line}`;
    const hasReason =
      /原因|because|exitCondition|退出|临时|FIXME|NOTE:|why:|rationale/i.test(
        combined,
      ) ||
      /eslint-disable[^\n]{20,}/.test(line) ||
      /@ts-expect-error\s+\S{8,}/.test(line) ||
      /@ts-ignore\s+\S{8,}/.test(line);
    if (!hasReason) {
      violations.push({
        ruleId: RULE.SUPPRESS,
        file: rel,
        line: i + 1,
        column: 1,
        severity: "error",
        current: "suppress-without-reason",
        allowed: "reason-required",
        message: "抑制指令缺少同处原因说明",
        suggestion: "在同行或上一行写明原因与退出条件；禁止无声 disable",
      });
    }
  }
  return violations;
}

/**
 * @param {object} baselineDoc
 */
export function validateBaselineDoc(baselineDoc) {
  /** @type {Violation[]} */
  const violations = [];
  const files = baselineDoc?.files ?? [];
  const seen = new Set();

  for (const entry of files) {
    const file = String(entry.file ?? "");
    if (!file || file.includes("*") || file.endsWith("/")) {
      violations.push({
        ruleId: RULE.BASELINE_META,
        file: "engine-quality-baseline.json",
        line: 1,
        column: 1,
        severity: "error",
        current: file || "(empty)",
        allowed: "exact-file-path",
        message: `基线拒绝目录通配或空路径：${file || "(empty)"}`,
        suggestion: "每条基线只登记精确文件路径",
      });
      continue;
    }
    if (seen.has(file)) {
      violations.push({
        ruleId: RULE.BASELINE_META,
        file: "engine-quality-baseline.json",
        line: 1,
        column: 1,
        severity: "error",
        current: file,
        allowed: "unique",
        message: `基线文件重复：${file}`,
        suggestion: "合并为单条记录",
      });
    }
    seen.add(file);
    if (
      !entry.reason ||
      !entry.owner ||
      !entry.exitCondition ||
      !entry.recordedAt ||
      typeof entry.effectiveLines !== "number" ||
      typeof entry.maxFnLines !== "number" ||
      typeof entry.maxComplexity !== "number"
    ) {
      violations.push({
        ruleId: RULE.BASELINE_META,
        file: "engine-quality-baseline.json",
        line: 1,
        column: 1,
        severity: "error",
        current: file,
        allowed: "complete-meta",
        message: `基线 ${file} 缺少 reason/owner/exitCondition/recordedAt/指标`,
        suggestion: "补全元数据与三项指标",
      });
    }
  }
  return violations;
}

/**
 * @param {string} rel
 * @param {{ effectiveLines: number, maxFnLines: number, maxComplexity: number }} metrics
 * @param {object|undefined} baselineEntry
 * @param {{ warnLines: number, hardLines: number }} fileThresh
 * @param {object} fnThresh
 * @param {object} cxThresh
 * @param {{ name: string, lines: number, complexity: number, line: number, column: number }[]} functions
 */
function analyzeAgainstThresholdsAndBaseline(
  rel,
  metrics,
  baselineEntry,
  fileThresh,
  fnThresh,
  cxThresh,
  functions,
) {
  /** @type {Violation[]} */
  const violations = [];

  if (baselineEntry) {
    const checks = [
      ["effectiveLines", metrics.effectiveLines, baselineEntry.effectiveLines, RULE.BASELINE],
      ["maxFnLines", metrics.maxFnLines, baselineEntry.maxFnLines, RULE.BASELINE],
      ["maxComplexity", metrics.maxComplexity, baselineEntry.maxComplexity, RULE.BASELINE],
    ];
    for (const [key, current, allowed, ruleId] of checks) {
      if (current > allowed) {
        violations.push({
          ruleId,
          file: rel,
          line: 1,
          column: 1,
          severity: "error",
          current,
          allowed,
          message: `历史基线 ${key} 净增长：当前 ${current} > 基线 ${allowed}`,
          suggestion: "触碰遗留超限文件时指标只能持平或下降；拆出新模块后再降低基线",
        });
      }
    }
    // 已低于全部硬上限 → 提示可退出基线（warn）
    if (
      metrics.effectiveLines <= fileThresh.hardLines &&
      metrics.maxFnLines <= fnThresh.hardLines &&
      metrics.maxComplexity <= cxThresh.hard
    ) {
      violations.push({
        ruleId: RULE.BASELINE,
        file: rel,
        line: 1,
        column: 1,
        severity: "warn",
        current: metrics.effectiveLines,
        allowed: fileThresh.hardLines,
        message: "文件已低于硬上限，可从基线移除且不得再加回",
        suggestion: "更新 engine-quality-baseline.json 删除该条目",
      });
    }
    // 基线文件：仍报告函数级告警，但不因超过全局硬上限再报 FILE_LINES（由基线覆盖）
  } else {
    if (metrics.effectiveLines > fileThresh.hardLines) {
      violations.push({
        ruleId: RULE.FILE_LINES,
        file: rel,
        line: 1,
        column: 1,
        severity: "error",
        current: metrics.effectiveLines,
        allowed: fileThresh.hardLines,
        message: `有效行数 ${metrics.effectiveLines} 超过硬上限 ${fileThresh.hardLines}`,
        suggestion: "按职责拆模块；禁止压空行或删注释凑行数",
      });
    } else if (metrics.effectiveLines > fileThresh.warnLines) {
      violations.push({
        ruleId: RULE.FILE_LINES,
        file: rel,
        line: 1,
        column: 1,
        severity: "warn",
        current: metrics.effectiveLines,
        allowed: fileThresh.warnLines,
        message: `有效行数 ${metrics.effectiveLines} 超过告警线 ${fileThresh.warnLines}`,
        suggestion: "尽快拆分，避免逼近硬上限",
      });
    }
  }

  for (const fn of functions) {
    const overHardLines = fn.lines > fnThresh.hardLines;
    const overHardCx = fn.complexity > cxThresh.hard;
    // 基线文件：仅当超过该文件基线的 max 时已在上面报过；函数硬上限对新函数仍适用
    if (!baselineEntry) {
      if (overHardLines) {
        violations.push({
          ruleId: RULE.FN_LINES,
          file: rel,
          line: fn.line,
          column: fn.column,
          severity: "error",
          current: fn.lines,
          allowed: fnThresh.hardLines,
          message: `函数 ${fn.name} 有效行数 ${fn.lines} 超过硬上限 ${fnThresh.hardLines}`,
          suggestion: "拆出步骤函数或领域服务",
        });
      } else if (fn.lines > fnThresh.warnLines) {
        violations.push({
          ruleId: RULE.FN_LINES,
          file: rel,
          line: fn.line,
          column: fn.column,
          severity: "warn",
          current: fn.lines,
          allowed: fnThresh.warnLines,
          message: `函数 ${fn.name} 有效行数 ${fn.lines} 超过告警线 ${fnThresh.warnLines}`,
          suggestion: "考虑拆分以保持可测性",
        });
      }
      if (overHardCx) {
        violations.push({
          ruleId: RULE.COMPLEXITY,
          file: rel,
          line: fn.line,
          column: fn.column,
          severity: "error",
          current: fn.complexity,
          allowed: cxThresh.hard,
          message: `函数 ${fn.name} 圈复杂度 ${fn.complexity} 超过硬上限 ${cxThresh.hard}`,
          suggestion: "用查表、状态机或早返回降低分支",
        });
      } else if (fn.complexity > cxThresh.warn) {
        violations.push({
          ruleId: RULE.COMPLEXITY,
          file: rel,
          line: fn.line,
          column: fn.column,
          severity: "warn",
          current: fn.complexity,
          allowed: cxThresh.warn,
          message: `函数 ${fn.name} 圈复杂度 ${fn.complexity} 超过告警线 ${cxThresh.warn}`,
          suggestion: "重构条件分支",
        });
      }
    }
  }

  return violations;
}

function analyzeForbiddenImports(text, rel) {
  /** @type {Violation[]} */
  const violations = [];
  for (const re of FORBIDDEN_IMPORT_RES) {
    if (re.test(text)) {
      violations.push({
        ruleId: RULE.FORBIDDEN_IMPORT,
        file: rel,
        line: 1,
        column: 1,
        severity: "error",
        current: re.source.slice(0, 40),
        allowed: "none",
        message: "引擎源码禁止导入 react/next/@xyflow",
        suggestion: "保持 packages/rpg-engine 纯 TypeScript",
      });
      break;
    }
  }
  return violations;
}

async function analyzeColocatedTests(scanRootAbs, ctx, enginePackageRel) {
  /** @type {Violation[]} */
  const violations = [];
  const exclude = new Set(ctx.config.excludeDirNames ?? []);
  const srcRoot = path.join(scanRootAbs, "src");

  const walk = async (dir) => {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (exclude.has(entry.name)) continue;
        await walk(full);
        continue;
      }
      if (/\.(test|spec)\.(ts|tsx)$/.test(entry.name)) {
        const rel = path.relative(ctx.repoRoot, full).split(path.sep).join("/");
        const allowedTestsPrefix = `${enginePackageRel}/tests/`;
        if (!rel.startsWith(allowedTestsPrefix)) {
          violations.push({
            ruleId: RULE.COLOCATED_TEST,
            file: rel,
            line: 1,
            column: 1,
            severity: "error",
            current: rel,
            allowed: allowedTestsPrefix,
            message: "测试不得与引擎 src 业务文件平放",
            suggestion: "移至 packages/rpg-engine/tests/ 按模块分子目录",
          });
        }
      }
    }
  };

  await walk(srcRoot);
  return violations;
}

/**
 * 目录聚类：同层 ≥4 个 ts 且职责组 ≥2、无子目录 → 违规（跳过 host 单文件热点目录的误伤需靠子目录存在）。
 */
async function analyzeDirectoryClustering(scanRootAbs, ctx) {
  /** @type {Violation[]} */
  const violations = [];
  const exclude = new Set(ctx.config.excludeDirNames ?? []);
  const root = path.join(scanRootAbs, "src");

  function responsibilityGroup(name) {
    const stem = name.replace(/\.tsx?$/, "");
    if (/Host|Session|Resolver/i.test(stem)) return "host";
    if (/Effect|Sink|Ledger/i.test(stem)) return "effect";
    if (/Schedule|Tick|Clock|Recurring/i.test(stem)) return "schedule";
    if (/Memory|Profile|Persist/i.test(stem)) return "persist";
    if (/Valid|Schema|Package/i.test(stem)) return "validate";
    if (/Card|Call|Free/i.test(stem)) return "card";
    const m = stem.match(/^([a-z]+)/i);
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
      .filter((e) => e.isFile() && /\.tsx?$/.test(e.name) && !e.name.endsWith(".d.ts"))
      .map((e) => e.name);
    const subdirs = entries.filter((e) => e.isDirectory() && !exclude.has(e.name));
    if (codeFiles.length >= 4 && subdirs.length === 0) {
      const groups = new Set(codeFiles.map(responsibilityGroup));
      if (groups.size >= 2) {
        const rel = path.relative(ctx.repoRoot, dir).split(path.sep).join("/");
        // v1：既有平铺目录只告警；硬阻断留给后续拆目录任务，避免休整期无法落地止血门禁。
        violations.push({
          ruleId: RULE.CLUSTER,
          file: rel,
          line: 1,
          column: 1,
          severity: "warn",
          current: codeFiles.length,
          allowed: "clustered-dirs",
          message: `目录含 ${codeFiles.length} 个源文件且职责组≥2（${[...groups].join(",")}），应分子目录`,
          suggestion: "按职责拆分子目录，禁止长前缀代目录；新增文件勿继续恶化平铺",
        });
      }
    }
    for (const d of subdirs) await walk(path.join(dir, d.name));
  };

  await walk(root);
  return violations;
}

/**
 * @param {Violation} v
 */
export function formatViolation(v) {
  const cur = v.current !== undefined ? String(v.current) : "-";
  const all = v.allowed !== undefined ? String(v.allowed) : "-";
  return `${v.ruleId}  ${v.file}:${v.line}:${v.column}  当前=${cur}  允许=${all}  ${v.message}  ${v.suggestion}`;
}

/**
 * @param {{ engineRoot?: string, configPath?: string, baselinePath?: string, config?: object, baseline?: object }} opts
 */
export async function runEngineStructureGate(opts = {}) {
  const configPath =
    opts.configPath ?? path.join(__dirname, "structure-gate-config.json");
  const baselinePath =
    opts.baselinePath ?? path.join(__dirname, "engine-quality-baseline.json");
  const config = opts.config ?? JSON.parse(await readFile(configPath, "utf8"));
  const baselineDoc =
    opts.baseline ??
    JSON.parse(await readFile(baselinePath, "utf8").catch(() => '{"files":[]}'));

  const enginePackageRel = opts.engineRoot ?? config.engineRoot ?? "packages/rpg-engine";
  const engineRootAbs = path.resolve(repoRoot, enginePackageRel);
  const ctx = { repoRoot, config };

  /** @type {Violation[]} */
  const all = [...validateBaselineDoc(baselineDoc)];

  try {
    await stat(engineRootAbs);
  } catch {
    return {
      violations: [
        {
          ruleId: RULE.FILE_LINES,
          file: enginePackageRel,
          line: 1,
          column: 1,
          severity: "error",
          message: "engineRoot 不存在",
          suggestion: "检查 structure-gate-config.json 的 engineRoot",
        },
      ],
      filesChecked: 0,
      warnings: [],
      errors: [
        {
          ruleId: RULE.FILE_LINES,
          file: enginePackageRel,
          line: 1,
          column: 1,
          severity: "error",
          message: "engineRoot 不存在",
          suggestion: "检查 structure-gate-config.json 的 engineRoot",
        },
      ],
    };
  }

  const baselineByFile = new Map(
    (baselineDoc.files ?? []).map((e) => [e.file, e]),
  );
  const excludeDirNames = new Set(config.excludeDirNames ?? []);
  const srcFiles = await walkTsFiles(path.join(engineRootAbs, "src"), excludeDirNames);
  const testFiles = await walkTsFiles(path.join(engineRootAbs, "tests"), excludeDirNames);
  const files = [...srcFiles, ...testFiles];

  const thresholds = config.thresholds;
  let filesChecked = 0;

  for (const file of files) {
    const text = await readFile(file, "utf8");
    const rel = path.relative(repoRoot, file).split(path.sep).join("/");
    filesChecked += 1;
    const kind = classifyEngineFile(rel, enginePackageRel);
    const fileThresh =
      kind === "host"
        ? thresholds.host
        : kind === "test"
          ? thresholds.test
          : thresholds.source;
    const metrics = collectFileMetrics(text, file);
    const baselineEntry = baselineByFile.get(rel);

    all.push(
      ...analyzeAgainstThresholdsAndBaseline(
        rel,
        metrics,
        baselineEntry,
        fileThresh,
        thresholds.function,
        thresholds.complexity,
        metrics.functions,
      ),
    );
    all.push(...analyzeForbiddenImports(text, rel));
    all.push(...analyzeSuppressions(text, rel));
  }

  all.push(...(await analyzeColocatedTests(engineRootAbs, ctx, enginePackageRel)));
  all.push(...(await analyzeDirectoryClustering(engineRootAbs, ctx)));

  // 基线指向的文件必须存在
  for (const entry of baselineDoc.files ?? []) {
    const abs = path.resolve(repoRoot, entry.file);
    try {
      await stat(abs);
    } catch {
      all.push({
        ruleId: RULE.BASELINE_META,
        file: entry.file,
        line: 1,
        column: 1,
        severity: "error",
        current: "missing",
        allowed: "exists",
        message: "基线登记的文件不存在",
        suggestion: "从基线移除幽灵条目",
      });
    }
  }

  const errors = all.filter((v) => (v.severity ?? "error") === "error");
  const warnings = all.filter((v) => v.severity === "warn");
  return { violations: all, errors, warnings, filesChecked, engineRootAbs };
}

async function main() {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const rootIdx = args.indexOf("--root");
  const engineRoot = rootIdx >= 0 ? args[rootIdx + 1] : undefined;
  const { errors, warnings, filesChecked } = await runEngineStructureGate({
    engineRoot,
  });

  if (json) {
    console.log(JSON.stringify({ errors, warnings, filesChecked }, null, 2));
  } else {
    for (const w of warnings) console.warn(formatViolation(w));
    for (const e of errors) console.error(formatViolation(e));
    console.log(
      `check:engine-structure checked=${filesChecked} errors=${errors.length} warnings=${warnings.length}`,
    );
  }
  if (errors.length > 0) process.exit(1);
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
