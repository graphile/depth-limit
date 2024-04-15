import {
  FieldNode,
  FragmentDefinitionNode,
  FragmentSpreadNode,
  GraphQLError,
  GraphQLNamedType,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLType,
  InlineFragmentNode,
  Kind,
  OperationDefinitionNode,
  SchemaMetaFieldDef,
  Source,
  TypeMetaFieldDef,
  TypeNameMetaFieldDef,
  ValidationRule,
  buildSchema,
  getNamedType,
  isListType,
  isNonNullType,
  isObjectType,
  parse,
} from "graphql";
import {
  Options,
  DepthByCoordinate,
  DEPTH,
  INTROSPECTION_DEPTH,
  LIST_DEPTH,
  INTROSPECTION_LIST_DEPTH,
} from "./interfaces.js";

export { useDepthLimit } from "./envelop.js";

export { Options };

/**
 * Returns a GraphQL validation rule that can be used to limit the depth of a
 * GraphQL operation based on a number of settings.
 */
export function depthLimit(options: Options = {}): ValidationRule {
  return function (context) {
    const schema = context.getSchema();
    const depthByFragment = new Map<string, Readonly<DepthByCoordinate>>();
    return {
      // TODO: refactor this to use the existing visitors rather than recursing ourselves
      OperationDefinition: {
        enter(operation) {
          const operationName = operation.name?.value ?? "(anonymous)";
          const resolvedOptions = resolveOptions(options);
          const ctx: CountDepthInternalContext = {
            schema,
            fragments: fragmentsToMap(
              context.getRecursivelyReferencedFragments(operation),
            ),
            options: resolvedOptions,
            depthByFragment,
          };
          // TODO: is this equivalent to context.getType()?
          const operationType = getOperationType(schema, operation);
          if (!operationType) {
            return;
          }
          const depths = countDepthInternal(
            ctx,
            operationType,
            operation,
            [],
            false,
          );
          const {
            maxDepthByFieldCoordinates,
            revealDetails,
            maxSelfReferentialDepth,
            maxIntrospectionSelfReferentialDepth,
          } = resolvedOptions;
          const issues: string[] = [];
          for (const coordinate of Object.keys(depths)) {
            const fallbackMaxScore = coordinate.includes(".")
              ? coordinate.startsWith("__")
                ? maxIntrospectionSelfReferentialDepth
                : maxSelfReferentialDepth
              : undefined;

            const score = depths[coordinate]!;
            const maxScore =
              maxDepthByFieldCoordinates[coordinate] ?? fallbackMaxScore;
            const isSelfReferential =
              maxDepthByFieldCoordinates[coordinate] === undefined;
            if (maxScore !== undefined && score > maxScore) {
              if (coordinate.includes(".")) {
                issues.push(
                  `field ${coordinate} nested ${score} times which exceeds ${isSelfReferential ? "self referential " : ""}maximum of ${maxScore}`,
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
                  case INTROSPECTION_LIST_DEPTH: {
                    issues.push(
                      `operation introspection list depth ${score} exceeds maximum of ${maxScore}`,
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
        },
      },
    };
  };
}

function resolveOptions(options: Options = {}): Required<Options> {
  const {
    maxDepth = 12,
    maxListDepth = 4,
    maxSelfReferentialDepth = 2,
    maxIntrospectionDepth = 12,
    maxIntrospectionListDepth = 3,
    maxIntrospectionSelfReferentialDepth = 2,
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
      "__Type.ofType": 8,
      "__Type.possibleTypes": 1,
      "__Field.args": 1,
      "__Field.type": 1,
      ...userSpecifiedMaxDepthByFieldCoordinates,
      [DEPTH]: maxDepth,
      [INTROSPECTION_DEPTH]: maxIntrospectionDepth,
      [LIST_DEPTH]: maxListDepth,
      [INTROSPECTION_LIST_DEPTH]: maxIntrospectionListDepth,
    },
  );
  const resolvedOptions: Required<Options> = {
    maxDepth,
    maxListDepth,
    maxSelfReferentialDepth,
    maxIntrospectionDepth,
    maxIntrospectionListDepth,
    maxIntrospectionSelfReferentialDepth,
    maxDepthByFieldCoordinates: maxDepthByFieldCoordinates as Record<
      string,
      number
    >,
    revealDetails,
    fragmentsAddToDepth,
  };
  return resolvedOptions;
}

function getOperationType(
  schema: GraphQLSchema,
  operation: OperationDefinitionNode,
): GraphQLObjectType | null | undefined {
  return operation.operation === "query"
    ? schema.getQueryType()
    : operation.operation === "mutation"
      ? schema.getMutationType()
      : operation.operation === "subscription"
        ? schema.getSubscriptionType()
        : null;
}

function fragmentsToMap(fragments: readonly FragmentDefinitionNode[]) {
  const map = new Map<string, FragmentDefinitionNode>();
  for (const def of fragments) {
    map.set(def.name.value, def);
  }
  return map;
}

export function countDepth(
  schema: GraphQLSchema,
  operation: OperationDefinitionNode,
  fragments: readonly FragmentDefinitionNode[],
  options: Options = {},
): {
  depths: Readonly<DepthByCoordinate>;
  resolvedOptions: Required<Options>;
} {
  const resolvedOptions = resolveOptions(options);
  const operationType = getOperationType(schema, operation);
  if (!operationType) {
    throw new Error(`Could not determine root type for operation`);
  }
  const fragmentMap = fragmentsToMap(fragments);
  const ctx: CountDepthInternalContext = {
    schema,
    fragments: {
      get(name) {
        const frag = fragmentMap.get(name);
        if (!frag) {
          throw new Error(`Fragment '${name}' not found!`);
        }
        return frag;
      },
    },
    options: resolvedOptions,
    depthByFragment: new Map(),
  };
  const depths = countDepthInternal(ctx, operationType, operation, [], false);
  return { depths, resolvedOptions };
}

interface CountDepthInternalContext {
  schema: GraphQLSchema;
  fragments: Pick<ReadonlyMap<string, FragmentDefinitionNode>, "get">;
  options: Required<Options>;
  depthByFragment: Map<string, Readonly<DepthByCoordinate>>;
}

function countDepthInternal(
  ctx: CountDepthInternalContext,
  currentType: GraphQLNamedType,
  node:
    | OperationDefinitionNode
    | FieldNode
    | InlineFragmentNode
    | FragmentSpreadNode
    | FragmentDefinitionNode,
  visitedFragments: ReadonlyArray<string>,
  isIntrospection: boolean,
): Readonly<DepthByCoordinate> {
  const {
    schema,
    fragments,
    options: { fragmentsAddToDepth },
    depthByFragment,
  } = ctx;
  switch (node.kind) {
    case Kind.OPERATION_DEFINITION:
    case Kind.FIELD:
    case Kind.INLINE_FRAGMENT:
    case Kind.FRAGMENT_DEFINITION: {
      const currentState: DepthByCoordinate = Object.create(null);
      const currentFieldCoord =
        node.kind === "Field" ? `${currentType.name}.${node.name.value}` : null;
      if (currentFieldCoord) {
        incr(currentState, currentFieldCoord, 1);
      }

      // Fields don't always have a selection set
      if (node.selectionSet) {
        if (fragmentsAddToDepth || node.kind === "Field") {
          incr(currentState, isIntrospection ? INTROSPECTION_DEPTH : DEPTH, 1);
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
                  incr(
                    currentState,
                    isIntrospection ? INTROSPECTION_LIST_DEPTH : LIST_DEPTH,
                    listDepth(field.type),
                  );
                  return getNamedType(field.type);
                } else {
                  return null;
                }
              }
              break;
            }
            case Kind.INLINE_FRAGMENT: {
              if (node.typeCondition) {
                return schema.getType(node.typeCondition.name.value);
              } else {
                return currentType;
              }
            }
            case Kind.FRAGMENT_DEFINITION: {
              return schema.getType(node.typeCondition.name.value);
            }
            default: {
              const never: never = node;
              throw new Error(`Unhandled node kind ${(never as any).kind}`);
            }
          }
        })();
        if (type) {
          const baseDepth = currentState[DEPTH] ?? 0;
          const baseIntrospectionDepth = currentState[INTROSPECTION_DEPTH] ?? 0;
          const baseListDepth = currentState[LIST_DEPTH] ?? 0;
          const baseIntrospectionListDepth =
            currentState[INTROSPECTION_LIST_DEPTH] ?? 0;
          const baseCurrentFieldDepth = currentFieldCoord
            ? currentState[currentFieldCoord] ?? 0
            : 0;
          for (const child of node.selectionSet.selections) {
            const isIntrospectionField =
              child.kind === Kind.FIELD && child.name.value.startsWith("__");
            const innerDepth = countDepthInternal(
              ctx,
              type,
              child,
              visitedFragments,
              // Once you go introspection, you can never go back
              isIntrospection || isIntrospectionField,
            );
            const fieldCoord =
              child.kind === Kind.FIELD
                ? `${type.name}.${child.name.value}`
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
                        : coord === INTROSPECTION_LIST_DEPTH
                          ? baseIntrospectionListDepth
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
      const fragment = fragments.get(fragmentName);
      if (!fragment) {
        // Non-existant fragment detected; this should be handled by a
        // different validation rule.
        return {};
      }
      const fragmentDepth = countDepthInternal(
        ctx,
        currentType,
        fragment,
        [...visitedFragments, fragmentName],
        isIntrospection,
      );
      depthByFragment.set(fragmentName, fragmentDepth);
      return fragmentDepth;
    }
    default: {
      const never: never = node;
      throw new Error(`Unexpected node type ${(never as any).kind}`);
    }
  }
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

export function countOperationDepths(
  schema: string | GraphQLSchema,
  source: string | Source,
  options: Options = {},
) {
  const actualSchema =
    typeof schema === "string" ? buildSchema(schema) : schema;
  const document = parse(source);
  const operations = document.definitions.filter(
    (d): d is OperationDefinitionNode => d.kind === Kind.OPERATION_DEFINITION,
  );
  const fragments = document.definitions.filter(
    (d): d is FragmentDefinitionNode => d.kind === Kind.FRAGMENT_DEFINITION,
  );
  const result: {
    [operationName: string]: Readonly<DepthByCoordinate>;
  } = Object.create(null);
  for (const operation of operations) {
    const operationName = operation.name?.value ?? "";
    const { depths } = countDepth(actualSchema, operation, fragments, options);
    result[operationName] = depths;
  }
  return result;
}
