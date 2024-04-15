# @graphile/depth-limit

A highly capable depth limiting
[GraphQL.js](https://github.com/graphql/graphql-js) validation rule to help
protect your server from malicious operations.

- Limits depth of field selections in an operation
- Limits number of times a list may be nested in an operation
- Has separate limits for introspection queries versus regular operations
- Can choose whether or not fragments should add to the depth limit (default:
  no)
- Can add limits for specific fields to say how many times they may be nested
  (e.g. allow "friends of friends" but deny "friends of friends of friends" via
  `{'User.friends': 2}`)

## FAQ

### Can I trust this module?

You're right to check! This module is maintained by
[Benjie Gillam](https://github.com/benjie), a member of the
[GraphQL Technical Steering Committee](https://github.com/graphql/graphql-wg/blob/main/GraphQL-TSC.md#tsc-members).

The module has no dependencies (though it does have a "peer" dependency of
`graphql`, of course!), so auditing should be straightforward.

The module is MIT licensed, so as it says in the license: THE SOFTWARE IS
PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

### Is this module Graphile-specific?

No! This rule should work for any server that allows customizing GraphQL.js
validation rules. It's not specific to PostGraphile, Gra*fast*, Grafserv or any
other Graphile software.

### Do I need this module?

GraphQL is a very powerful technology, but it must be handled carefully - it's
relatively easy for a bad actor to write a small GraphQL query that causes the
server to perform a disporportionaly large amount of work. For this reason, it's
highly recommended that you only accept
[trusted documents](https://benjie.dev/graphql/trusted-documents) to your
GraphQL server - like Facebook do internally.

If your GraphQL API is intended to be consumed by untrusted (or not fully
trusted) third parties then you cannot rely on the security benefits of the
Trusted Documents pattern, and thus you need to protect yourself from malicious
queries. This rule is one very easy to use piece of protection (though you
should note that it is not sufficient on its own, you should still use all the
common patterns of protecting your API: rate limiting, circuit breakers,
execution timeouts, enforcing pagination limits, body size limits, etc etc).

### Do I need this if I am using Trusted Documents (aka persisted queries)?

Even if you are using the
[Trusted Documents](https://benjie.dev/graphql/trusted-documents) (persisted
queries, stored operations, etc) pattern (which you should be if your API is
only intended to be consumed by your own websites, mobile apps and other
first-party software), this is still a useful validation rule.

Though Trusted Documents means that the concern of malicious operations is moot
(every document is trusted, so none are expected to be malicious), this rule
still helps to prevent your engineers from writing queries that are too complex
and could potentially be too costly for your server. It's reasonable, when using
Trusted Documents, to increase the limits as needed.

## Usage

Install the module with your package manager of choice:

```
yarn add @graphile/depth-limit
```

How you use it then depends on which server software you're using.

### graphql-http

Add `depthLimit()` to the `validationRules` list passed to the `createHandler`
call. Here's an example based on the "With `http`" usage example
[in the graphql-http docs](https://github.com/graphql/graphql-http/tree/9985b4fbb5b2316b3f6987e67f560ef1ce91a7b9?tab=readme-ov-file#with-http):

```ts
import http from "http";
import { createHandler } from "graphql-http/lib/use/http";
import { depthLimit } from "@graphile/depth-limit";
import { schema } from "./schema.js";

// Create the GraphQL over HTTP handler
export const handler = createHandler({
  schema,
  validationRules: [
    depthLimit({
      // Options here
    }),
  ],
});
```

### Envelop

If you're using the excellent
[envelop plugin system](https://the-guild.dev/graphql/envelop) for GraphQL you
can use our handy `useDepthLimit` export to build an envelop plugin to add the
validation rule:

```ts
import * as GraphQLJS from "graphql";
import { envelop, useEngine } from "@envelop/core";
import { useDepthLimit } from "@graphile/depth-limit";

const getEnveloped = envelop({
  plugins: [
    useEngine(GraphQLJS),
    useDepthLimit({
      // Options here
    }),
  ],
});
```

### Yoga

With GraphQL Yoga, you'll follow a similar setup as with Envelop above; see the
documentation on
[Yoga plugins](https://the-guild.dev/graphql/yoga-server/docs/features/envelop-plugins).

```ts
import { createYoga } from "graphql-yoga";
import { useDepthLimit } from "@graphile/depth-limit";

const yoga = createYoga({
  plugins: [
    useDepthLimit({
      // Options here
    }),
  ],
});
```

### Raw GraphQL.js

If you're using the `graphql` module from npm directly, import the `depthLimit`
factory function and use its result alongside the `specifiedRules` (the rules
from the GraphQL specification) when validating a GraphQL operation:

```ts
import { depthLimit } from "@graphile/depth-limit";
import { validate, specifiedRules, parse, execute } from "graphql";

const allValidationRules = [
  // ❗ Don't forget to use the built in GraphQL validation rules!
  ...specifiedRules,

  //👇👇👇👇
  depthLimit({
    // Options here
  }),
  //👆👆👆👆
];

// This is just an example (and assumes the schema has already been validated).
// The `validate()` call is the part that would differ from what you would
// normally have; in particular the optional third argument is specified.
export function executeGraphQLRequest(
  schema: GraphQLSchema,
  source: string,
  variableValues?: Record<string, any>,
) {
  let document;
  try {
    document = parse(source);
  } catch (syntaxError) {
    return {
      errors: [syntaxError],
    };
  }

  //                                        👇👇👇👇👇👇👇👇👇
  const errors = validate(schema, document, allValidationRules);
  //                                        👆👆👆👆👆👆👆👆👆

  if (errors.length > 0) {
    return { errors };
  }

  return execute({ schema, document, variableValues });
}
```

## Options

No matter how you load this validation rule, it accepts the same options:

````ts
export type Options = {
  /**
   * How many selection sets deep may the user query?
   *
   * @defaultValue `12`
   */
  maxDepth?: number;

  /**
   * How many selection sets deep may the user query in introspection?
   *
   * @defaultValue `12`
   */
  maxIntrospectionDepth?: number;

  /**
   * How many nested lists deep may the user query?
   *
   * @defaultValue `4`
   */
  maxListDepth?: number;

  /**
   * How many nested lists deep may the user query in introspection?
   *
   * @defaultValue `3`
   */
  maxIntrospectionListDepth?: number;

  /**
   * Set `true` if you want fragments to add to the depth; not recommended.
   *
   * @defaultValue `false`
   */
  fragmentsAddToDepth?: boolean;

  /**
   * Limits the number of times a particular field coordinate can be nested
   * inside itself; for example:
   *
   * ```
   * maxDepthByFieldCoordinates: {
   *   'User.friends': 2,
   * }
   * ```
   *
   * Would allow you to load a users friends, or their friends of friends, but
   * not their friends of friends of friends.
   */
  maxDepthByFieldCoordinates?: Record<string, number>;

  /**
   * If true, informs the user what the issues are. Setting this to true could
   * have security ramifications as it will make it easier for an attacker to
   * determine your limits (however, this could be derived with minimal effort
   * also, so is potentially not a big deal).
   *
   * @defaultValue `false`
   */
  revealDetails?: boolean;
};
````

### How to choose the right options for you

Firstly, we've set the introspection defaults to allow the most common
introspection queries to pass validation, so you shouldn't need to customize
those unless you're doing something fancy.

The two main options you should look at customizing are `listDepth` and `depth`.

If you're starting from scratch you should set your settings low, and work your
way up as you need to. If you have an existing server then it may make sense to
track your queries for a while and figure out the higest values used (see the
`countDepth` function below), and set your limits to that to prevent more
complex queries.

Ultimately, tuning these parameters is more of an art than a science, and this
is one reason why this validation rule isn't a built in feature of the `graphql`
module or, indeed, the specification.

#### listDepth

`listDepth` you should set to the lowest value you can tolerate; something like
2, 3 or 4. It's unlikely that your users are successfully paginating through
collections that are deeper than this. Note: listDepth only counts selection
sets inside of lists, so scalar lists are ignored and do not add to the count,
this is by design.

#### depth

`depth` should also be set to a suitably low value, although it's much more
acceptable to grow this one. One of the common introspection queries requires a
depth of 12 (primarily due to `ofType { ofType { ofType { ... } } }` for
determining the type of a field or argument), so this is the default we use, but
lower would be better. Note that if your schema uses the Relay Cursor Connection
pattern it may end up requiring deeper limits than you might realise.

#### maxDepthByFieldCoordinates

If you have a particular cycle in your schema you would like to prevent people
traversing too many times (for example you might have `User.friends` which
returns `[User]`, and thus you could query it as
`{ currentUser { friends { friends { friends { friends { ... } } } } } }`) then
you can set specific limits on the number of times a particular field may be
referenced recursively by specifying a numeric limit for its
[schema coordinate](), for example:

```ts
import { depthLimit } from "@graphile/depth-limit";

export const rule = depthLimit({
  maxDepthByFieldCoordinates: {
    // Allow `{ currentUser { friends { friends { name } } } }`
    // But forbid `{ currentUser { friends { friends { friends { name } } } } }`
    "User.friends": 2,
  },
});
```

## Community-funded open-source software

I love GraphQL (hence the name: Graphile!) and I am a firm believer in the
benefits of open source software; but I don't have time to write awesome
software like this _and_ go out and earn a days wages. If you use this
validation rule, please consider
[sponsoring me](https://github.com/sponsors/benjie)\* so I can keep maintaining
and building this kind of critical software, and maybe I'll even get a chance to
[work through my mountain of GraphQL spec PRs](https://github.com/graphql/graphql-spec/pulls?q=is%3Apr+is%3Aopen+sort%3Aupdated-desc+author%3Abenjie).
Thanks for considering sponsoring me, there's no way this project would exist
without the support of my sponsors.

\* _Other sponsorship methods are available, if you're interested drop me an
email on my GitHub handle at graphile.com._

## `countDepth`

This function returns the depths seen in a given operation to help you to figure
out what good values to set for your options are. Most options are ignored here,
the main (only?) one that impacts the result of `depths` is
`fragmentsAddToDepth`.

```ts
import { countDepth } from "@graphile/depth-limit";
import { parse } from "graphql";
import { schema } from "./schema.js";

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

const document = parse(query);
const operationName = undefined;
const fragments = document.definitions.filter(
  /** @type {(d: any) => d is import('graphql').FragmentDefinitionNode} */
  (d) => d.kind === Kind.FRAGMENT_DEFINITION,
);
const operation = getOperationAST(document, operationName);
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
```

## Caveats

We count fields on their current named type whilst traversing the document; this
type could be an object, interface, or union type. Therefore, a field that
exists on an interface would be counted as a different coordinate depending on
if the user accesses it via the interface directly or one of the
implementations.
