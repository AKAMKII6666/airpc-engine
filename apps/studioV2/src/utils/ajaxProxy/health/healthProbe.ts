/**
 * HTTP / 导入导出服务占位。
 * 静态页阶段禁止假装已接 Host 写口闭环；后续才落地真实 BFF。
 */

export type HealthProbe = {
  /** 探测时间，ISO-8601 */
  at: string;
  status: "ok";
  note: string;
};

/** 本地健康探测；不触达 EngineHost。 */
export function probeStudioHealth(): HealthProbe {
  return {
    at: new Date().toISOString(),
    status: "ok",
    note: "static-shell; Host 写口未接入",
  };
}
