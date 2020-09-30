import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "rollup-plugin-typescript2";
import { getBabelOutputPlugin } from "@rollup/plugin-babel";
import { terser } from "rollup-plugin-terser";

// eslint-disable-next-line @typescript-eslint/no-var-requires, no-undef
const pkg = require("./package.json");

const banner = [].join("\n");
const input = "src/index.ts";

const browser = [
  {
    input,
    plugins: [
      resolve({
        mainFields: ["esnext", "module", "main"],
        preferBuiltins: true,
      }),
      commonjs(),
      typescript({
        check: true,
        clean: true,
        tsconfigOverride: {
          compilerOptions: {
            module: "es2015",
          }
        }
      }),
    ],
    output: [
      {
        banner,
        file: pkg.browser,
        format: "iife",
        plugins: [
          getBabelOutputPlugin({
            allowAllFormats: true,
            presets: [
              ["@babel/preset-env", {
                targets: {
                  chrome: "60"
                },
              }],
            ],
          }),
          terser({
            compress: {
              keep_classnames: true,
            },
            format: {
              comments: false,
            },
          }),
        ],
        name: "acme"
      }
    ]
  },
];

export default [
  ...browser,
];