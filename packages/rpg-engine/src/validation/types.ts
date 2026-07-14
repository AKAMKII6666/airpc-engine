/**
 * 模块名称：内容校验报告类型
 */
export type ValidationLevel = "error" | "warning";

export interface ValidationIssue {
  ruleId: string;
  level: ValidationLevel;
  path: string;
  message: string;
}

export interface ValidationReport {
  packageId: string;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export function hasBlockingErrors(report: ValidationReport): boolean {
  return report.errors.length > 0;
}
