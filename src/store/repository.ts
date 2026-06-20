import type {
  Exchange,
  FeatureCondition,
  FeatureDef,
  Protocol,
  Scene,
  Space,
  Template,
} from "../domain/types.js";

export interface CreateSpaceInput {
  name: string;
  description?: string;
  businessLine?: string;
}

export interface CreateTemplateInput {
  spaceId: string;
  name: string;
  psm: string;
  method: string;
  protocol?: Protocol;
  priority?: string;
  features?: FeatureDef[];
  enabled?: boolean;
}

export interface CreateSceneInput {
  spaceId: string;
  templateId: string;
  name: string;
  priority?: string;
  source?: "manual" | "recommend";
  conditions?: FeatureCondition[];
  enabled?: boolean;
}

export type AddExchangeInput = Omit<Exchange, "id"> & { id?: string };

export type SpacePatch = Partial<Pick<Space, "name" | "description" | "businessLine">>;
export type TemplatePatch = Partial<
  Pick<
    Template,
    "name" | "psm" | "method" | "protocol" | "priority" | "features" | "enabled"
  >
>;
export type ScenePatch = Partial<
  Pick<Scene, "name" | "priority" | "source" | "conditions" | "enabled">
>;

export interface ExchangeFilter {
  psm?: string;
  method?: string;
}

/**
 * Persistence boundary. The in-memory implementation is the default; other
 * backends (SQLite, Postgres, …) can implement this same interface.
 */
export interface Repository {
  // spaces
  createSpace(input: CreateSpaceInput): Space;
  getSpace(id: string): Space | undefined;
  listSpaces(): Space[];
  updateSpace(id: string, patch: SpacePatch): Space | undefined;
  deleteSpace(id: string): boolean;

  // templates
  createTemplate(input: CreateTemplateInput): Template;
  getTemplate(id: string): Template | undefined;
  listTemplates(spaceId?: string): Template[];
  updateTemplate(id: string, patch: TemplatePatch): Template | undefined;
  deleteTemplate(id: string): boolean;

  // scenes
  createScene(input: CreateSceneInput): Scene;
  getScene(id: string): Scene | undefined;
  listScenes(filter?: { spaceId?: string; templateId?: string }): Scene[];
  updateScene(id: string, patch: ScenePatch): Scene | undefined;
  deleteScene(id: string): boolean;

  // exchanges
  addExchanges(inputs: AddExchangeInput[]): Exchange[];
  listExchanges(filter?: ExchangeFilter): Exchange[];
  clearExchanges(filter?: ExchangeFilter): number;
}
