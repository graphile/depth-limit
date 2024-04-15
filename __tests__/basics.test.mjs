// @ts-check
import assert from "node:assert";
import { describe, it } from "node:test";
import { parseAndValidate, jsonClone } from "./utils.mjs";

describe("basics", () => {
  it("friends^6", () => {
    const errors = parseAndValidate(
      /* GraphQL */ `
        query FoFoFoFoFoF {
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
        revealDetails: true,
      },
    );
    assert.deepEqual(jsonClone(errors), [
      {
        message:
          "'FoFoFoFoFoF' exceeds operation depth limits: operation list depth 6 exceeds maximum of 5.",
        locations: [
          {
            line: 2,
            column: 9,
          },
        ],
      },
    ]);
  });
});
