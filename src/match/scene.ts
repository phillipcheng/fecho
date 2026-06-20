import type { Exchange, FeatureDef, Scene, Template } from "../domain/types.js";
import { evaluateCondition, type ConditionResult } from "./condition.js";

export interface SceneMatch {
  hit: boolean;
  conditions: ConditionResult[];
  /** False when the exchange's interface differs from the template's. */
  applicable: boolean;
}

/** Index a template's features by name for O(1) lookup. */
export function featureIndex(template: Template): Map<string, FeatureDef> {
  const map = new Map<string, FeatureDef>();
  for (const f of template.features) map.set(f.name, f);
  return map;
}

/** Does this exchange belong to the template's interface (psm + method)? */
export function exchangeMatchesInterface(
  template: Template,
  exchange: Exchange,
): boolean {
  return template.psm === exchange.psm && template.method === exchange.method;
}

/**
 * Evaluate whether an exchange hits a scene. A scene is hit when it is
 * applicable to the exchange's interface, has at least one condition, and ALL
 * its conditions are satisfied (logical AND).
 */
export function evaluateScene(
  scene: Scene,
  template: Template,
  exchange: Exchange,
  index = featureIndex(template),
): SceneMatch {
  const applicable = exchangeMatchesInterface(template, exchange);
  const conditions = scene.conditions.map((c) =>
    evaluateCondition(c, index.get(c.feature), exchange),
  );
  const hit =
    applicable &&
    conditions.length > 0 &&
    conditions.every((c) => c.satisfied);
  return { hit, conditions, applicable };
}
