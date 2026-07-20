/**
 * 一次性清理入口：委托 ensure-migrated-layout（嵌套已落地则 unlink 平铺副本）。
 * 日常请走 `npm run quality:studio`；勿再新增平铺副本。
 */
import { ensureMigratedLayout } from "./studio-quality/ensure-migrated-layout.mjs";

const n = ensureMigratedLayout();
console.log(
  n === 0
    ? "ensure-migrated-layout: nothing to remove"
    : `ensure-migrated-layout: removed ${n} file(s)`,
);
