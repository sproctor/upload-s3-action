module.exports = {
  env: {
    es2021: true,
    node: true,
    jest: true
  },
  extends: 'standard-with-typescript',
  overrides: [
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
  },
  plugins: ["@typescript-eslint", "jest"]
}
