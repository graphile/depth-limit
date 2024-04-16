// @ts-check
import assert from "node:assert";
import { describe, it } from "node:test";
import { parseAndValidate, jsonClone, __dirname } from "./utils.mjs";
import { readFileSync } from "node:fs";

/** @type {import("../dist/index.js").Options} */
const options = {
  revealDetails: true,
};

describe("mutations", () => {
  it("Create mutations", () => {
    const errors = parseAndValidate(
      readFileSync(`${__dirname}/queries/mutation-create.test.graphql`, "utf8"),
      options,
      "defaultOptions.1.graphql",
    );
    assert.deepEqual(jsonClone(errors), []);
  });
  it("Delete mutations", () => {
    const errors = parseAndValidate(
      readFileSync(`${__dirname}/queries/mutation-delete.test.graphql`, "utf8"),
      options,
      "defaultOptions.1.graphql",
    );
    assert.deepEqual(jsonClone(errors), []);
  });
  it("Return type mutations", () => {
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
  it("Update mutations", () => {
    const errors = parseAndValidate(
      readFileSync(`${__dirname}/queries/mutation-update.test.graphql`, "utf8"),
      options,
      "defaultOptions.1.graphql",
    );
    assert.deepEqual(jsonClone(errors), []);
  });
});
