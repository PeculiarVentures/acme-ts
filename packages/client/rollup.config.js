import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import babel from "rollup-plugin-babel";
import { terser } from "rollup-plugin-terser";

const pkg = require("./package.json");

const banner = [].join("\n");
const input = "src/index.ts";

const browserExternals = {
};
const browser = [
  {
    input,
    plugins: [
      resolve({
        mainFields: ["jsnext:main", "module", "main"],
        preferBuiltins: true,
      }),
      commonjs(),
      typescript({
        module: "ES2015",
        removeComments: true,
      }),
    ],
    external: Object.keys(browserExternals),
    output: [
      {
        file: pkg.browser,
        format: "es",
        globals: browserExternals,
      }
    ]
  },
  {
    input: pkg.browser,
    external: Object.keys(browserExternals),
    plugins: [
      babel({
        babelrc: false,
        runtimeHelpers: true,
        compact: false,
        comments: false,
        presets: [
          ["@babel/env", {
            targets: {
              // ie: "11",
              chrome: "60",
            },
            useBuiltIns: "entry",
            corejs: 3,
          }],
        ],
        plugins: [
          ["@babel/plugin-proposal-class-properties"],
          ["@babel/proposal-object-rest-spread"],
        ]
      }),
    ],
    output: [
      {
        banner,
        file: pkg.browser,
        globals: browserExternals,
        format: "iife",
        name: "acme",
      },
      {
        banner,
        file: pkg.browserMin,
        globals: browserExternals,
        format: "iife",
        name: "acme",
        plugins: [
          terser(),
        ]
      },
    ],
  },
];

export default [
  ...browser,
];