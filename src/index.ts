import {
  FieldNode,
  FragmentDefinitionNode,
  FragmentSpreadNode,
  GraphQLError,
  GraphQLNamedType,
  GraphQLType,
  InlineFragmentNode,
  Kind,
  OperationDefinitionNode,
  SchemaMetaFieldDef,
  TypeMetaFieldDef,
  TypeNameMetaFieldDef,
  ValidationRule,
  getNamedType,
  isListType,
  isNonNullType,
  isObjectType,
} from "graphql";

const DEPTH = "$$depth";
const INTROSPECTION_DEPTH = "$$introspectionDepth";
const LIST_DEPTH = "$$listDepth";

interface DepthByCoordinate {
  [DEPTH]?: number;
  [INTROSPECTION_DEPTH]?: number;
  [LIST_DEPTH]?: number;
  "Query.__schema"?: number;
  "Query.__type"?: number;
  "__Type.fields"?: number;
  "__Type.inputFields"?: number;
  "__Type.interfaces"?: number;
  "__Type.ofType"?: number;
  "__Type.possibleTypes"?: number;
  "__Field.args"?: number;
  "__Field.type"?: number;
  [coordinate: string]: number | undefined;
}

export type Options = {
  /** How many selection sets deep may the user query? */
  maxDepth?: number;
  /** How many selection sets deep may the user query in introspection? */
  maxIntrospectionDepth?: number;
  /** How many nested lists deep may the user query? */
  maxListDepth?: number;
  /** Set `true` if you want fragments to add to the depth; not recommended. */
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
   */
  revealDetails?: boolean;
};

/**
 * Returns a GraphQL validation rule that can be used to limit the depth of a
 * GraphQL operation based on a number of settings.
 */
