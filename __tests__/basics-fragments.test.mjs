// @ts-check
import assert from "node:assert";
import { describe, it } from "node:test";
import { parseAndValidate, jsonClone } from "./utils.mjs";

/** @type {import("../dist/index.js").Options} */
const options = {
  maxDepth: 10,
  maxListDepth: 5,
  maxSelfReferentialDepth: 20,
  revealDetails: true,
};

describe("basics-fragments", () => {
  it("allows friends^5", () => {
    const errors = parseAndValidate(
      /* GraphQL */ `
        query FoFoFoFoF {
          currentUser {
            ...F1
          }
        }
        fragment F1 on User {
          friends {
            ...F2
          }
        }
        fragment F2 on User {
          friends {
            ...F3
          }
        }
        fragment F3 on User {
          friends {
            ...F4
          }
        }
        fragment F4 on User {
          friends {
            ...F5
          }
        }
        fragment F5 on User {
          friends {
            name
          }
        }
      `,
      options,
    );
    assert.deepEqual(jsonClone(errors), []);
  });

  it("rejects friends^6", () => {
    const errors = parseAndValidate(
      /* GraphQL */ `
        query FoFoFoFoFoF {
          currentUser {
            ...F1
          }
        }
        fragment F1 on User {
          friends {
            ...F2
          }
        }
        fragment F2 on User {
          friends {
            ...F3
          }
        }
        fragment F3 on User {
          friends {
            ...F4
          }
        }
        fragment F4 on User {
          friends {
            ...F5
          }
        }
        fragment F5 on User {
          friends {
            ...F6
          }
        }
        fragment F6 on User {
          friends {
            name
          }
        }
      `,
      options,
    );
    assert.deepEqual(jsonClone(errors), [
      {
        message:
          "'FoFoFoFoFoF' exceeds operation depth limits: " +
          "operation list depth 6 exceeds maximum of 5.",
        locations: [
          {
            line: 2,
            column: 9,
          },
        ],
      },
    ]);
  });

  it("allows self^9", () => {
    const errors = parseAndValidate(
      /* GraphQL */ `
        query Self9 {
          currentUser {
            self {
              ...F1
            }
          }
        }
        fragment F1 on User {
          self {
            ...F2
          }
        }
        fragment F2 on User {
          self {
            ...F3
          }
        }
        fragment F3 on User {
          self {
            ...F4
          }
        }
        fragment F4 on User {
          self {
            ...F5
          }
        }
        fragment F5 on User {
          self {
            ...F6
          }
        }
        fragment F6 on User {
          self {
            ...F7
          }
        }
        fragment F7 on User {
          self {
            ...F8
          }
        }
        fragment F8 on User {
          self {
            name
          }
        }
      `,
      options,
    );
    assert.deepEqual(jsonClone(errors), []);
  });

  it("rejects self^10", () => {
    const errors = parseAndValidate(
      /* GraphQL */ `
        query Self10 {
          currentUser {
            self {
              ...F1
            }
          }
        }
        fragment F1 on User {
          self {
            ...F2
          }
        }
        fragment F2 on User {
          self {
            ...F3
          }
        }
        fragment F3 on User {
          self {
            ...F4
          }
        }
        fragment F4 on User {
          self {
            ...F5
          }
        }
        fragment F5 on User {
          self {
            ...F6
          }
        }
        fragment F6 on User {
          self {
            ...F7
          }
        }
        fragment F7 on User {
          self {
            ...F8
          }
        }
        fragment F8 on User {
          self {
            ...F9
          }
        }
        fragment F9 on User {
          self {
            name
          }
        }
      `,
      options,
    );
    assert.deepEqual(jsonClone(errors), [
      {
        message:
          "'Self10' exceeds operation depth limits: " +
          "operation depth 11 exceeds maximum of 10.",
        locations: [
          {
            line: 2,
            column: 9,
          },
        ],
      },
    ]);
  });

  it("supports custom limit", () => {
    const errors = parseAndValidate(
      /* GraphQL */ `
        query FoFoF {
          currentUser {
            ...F1
          }
        }
        fragment F1 on User {
          friends {
            ...F2
          }
        }
        fragment F2 on User {
          friends {
            ...F3
          }
        }
        fragment F3 on User {
          friends {
            name
          }
        }
      `,
      {
        ...options,
        maxDepthByFieldCoordinates: {
          // Permit friends of friends, but don't allow going any deeper
          "User.friends": 2,
        },
      },
    );
    assert.deepEqual(jsonClone(errors), [
      {
        message:
          "'FoFoF' exceeds operation depth limits: " +
          "field User.friends nested 3 times which exceeds maximum of 2.",
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
