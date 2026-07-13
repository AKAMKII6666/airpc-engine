/**
 * 模块名称：Studio data 根路径解析
 */
import { existsSync } from "node:fs";
import path from "node:path";

export function getStudioDataRoot(): string {
  const candidates = [
    path.resolve(process.cwd(), "data"),
    path.resolve(process.cwd(), "../../data"),
    path.resolve(process.cwd(), "../data"),
  ];
  for (const candidate of candidates) {
    if (existsSync(path.join(candidate, "workspace.json"))) {
      return candidate;
    }
  }
  throw new Error(
    "data/ workspace.json not found (cwd=" + process.cwd() + ")",
  );
}
