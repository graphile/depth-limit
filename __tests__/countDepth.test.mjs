// @ts-check
import { it } from "node:test";
import assert from "node:assert";
import { parse, Kind, getOperationAST } from "graphql";
import { countDepth } from "../dist/index.js";
import { schema } from "./utils.mjs";

const query = /* GraphQL */ `
  query FriendsOfFriends {
    currentUser {
      name
      friends {
        name
        friends {
          name
        }
      }
    }
  }
`;

it("works as in README", () => {
  const document = parse(query);
  const operationName = undefined;
  const fragments = document.definitions.filter(
    /** @type {(d: any) => d is import('graphql').FragmentDefinitionNode} */
    (d) => d.kind === Kind.FRAGMENT_DEFINITION,
  );
  const operation = getOperationAST(document, operationName);
  if (!operation) {
    throw new Error(
      `Could not determine operation, please check the operationName`,
    );
  }
  const { depths, resolvedOptions } = countDepth(schema, operation, fragments, {
    // Options here
  });
  assert.deepEqual(depths, {
    $$depth: 3,
    $$listDepth: 2,
    "Query.currentUser": 1,
    "User.name": 1,
    "User.friends": 2,
  });
});
