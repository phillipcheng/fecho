/**
 * Core domain model for echo, mirroring Nario's scenario-coverage concepts:
 *
 *   Space  ──▶  Template  ──▶  Scene
 *
 * A Template defines the *feature keys* (JSON paths) of a service interface.
 * A Scene pins those features to concrete values, describing one business case.
 * Traffic (Exchange) is matched against Scenes to measure coverage.
 */

/** Where a feature is extracted from within an exchange. */
export type FeatureLocation = "inbound" | "outbound";

/**
 * Which part of the inbound request / outbound response a feature path is
 * rooted at. `query`/`header`/`body` describe an HTTP request; `response`
 * describes the response payload.
 */
export type FeatureSource = "query" | "header" | "body" | "response";

/** The transport protocol a template describes. v1 focuses on http. */
export type Protocol = "http" | "thrift" | "mysql";

/** JSON value-type tag. echo matches both value AND type, so `"1"` ≠ `1`. */
export type ValueType =
  | "string"
  | "number"
  | "boolean"
  | "null"
  | "object"
  | "array";

/** Comparison operators a scene condition can use. */
export type Operator =
  | "eq" // exact value + type match (the Nario default)
  | "neq" // negation of eq
  | "exists" // the path resolves to at least one value
  | "absent" // the path resolves to no value
  | "contains" // array/string containment of `value`
  | "in"; // value is one of `value` (an array)

/** A JSON value as it appears in traffic or scene conditions. */
export type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json };

/**
 * A feature key: a named, business-semantic pointer into an exchange.
 * Defined on a Template; referenced by name from Scene conditions.
 */
export interface FeatureDef {
  /** Business-semantic name, e.g. "buyer_region". Unique within a template. */
  name: string;
  location: FeatureLocation;
  source: FeatureSource;
  /** Path expression, e.g. "data->task_list->[*]->task_mode". */
  path: string;
}

/** One condition inside a Scene, referencing a FeatureDef by name. */
export interface FeatureCondition {
  /** Must match a FeatureDef.name on the scene's template. */
  feature: string;
  operator: Operator;
  /** Expected value. Ignored for `exists`/`absent`. */
  value?: Json;
  /**
   * Expected value-type. When provided, the extracted value's type must match
   * too (this is what makes `"1"` differ from `1`). Inferred from `value` when
   * omitted.
   */
  valueType?: ValueType;
}

export interface Space {
  id: string;
  name: string;
  description: string;
  businessLine: string;
  createdAt: string;
  updatedAt: string;
}

export interface Template {
  id: string;
  spaceId: string;
  name: string;
  psm: string;
  method: string;
  protocol: Protocol;
  priority: string;
  features: FeatureDef[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Scene {
  id: string;
  spaceId: string;
  templateId: string;
  name: string;
  priority: string;
  source: "manual" | "recommend";
  conditions: FeatureCondition[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/** A recorded HTTP request/response pair (a unit of traffic). */
export interface Exchange {
  id: string;
  psm: string;
  method: string;
  request: {
    query?: Record<string, Json>;
    headers?: Record<string, Json>;
    body?: Json;
  };
  response?: {
    body?: Json;
  };
  meta?: {
    logId?: string;
    taskId?: string;
    source?: string;
  };
}
