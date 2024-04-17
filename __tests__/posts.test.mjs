// @ts-check
import assert from "node:assert";
import { describe, it } from "node:test";
import { parseAndValidate, jsonClone, __dirname } from "./utils.mjs";
import { readFileSync } from "node:fs";

/** @type {import("../dist/index.js").Options} */
const options = {
  revealDetails: true,
};

describe("posts", () => {
  it("Fragments and aliases", () => {
    const errors = parseAndValidate(
      readFileSync(`${__dirname}/queries/posts.test.graphql`, "utf8"),
      options,
      "defaultOptions.1.graphql",
    );
    assert.deepEqual(jsonClone(errors), []);
  });
});
