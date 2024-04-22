module.exports = {
  parserOptions: {
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:import/errors",
    "plugin:import/typescript",
    "prettier",
  ],
  plugins: ["tsdoc", "simple-import-sort", "import"],
  env: {
    node: true,
    es6: true,
  },
  rules: {
    "@typescript-eslint/ban-ts-comment": "off",
    "@typescript-eslint/ban-ts-ignore": "off",
    "@typescript-eslint/camelcase": "off",
    "@typescript-eslint/no-empty-function": "off",
    "@typescript-eslint/no-empty-interface": "off",
    "@typescript-eslint/no-namespace": "off",
    "@typescript-eslint/no-use-before-define": "off",
    "@typescript-eslint/no-var-requires": "off",
    "@typescript-eslint/consistent-type-imports": "error",
    "no-confusing-arrow": 0,
    "no-else-return": 0,
    "no-underscore-dangle": 0,
    "no-restricted-syntax": 0,
    "no-await-in-loop": 0,
    "tsdoc/syntax": 2,

    // Rules that we should enable:
    "@typescript-eslint/no-inferrable-types": "warn",
    "no-inner-declarations": "warn",

    // Rules we've disabled for now because they're so noisy (but we should really address)
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        args: "after-used",
        ignoreRestSiblings: true,
      },
    ],

    /*
     * simple-import-sort seems to be the most stable import sorting currently,
     * disable others
     */
    "simple-import-sort/imports": "error",
    "simple-import-sort/exports": "error",
    "sort-imports": "off",
    "import/order": "off",

    "import/extensions": ["error", "ignorePackages"],
    "import/no-deprecated": "warn",

    // Apply has been more optimised than spread, use whatever feels right.
    "prefer-spread": "off",

    // note you must disable the base rule as it can report incorrect errors
    "no-duplicate-imports": "off",
    "import/no-duplicates": "error",
  },
  overrides: [
    // Rules for interfaces.ts files
    {
      files: ["**/interfaces.ts"],
      rules: {
        "no-restricted-syntax": [
          "error",
          {
            selector: "TSModuleDeclaration[kind='global']",
            message:
              "No `declare global` allowed in `interface.ts` files since these type-only files may not be imported by dependents, recommend adding to `index.ts` instead.",
          },
        ],
      },
    },

    // Rules for TypeScript only
    {
      files: ["*.ts", "*.tsx"],
      parser: "@typescript-eslint/parser",
      rules: {
        "no-dupe-class-members": "off",
        "no-undef": "off",
        // This rule doesn't understand import of './js'
        "import/no-unresolved": "off",
      },
    },

    // Rules for JavaScript only
    {
      files: ["*.js", "*.jsx", "*.mjs", "*.cjs"],
      rules: {
        "tsdoc/syntax": "off",
        "import/extensions": "off",
      },
    },

    // Stricter rules for source code
    {
      files: ["*/*/src/**/*.ts", "*/*/src/**/*.tsx"],
      extends: [
        "plugin:@typescript-eslint/recommended-requiring-type-checking",
      ],
      parser: "@typescript-eslint/parser",
      parserOptions: {
        project: true,
      },
      rules: {},
    },

    // Rules for tests only
    {
      files: ["**/__tests__/**/*.{ts,mts,js,mjs}"],
      rules: {
        // Disable these to enable faster test writing
        "prefer-const": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-unused-vars": "off",
        "@typescript-eslint/explicit-function-return-type": "off",

        // We don't normally care about race conditions in tests
        "require-atomic-updates": "off",
      },
    },

    // Don't use Node.js builtins
    {
      files: ["src/**"],
      rules: {
        "@typescript-eslint/no-restricted-imports": [
          "error",
          {
            paths: [
              "assert",
              "buffer",
              "child_process",
              "cluster",
              "crypto",
              "dgram",
              "dns",
              "domain",
              "events",
              "freelist",
              "fs",
              "fs/promises",
              { name: "http", allowTypeImports: true },
              "https",
              "module",
              "net",
              "os",
              "path",
              "punycode",
              "querystring",
              "readline",
              "repl",
              "smalloc",
              "stream",
              "string_decoder",
              "sys",
              "timers",
              "tls",
              "tracing",
              "tty",
              "url",
              "util",
              "vm",
              "zlib",
            ],
            patterns: ["node:*"],
          },
        ],
      },
    },
  ],
};
