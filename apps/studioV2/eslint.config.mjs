import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

/**
 * Studio V2 ESLint 扁平配置。
 * 无理由 disable 由 check:comments 另行强制；此处保持推荐规则基线可通过。
 * 不启用 type-aware lint，避免空骨架阶段强依赖 projectService。
 */
export default tseslint.config(
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      "**/*.scss",
      "tests/**",
      // 本地门禁入口脚本；避免无 node globals 时对 process 误报
      "scripts/**",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "separate-type-imports" },
      ],
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
);
