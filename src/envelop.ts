import type { Plugin } from "@envelop/core";

import { depthLimit } from "./index.js";
import type { Options } from "./interfaces.js";

export function useDepthLimit(options: Options): Plugin {
  const rule = depthLimit(options);
  return {
    onValidate({ addValidationRule }) {
      addValidationRule(rule);
    },
  };
}
