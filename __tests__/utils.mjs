// @ts-check
import { buildSchema, parse, validate } from "graphql";
import { depthLimit } from "../dist/index.js";

export const schema = buildSchema(/* GraphQL */ `
  type Query {
    currentUser: User
  }
  type User {
    name: String
    "Same object again"
    self: User
    otherSelf: User
    friends: [User!]!
    friendsConnection: UserConnection!
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
export function parseAndValidate(operationText, options) {
  const document = parse(operationText);
  const rule = depthLimit(options);
  const errors = validate(schema, document, [rule]);
  return errors;
}

/**
 * @param {any} obj
 */
export function jsonClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}
