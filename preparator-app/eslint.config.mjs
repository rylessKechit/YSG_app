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
      // Désactivation des règles ESLint demandées
      "react/no-unescaped-entities": "off",
      "@typescript-eslint/no-require-imports": "off", 
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      // Désactivation des règles React Hooks
      "react-hooks/exhaustive-deps": "off",
      // Désactivation des avertissements Next.js sur les images
      "@next/next/no-img-element": "off"
    }
  }
];

export default eslintConfig;