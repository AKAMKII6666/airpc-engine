/**
 * 抑制指令带原因与退出条件，应通过门禁。
 * 本夹具故意关闭 strictContractDirs，只验 STUDIO-COMMENT-003（有原因放行），
 * 避免与导出意图注释（001）交叉导致假失败。
 */
// eslint-disable-next-line no-console -- 原因：夹具演示；退出条件：删除本夹具时移除。
console.log("fixture-with-reason");

// @ts-expect-error 原因：夹具强制制造类型冲突；退出条件：删除本夹具时移除。
export const forced: string = 1 as unknown as string;
