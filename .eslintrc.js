/** @type {import("eslint").Linter.Config} */
const config = {
  root: true,
  extends: ["@coltorapps/eslint-config"],
  parserOptions: {
    ecmaVersion: "latest",
    tsconfigRootDir: __dirname,
    project: true,
  },
  settings: {
    next: {
      rootDir: ["docs"],
    },
  },
};

module.exports = config;