export function maxDepth(options: Options = {}): ValidationRule {
  const {
    maxDepth = 12,
    maxListDepth = 4,
    maxIntrospectionDepth = 12,
    maxDepthByFieldCoordinates: userSpecifiedMaxDepthByFieldCoordinates,
    revealDetails = false,
    fragmentsAddToDepth = false,
  } = options;
  const maxDepthByFieldCoordinates: DepthByCoordinate = Object.assign(
    Object.create(null),
    {
      "Query.__schema": 1,
      "Query.__type": 1,
      "__Type.fields": 1,
      "__Type.inputFields": 1,
      "__Type.interfaces": 1,
      "__Type.ofType": 10,
      "__Type.possibleTypes": 1,
      "__Field.args": 1,
      "__Field.type": 1,
      ...userSpecifiedMaxDepthByFieldCoordinates,
      [DEPTH]: maxDepth,
      [INTROSPECTION_DEPTH]: maxIntrospectionDepth,
      [LIST_DEPTH]: maxListDepth,
    },
  );
  return function (context) {
    const depthByFragment = new Map<string, Readonly<DepthByCoordinate>>();
    const countDepth = (
      currentType: GraphQLNamedType,
      node:
        | OperationDefinitionNode
        | FieldNode
        | InlineFragmentNode
        | FragmentSpreadNode
        | FragmentDefinitionNode,
      visitedFragments: ReadonlyArray<string>,
      depthKey: typeof DEPTH | typeof INTROSPECTION_DEPTH,
    ): Readonly<DepthByCoordinate> => {
      switch (node.kind) {
        case Kind.OPERATION_DEFINITION:
        case Kind.FIELD:
        case Kind.INLINE_FRAGMENT:
        case Kind.FRAGMENT_DEFINITION: {
          const currentState: DepthByCoordinate = Object.create(null);
          const currentFieldCoord =
            node.kind === "Field"
              ? `${currentType.name}.${node.name.value}`
              : null;
          if (currentFieldCoord) {
            incr(currentState, currentFieldCoord, 1);
          }

          // Fields don't always have a selection set
          if (node.selectionSet) {
            if (fragmentsAddToDepth || node.kind === "Field") {
              incr(currentState, depthKey, 1);
            }
            const type = (() => {
              switch (node.kind) {
                case Kind.OPERATION_DEFINITION: {
                  return currentType;
                }
                case Kind.FIELD: {
                  if (isObjectType(currentType)) {
                    const fieldName = node.name.value;
                    const field =
                      fieldName === "__type"
                        ? TypeMetaFieldDef
                        : fieldName === "__schema"
                          ? SchemaMetaFieldDef
                          : fieldName === "__typename"
                            ? TypeNameMetaFieldDef
                            : currentType.getFields()[node.name.value];
                    if (field) {
                      incr(currentState, LIST_DEPTH, listDepth(field.type));
                      return getNamedType(field.type);
                    } else {
                      return null;
                    }
                  }
                  break;
                }
                case Kind.INLINE_FRAGMENT: {
                  if (node.typeCondition) {
                    return context
                      .getSchema()
                      .getType(node.typeCondition.name.value);
                  } else {
                    return currentType;
                  }
                }
                case Kind.FRAGMENT_DEFINITION: {
                  return context
                    .getSchema()
                    .getType(node.typeCondition.name.value);
                }
                default: {
                  const never: never = node;
                  throw new Error(`Unhandled node kind ${(never as any).kind}`);
                }
              }
            })();
            if (type) {
              const baseDepth = currentState[DEPTH] ?? 0;
              const baseIntrospectionDepth =
                currentState[INTROSPECTION_DEPTH] ?? 0;
              const baseListDepth = currentState[LIST_DEPTH] ?? 0;
              const baseCurrentFieldDepth = currentFieldCoord
                ? currentState[currentFieldCoord] ?? 0
                : 0;
              for (const child of node.selectionSet.selections) {
                const isIntrospectionField =
                  child.kind === Kind.FIELD &&
                  child.name.value.startsWith("__");
                const innerDepth = countDepth(
                  type,
                  child,
                  visitedFragments,
                  // Once you go introspection, you can never go back
                  isIntrospectionField ? INTROSPECTION_DEPTH : depthKey,
                );
                const fieldCoord =
                  child.kind === Kind.FIELD
                    ? `${currentType.name}.${child.name.value}`
                    : null;
                if (fieldCoord && !currentState[fieldCoord]) {
                  currentState[fieldCoord] = 1;
                }
                for (const coord of Object.keys(innerDepth)) {
                  const score =
                    (innerDepth[coord] ?? 0) +
                    // Fields automatically add to depth
                    (coord === currentFieldCoord
                      ? baseCurrentFieldDepth
                      : coord === DEPTH
                        ? baseDepth
                        : coord === INTROSPECTION_DEPTH
                          ? baseIntrospectionDepth
                          : coord === LIST_DEPTH
                            ? baseListDepth
                            : 0);
                  // Only overwrite value if new score is higher
                  if (
                    currentState[coord] === undefined ||
                    currentState[coord]! < score
                  ) {
                    currentState[coord] = score;
                  }
                }
              }
            }
          }
          return currentState;
        }
        case Kind.FRAGMENT_SPREAD: {
          const fragmentName = node.name.value;
          const existing = depthByFragment.get(fragmentName);
          if (existing) {
            return existing;
          }
          if (visitedFragments.includes(fragmentName)) {
            // Recursion detected; this should be handled by a different
            // validation rule.
            return {};
          }
          const fragment = context.getFragment(fragmentName);
          if (!fragment) {
            // Non-existant fragment detected; this should be handled by a
            // different validation rule.
            return {};
          }
          const fragmentDepth = countDepth(
            currentType,
            fragment,
            [...visitedFragments, fragmentName],
            depthKey,
          );
          depthByFragment.set(fragmentName, fragmentDepth);
          return fragmentDepth;
        }
        default: {
          const never: never = node;
          throw new Error(`Unexpected node type ${(never as any).kind}`);
        }
      }
    };
    return {
      // TODO: refactor this to use the existing visitors rather than recursing ourselves
      OperationDefinition: {
        enter(operation) {
          const operationName = operation.name?.value ?? "(anonymous)";
          const schema = context.getSchema();
          // TODO: is this equivalent to context.getType()?
          const operationType =
            operation.operation === "query"
              ? schema.getQueryType()
              : operation.operation === "mutation"
                ? schema.getMutationType()
                : operation.operation === "subscription"
                  ? schema.getSubscriptionType()
                  : null;
          if (operationType) {
            const depths = countDepth(operationType, operation, [], DEPTH);
            const issues: string[] = [];
            for (const coordinate of Object.keys(depths)) {
              const score = depths[coordinate]!;
              const maxScore = maxDepthByFieldCoordinates[coordinate];
              if (maxScore !== undefined && score > maxScore) {
                if (coordinate.includes(".")) {
                  issues.push(
                    `field ${coordinate} nested ${score} times which exceeds maximum of ${maxScore}`,
                  );
                } else {
                  switch (coordinate) {
                    case DEPTH: {
                      issues.push(
                        `operation depth ${score} exceeds maximum of ${maxScore}`,
                      );
                      break;
                    }
                    case INTROSPECTION_DEPTH: {
                      issues.push(
                        `operation introspection depth ${score} exceeds maximum of ${maxScore}`,
                      );
                      break;
                    }
                    case LIST_DEPTH: {
                      issues.push(
                        `operation list depth ${score} exceeds maximum of ${maxScore}`,
                      );
                      break;
                    }
                    default: {
                      issues.push(
                        `[internal error] coordinate '${coordinate}' not understood`,
                      );
                    }
                  }
                }
              }
            }
            if (issues.length > 0) {
              // TODO: if revealDetails is true, we should indicate the nodes
              // where the limit was exceeded. We could do so by building a
              // "stack" of nodes adding to the limit, rather than incrementing
              // a counter, and thus we can find the nth position in the stack.
              return context.reportError(
                new GraphQLError(
                  `'${operationName}' exceeds operation depth limits${revealDetails ? `: ${issues.join(", ")}` : ""}.`,
                  [operation],
                ),
              );
            }
          }
        },
      },
    };
  };
}

function incr(
  mutableState: DepthByCoordinate,
  coordinate: string,
  by = 1,
): void {
  if (mutableState[coordinate] !== undefined) {
    mutableState[coordinate]! += by;
  } else {
    mutableState[coordinate] = by;
  }
}

function listDepth(type: GraphQLType) {
  let d = 0;
  let t = type;
  do {
    if (isListType(t)) {
      d++;
      t = t.ofType;
    } else if (isNonNullType(t)) {
      t = t.ofType;
    } else {
      break;
    }
  } while (t && d < 100);
  return d;
}
