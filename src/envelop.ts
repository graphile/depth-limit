import type { Plugin } from "@envelop/core";
import { specifiedRules } from "graphql";

import { depthLimit } from "./index.js";
import type { Options } from "./interfaces.js";

export function useDepthLimit(options: Options): Plugin {
  const rule = depthLimit(options);
  return {
    onValidate({ params }) {
      params.rules = params.rules
        ? [...params.rules, rule]
        : [...specifiedRules, rule];
    },
  };
}
