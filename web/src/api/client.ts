import type {
  CoverageReport,
  Exchange,
  FeatureCondition,
  FeatureDef,
  Json,
  Scene,
  Space,
  Template,
} from "../types.ts";

const BASE = import.meta.env.VITE_API_BASE ?? "/api";

async function req<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body !== undefined ? { "content-type": "application/json" } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const j = (await res.json()) as { error?: string };
      if (j.error) detail = j.error;
    } catch {
      /* ignore non-JSON error bodies */
    }
    throw new Error(`${res.status} ${detail}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export interface CreateTemplateInput {
  spaceId: string;
  name: string;
  psm: string;
  method: string;
  protocol?: string;
  priority?: string;
  features?: FeatureDef[];
}

export interface CreateSceneInput {
  spaceId: string;
  templateId: string;
  name: string;
  priority?: string;
  conditions?: FeatureCondition[];
}

export const api = {
  health: () => req<{ status: string; service: string }>("GET", "/health"),

  // spaces
  listSpaces: () => req<Space[]>("GET", "/spaces"),
  getSpace: (id: string) => req<Space>("GET", `/spaces/${id}`),
  createSpace: (input: { name: string; description?: string; businessLine?: string }) =>
    req<Space>("POST", "/spaces", input),
  deleteSpace: (id: string) => req<void>("DELETE", `/spaces/${id}`),

  // templates
  listTemplates: (spaceId: string) =>
    req<Template[]>("GET", `/templates?spaceId=${encodeURIComponent(spaceId)}`),
  createTemplate: (input: CreateTemplateInput) =>
    req<Template>("POST", "/templates", input),
  updateTemplate: (id: string, patch: Partial<Template>) =>
    req<Template>("PATCH", `/templates/${id}`, patch),
  deleteTemplate: (id: string) => req<void>("DELETE", `/templates/${id}`),

  // scenes
  listScenes: (spaceId: string) =>
    req<Scene[]>("GET", `/scenes?spaceId=${encodeURIComponent(spaceId)}`),
  createScene: (input: CreateSceneInput) => req<Scene>("POST", "/scenes", input),
  updateScene: (id: string, patch: Partial<Scene>) =>
    req<Scene>("PATCH", `/scenes/${id}`, patch),
  deleteScene: (id: string) => req<void>("DELETE", `/scenes/${id}`),

  // exchanges
  listExchanges: () => req<Exchange[]>("GET", "/exchanges"),
  addExchanges: (inputs: unknown[]) => req<Exchange[]>("POST", "/exchanges", inputs),
  clearExchanges: () => req<{ deleted: number }>("DELETE", "/exchanges"),

  // measurement
  measure: (input: { spaceId?: string; exchanges?: unknown[] }) =>
    req<CoverageReport>("POST", "/measure", input),

  // tools
  resolvePath: (json: Json, path: string) =>
    req<{ path: string; count: number; values: Json[] }>(
      "POST",
      "/tools/resolve-path",
      { json, path },
    ),
};
