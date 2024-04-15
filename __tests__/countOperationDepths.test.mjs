// @ts-check
import { it } from "node:test";
import assert from "node:assert";
import { countOperationDepths } from "../dist/index.js";

it("works as in README", () => {
  const schema = /* GraphQL */ `
    type Query {
      currentUser: User
    }
    type User {
      name: String
      friends: [User!]!
    }
    type Mutation {
      addFriend(id: ID!): AddFriendPayload
    }
    type AddFriendPayload {
      query: Query
    }
  `;

  const source = /* GraphQL */ `
    query FriendsOfFriends {
      ...FoF
    }
    mutation AddFriend($id: ID!) {
      addFriend(id: $id) {
        query {
          ...FoF
        }
      }
    }
    fragment FoF on Query {
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

  const depthsByOperationName = countOperationDepths(schema, source);

  assert.deepEqual(depthsByOperationName, {
    FriendsOfFriends: {
      $$depth: 3,
      $$listDepth: 2,
      "Query.currentUser": 1,
      "User.name": 1,
      "User.friends": 2,
    },
    AddFriend: {
      $$depth: 5,
      $$listDepth: 2,
      "Mutation.addFriend": 1,
      "AddFriendPayload.query": 1,
      "Query.currentUser": 1,
      "User.name": 1,
      "User.friends": 2,
    },
  });
});
