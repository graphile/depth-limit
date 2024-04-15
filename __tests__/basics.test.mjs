// @ts-check
import assert from "node:assert";
import { describe, it } from "node:test";
import { buildSchema, validate, parse } from "graphql";
import { maxDepth } from "../dist/index.js";

const schema = buildSchema(/* GraphQL */ `
  type Query {
    currentUser: User
  }
  type User {
    name: String
    settings: UserSettings
    friends: [User!]!
    friendsConnection: UserConnection!
  }
  type UserSettings {
    sendNotifications: Boolean
  }
  type UserConnection {
    edges: [FriendEdge]!
    pageInfo: PageInfo
  }
  type PageInfo {
    hasNextPage: Boolean
  }
  type FriendEdge {
    cursor: String!
    node: User
  }
`);

/**
 * @param {string} operationText
 * @param {import("../dist/index.js").Options} [options]
 */
function doValidate(operationText, options) {
  const document = parse(operationText);
  const rule = maxDepth(options);
  const errors = validate(schema, document, [rule]);
  return errors;
}

describe("depth limit", () => {
  it("works", () => {
    const errors = doValidate(
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
