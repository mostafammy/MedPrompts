import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".open-next/**",
    ".wrangler/**",
    "public/sw.js",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "node_modules/**",
    "dist/**",
    "coverage/**",
    "*.min.js",
  ]),
  {
    files: ["src/lib/**/*.ts"],
    rules: {
      "no-restricted-syntax": ["error", {
        selector: "CallExpression[callee.object.name='console'][callee.property.name='log']",
        message: "console.log is not allowed in lib directory. Use the logger instead."
      }]
    }
  },
  {
    rules: {
      "import/no-restricted-paths": ["error", {
        zones: [
          { target: "./src/lib/prompts/injector.ts", from: "./src/lib/db" },
          { target: "./src/lib/prompts/sanitizer.ts", from: "./src/lib/db" },
          { target: "./src/lib/prompts/slugifier.ts", from: "./src/lib/db" },
          { target: "./src/lib/prompts/service.ts", from: "./src/app" }
        ]
      }],
      "react-hooks/set-state-in-effect": "off"
    }
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_"
      }]
    }
  }
]);
export default eslintConfig;
