/**
 * 合格契约：导出与字段均有意图说明，供门禁自测通过夹具。
 */
export type PassContract = {
  /** 毫秒；由调度器写入，UI 只读投影 */
  delayMs: number;
  /** null 表示尚未绑定章节；空串非法 */
  packageId: string | null;
};

/**
 * 构造合格契约样例；无网络副作用，仅供夹具引用。
 */
export function createPassContract(delayMs: number): PassContract {
  return { delayMs, packageId: null };
}
