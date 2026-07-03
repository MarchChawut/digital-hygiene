import next from "eslint-config-next";

/** @type {import('eslint').Linter.Config[]} */
const config = [
  {
    ignores: [".next/**", "node_modules/**", "src/lib/generated/**"],
  },
  ...next,
];

export default config;
