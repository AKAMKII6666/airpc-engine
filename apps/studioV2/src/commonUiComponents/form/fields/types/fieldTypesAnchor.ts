/**
 * types/ 目录内第二份契约：标记「本目录只放绑定类型」。
 * 与 formBoundTypes 并列，避免单文件空壳；不是 barrel re-export。
 */
export type FormFieldsTypesScope = {
  /** 固定为 formBound；与 JSX 字段文件隔离 */
  kind: "formBound";
};
