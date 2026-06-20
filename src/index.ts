/** Public API surface for the echo engine. */
export * from "./domain/types.js";
export { newId, nowIso } from "./domain/ids.js";

export { parsePath, PathParseError, type Segment } from "./path/parse.js";
export { resolvePath, resolveSegments } from "./path/resolve.js";

export { valueTypeOf, deepEqual, typedEqual } from "./match/value.js";
export { evaluateCondition, type ConditionResult } from "./match/condition.js";
export {
  evaluateScene,
  featureIndex,
  exchangeMatchesInterface,
  type SceneMatch,
} from "./match/scene.js";

export {
  measure,
  type MeasureInput,
  type CoverageReport,
  type SceneCoverage,
} from "./coverage/measure.js";

export { MemoryRepository } from "./store/memory.js";
export type {
  Repository,
  CreateSpaceInput,
  CreateTemplateInput,
  CreateSceneInput,
  AddExchangeInput,
  SpacePatch,
  TemplatePatch,
  ScenePatch,
  ExchangeFilter,
} from "./store/repository.js";

export { buildServer, type BuildServerOptions } from "./api/server.js";
