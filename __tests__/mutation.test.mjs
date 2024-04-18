// @ts-check
import assert from "node:assert";
import { describe, it } from "node:test";
import { parseAndValidate, jsonClone, __dirname } from "./utils.mjs";
import { readFileSync } from "node:fs";

/** @type {import("../dist/index.js").Options} */
const options = {
  revealDetails: true,
};

describe("mutation test", () => {
  it("works with create mutations", () => {
    const errors = parseAndValidate(
      readFileSync(`${__dirname}/queries/mutation-create.test.graphql`, "utf8"),
      options,
      "defaultOptions.1.graphql",
    );
    assert.deepEqual(jsonClone(errors), []);
  });
  it("works with delete mutations", () => {
    const errors = parseAndValidate(
      readFileSync(`${__dirname}/queries/mutation-delete.test.graphql`, "utf8"),
      options,
      "defaultOptions.1.graphql",
    );
    assert.deepEqual(jsonClone(errors), []);
  });
  it("works with return type mutations", () => {
    const errors = parseAndValidate(
      readFileSync(
        `${__dirname}/queries/mutation-return-types.test.graphql`,
        "utf8",
      ),
      options,
      "defaultOptions.1.graphql",
    );
    assert.deepEqual(jsonClone(errors), []);
  });
  it("works with update mutations", () => {
    const errors = parseAndValidate(
      readFileSync(`${__dirname}/queries/mutation-update.test.graphql`, "utf8"),
      options,
      "defaultOptions.1.graphql",
    );
    assert.deepEqual(jsonClone(errors), []);
  });
});
