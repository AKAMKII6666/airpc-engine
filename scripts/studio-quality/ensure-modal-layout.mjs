/**
 * 若 modal/app|form|shared 已落地，则删除已废弃的平铺副本，避免 STUDIO-STRUCT-014 同名重复入口。
 * 由结构门禁在扫描前调用；文件已清理后为 no-op。
 */
import { existsSync, unlinkSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const thisFile = fileURLToPath(import.meta.url);

/**
 * @param {string} [modalRootAbs]
 * @returns {number} 删除的文件数
 */
export function ensureModalNestedLayout(modalRootAbs) {
  const modalRoot =
    modalRootAbs ??
    path.join(repoRoot, "apps/studioV2/src/commonUiComponents/modal");

  /** @type {{ flat: string; nested: string }[]} */
  const pairs = [
    { flat: "AppModal.tsx", nested: path.join("app", "AppModal.tsx") },
    { flat: "FormModal.tsx", nested: path.join("form", "FormModal.tsx") },
    { flat: "modalTypes.ts", nested: path.join("shared", "modalTypes.ts") },
    { flat: "modalSlot.ts", nested: path.join("shared", "modalSlot.ts") },
    {
      flat: "AppModal.module.scss",
      nested: path.join("app", "AppModal.module.scss"),
    },
    {
      flat: "FormModal.module.scss",
      nested: path.join("form", "FormModal.module.scss"),
    },
  ];

  let removed = 0;
  for (const pair of pairs) {
    const flatAbs = path.join(modalRoot, pair.flat);
    const nestedAbs = path.join(modalRoot, pair.nested);
    if (existsSync(nestedAbs) && existsSync(flatAbs)) {
      unlinkSync(flatAbs);
      removed += 1;
      console.log(`removed obsolete flat modal file: ${pair.flat}`);
    }
  }
  return removed;
}

const invokedAsCli =
  process.argv[1] != null && path.resolve(process.argv[1]) === thisFile;
if (invokedAsCli) {
  const n = ensureModalNestedLayout();
  console.log(
    n === 0
      ? "ensure-modal-layout: nothing to remove"
      : `ensure-modal-layout: removed ${n} file(s)`,
  );
}
