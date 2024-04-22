// @ts-check
import assert from "node:assert";
import { describe, it } from "node:test";
import { parseAndValidate, jsonClone, __dirname } from "./utils.mjs";
import { readFileSync } from "node:fs";

/** @type {import("../dist/index.js").Options} */
const options = {
  revealDetails: true,
};

describe("directives", () => {
  it("Works with skip and include", () => {
    const errors = parseAndValidate(
      readFileSync(`${__dirname}/queries/directives.test.graphql`, "utf8"),
      options,
      "defaultOptions.1.graphql",
    );
    assert.deepEqual(jsonClone(errors), []);
  });
  it("Works with skip and include on additional levels", () => {
    const errors = parseAndValidate(
      readFileSync(
        `${__dirname}/queries/directives-additional.test.graphql`,
        "utf8",
      ),
      options,
      "defaultOptions.1.graphql",
    );
    assert.deepEqual(jsonClone(errors), []);
  });
  it("Works with skip and include with fragments", () => {
    const errors = parseAndValidate(
      readFileSync(
        `${__dirname}/queries/directives-fragments.test.graphql`,
        "utf8",
      ),
      options,
      "defaultOptions.1.graphql",
    );
    assert.deepEqual(jsonClone(errors), []);
  });
});
