/** @type {import("eslint").Linter.Config} */
const config = {
  root: true,
  extends: ["@basebuilder/eslint-config"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    tsconfigRootDir: __dirname,
    project: true,
  },
  settings: {
    next: {
      rootDir: ["apps/docs"],
    },
  },
};

module.exports = config;
