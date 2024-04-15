// @ts-check
import assert from "node:assert";
import { describe, it } from "node:test";
import { getIntrospectionQuery } from "graphql";
import { parseAndValidate, jsonClone } from "./utils.mjs";

describe("introspection", () => {
  it("allows default introspection query", () => {
    const errors = parseAndValidate(getIntrospectionQuery());
    assert.deepEqual(jsonClone(errors), []);
  });

  it("allows thorough introspection query", () => {
    const errors = parseAndValidate(
      getIntrospectionQuery({
        descriptions: true,
        specifiedByUrl: true,
        schemaDescription: true,
        directiveIsRepeatable: true,
        inputValueDeprecation: true,
      }),
    );
    assert.deepEqual(jsonClone(errors), []);
  });
});
