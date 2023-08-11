/** @type {import("eslint").Linter.Config} */
const config = {
  root: true,
  extends: ["@builder/eslint-config"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    tsconfigRootDir: __dirname,
    project: true,
  },
  settings: {
    next: {
      rootDir: ["apps/web"],
    },
  },
};

module.exports = config;
