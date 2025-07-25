import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "import/no-anonymous-default-export": "off",
    }
  },
  {
    files: ["src/__tests__/__mocks__/**/*"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "react/display-name": "off",
      "@next/next/no-img-element": "off",
      "jsx-a11y/alt-text": "off",
      "jsx-a11y/role-has-required-aria-props": "off",
      "jsx-a11y/label-has-associated-control": "off",
    }
  }
];

export default eslintConfig;
