import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import reactHooks from "eslint-plugin-react-hooks";

// Flat config (ESLint v9+). Migrated from the legacy .eslintrc.json.
// Scoped to .ts/.tsx to mirror the old `--ext .ts,.tsx` behaviour.
export default [
  {
    ignores: [
      "dist/**",
      "src-tauri/**",
      ".ruflo/**",
      ".claude-flow/**",
      ".swarm/**",
    ],
  },
  {
    files: ["**/*.{ts,tsx}"],
    ...js.configs.recommended,
  },
  ...tseslint.configs["flat/recommended"].map((config) => ({
    ...config,
    files: ["**/*.{ts,tsx}"],
  })),
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
];
