export const DEPTH = "$$depth";
export const INTROSPECTION_DEPTH = "$$introspectionDepth";
export const LIST_DEPTH = "$$listDepth";
export const INTROSPECTION_LIST_DEPTH = "$$introspectionListDepth";

export interface DepthByCoordinate {
  [DEPTH]?: number;
  [INTROSPECTION_DEPTH]?: number;
  [LIST_DEPTH]?: number;
  [INTROSPECTION_LIST_DEPTH]?: number;
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
  /**
   * How many selection sets deep may the user query?
   *
   * @defaultValue `12`
   */
  maxDepth?: number;

  /**
   * How many nested lists deep may the user query?
   *
   * @defaultValue `4`
   */
  maxListDepth?: number;

  /**
   * How many times may a field reference itself recursively by default. This
   * is to try and block the most common forms of attack automatically, if you
   * have legitimate cases where a field should be referenced recursively then
   * you may specifically override those via `maxDepthByFieldCoordinates`.
   *
   * @defaultValue `2`
   */
  maxSelfReferentialDepth?: number;

  /**
   * How many selection sets deep may the user query in introspection?
   *
   * @defaultValue `12`
   */
  maxIntrospectionDepth?: number;

  /**
   * How many nested lists deep may the user query in introspection?
   *
   * @defaultValue `3`
   */
  maxIntrospectionListDepth?: number;

  /**
   * How many times may an introspection field reference itself recursively by default. This
   * is to try and block the most common forms of attack automatically, if you
   * have legitimate cases where a field should be referenced recursively then
   * you may specifically override those via `maxDepthByFieldCoordinates`.
   *
   * @defaultValue `2`
   */
  maxIntrospectionSelfReferentialDepth?: number;

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
