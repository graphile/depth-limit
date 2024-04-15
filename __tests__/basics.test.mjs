// @ts-check
import assert from "node:assert";
import { describe, it } from "node:test";
import { parseAndValidate } from "./utils.mjs";

describe("depth limit", () => {
  it("works", () => {
    const errors = parseAndValidate(
      /* GraphQL */ `
        {
          currentUser {
            friends {
              friends {
                friends {
                  friends {
                    friends {
                      friends {
                        name
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `,
      {
        maxListDepth: 5,
      },
    );
    assert.ok(errors.length > 0, "Expected an error");
  });
});
