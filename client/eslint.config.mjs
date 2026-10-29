import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // TEMPORARY (DEC-001): these MVP files are rewritten in WI-04..WI-08 and still
  // carry `any` casts and setState-in-effect. They are downgraded to warnings so
  // CI can enforce the rules on all new code. Delete this block in WI-13.
  {
    files: [
      "app/api/**/*.ts",
      "app/indents/**/*.tsx",
      "components/ItemEntryForm.tsx",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
