import type {
  Exchange,
  FeatureCondition,
  FeatureDef,
  Json,
} from "../domain/types.js";
import { resolvePath } from "../path/resolve.js";
import { deepEqual, typedEqual, valueTypeOf } from "./value.js";

export interface ConditionResult {
  feature: string;
  operator: string;
  satisfied: boolean;
  /** Why it failed (or a note), for explainable reports. */
  reason?: string;
  /** Values the feature path resolved to in this exchange. */
  resolved: Json[];
}

/** Pick the JSON root a feature path is rooted at, based on its source. */
function rootFor(def: FeatureDef, exchange: Exchange): Json | undefined {
  switch (def.source) {
    case "query":
      return exchange.request.query ?? undefined;
    case "header":
      return exchange.request.headers ?? undefined;
    case "body":
      return exchange.request.body ?? undefined;
    case "response":
      return exchange.response?.body ?? undefined;
  }
}

/**
 * Evaluate a single scene condition against an exchange.
 *
 * Fan-out paths (`[*]`, `*`, `^regex$`) resolve to multiple values; for
 * value-comparing operators the condition is satisfied when *any* resolved
 * value matches — Nario's "any path satisfies" semantics.
 */
export function evaluateCondition(
  condition: FeatureCondition,
  def: FeatureDef | undefined,
  exchange: Exchange,
): ConditionResult {
  const base: Omit<ConditionResult, "satisfied"> = {
    feature: condition.feature,
    operator: condition.operator,
    resolved: [],
  };

  if (!def) {
    return {
      ...base,
      satisfied: false,
      reason: `feature "${condition.feature}" is not defined on the template`,
    };
  }

  const root = rootFor(def, exchange);
  const resolved = root === undefined ? [] : resolvePath(root, def.path);
  const expectedType = condition.valueType ?? valueTypeOf(condition.value ?? null);

  switch (condition.operator) {
    case "exists":
      return { ...base, resolved, satisfied: resolved.length > 0 };

    case "absent":
      return { ...base, resolved, satisfied: resolved.length === 0 };

    case "eq": {
      const ok = resolved.some((v) =>
        typedEqual(v, condition.value ?? null, condition.valueType ?? expectedType),
      );
      return {
        ...base,
        resolved,
        satisfied: ok,
        reason: ok ? undefined : "no resolved value equals the expected value/type",
      };
    }

    case "neq": {
      // Strict negation of eq: satisfied when no resolved value equals it.
      const anyEq = resolved.some((v) =>
        typedEqual(v, condition.value ?? null, condition.valueType ?? expectedType),
      );
      return { ...base, resolved, satisfied: !anyEq };
    }

    case "contains": {
      const target = condition.value ?? null;
      const ok = resolved.some((v) => {
        if (Array.isArray(v)) return v.some((el) => deepEqual(el as Json, target));
        if (typeof v === "string" && typeof target === "string")
          return v.includes(target);
        return false;
      });
      return { ...base, resolved, satisfied: ok };
    }

    case "in": {
      const options = Array.isArray(condition.value) ? condition.value : [];
      const ok = resolved.some((v) => options.some((o) => deepEqual(v, o as Json)));
      return { ...base, resolved, satisfied: ok };
    }

    default:
      return {
        ...base,
        resolved,
        satisfied: false,
        reason: `unsupported operator "${String(condition.operator)}"`,
      };
  }
}
