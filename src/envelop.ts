import type { Plugin } from "@envelop/core";
import { Options } from "./interfaces.js";
import { depthLimit } from "./index.js";
import { specifiedRules } from "graphql";

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
