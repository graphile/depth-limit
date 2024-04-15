// @ts-check
import assert from "node:assert";
import { describe, it } from "node:test";
import { parseAndValidate, jsonClone } from "./utils.mjs";

/** @type {import("../dist/index.js").Options} */
const options = {
  maxListDepth: 5,
  maxDepth: 10,
  revealDetails: true,
};

describe("doesn't die on invalid queries", () => {
  it("direct recursive fragments", () => {
    const errors = parseAndValidate(
      /* GraphQL */ `
        query FoFoFoFoF {
          currentUser {
            ...F1
          }
        }
        fragment F1 on User {
          friends {
            ...F1
          }
        }
      `,
      options,
    );
    assert.deepEqual(jsonClone(errors), []);
  });
  it("indirect recursive fragments", () => {
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
            ...F1
          }
        }
      `,
      options,
    );
    assert.deepEqual(jsonClone(errors), []);
  });

  it("non-existent fragments", () => {
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
            ...NonExistantFragment
          }
        }
      `,
      options,
    );
    assert.deepEqual(jsonClone(errors), []);
  });

  it("non-existent fields", () => {
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
          nonExistentField {
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
});
