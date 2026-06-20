// Mirror of the echo backend's public domain types.

export type FeatureLocation = "inbound" | "outbound";
export type FeatureSource = "query" | "header" | "body" | "response";
export type Protocol = "http" | "thrift" | "mysql";
export type ValueType =
  | "string"
  | "number"
  | "boolean"
  | "null"
  | "object"
  | "array";
export type Operator =
  | "eq"
  | "neq"
  | "exists"
  | "absent"
  | "contains"
  | "in";

export type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json };

export interface FeatureDef {
  name: string;
  location: FeatureLocation;
  source: FeatureSource;
  path: string;
}

export interface FeatureCondition {
  feature: string;
  operator: Operator;
  value?: Json;
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

export interface Exchange {
  id: string;
  psm: string;
  method: string;
  request: {
    query?: Record<string, Json>;
    headers?: Record<string, Json>;
    body?: Json;
  };
  response?: { body?: Json };
  meta?: { logId?: string; taskId?: string; source?: string };
}

export interface SceneCoverage {
  sceneId: string;
  name: string;
  templateId: string;
  psm: string;
  method: string;
  priority: string;
  trafficCount: number;
  covered: boolean;
  hitExchangeIds: string[];
}

export interface CoverageReport {
  metrics: {
    totalTraffic: number;
    interfaceTotal: number;
    sceneTotal: number;
    templateTotal: number;
    coveredScenes: number;
    sceneCoverageRate: number;
    hitTrafficRatio: number;
  };
  scenes: SceneCoverage[];
  generatedAt: string;
}
