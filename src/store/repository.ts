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
 * Persistence boundary. Methods are async so backends can do real I/O; the
 * in-memory implementation resolves immediately. MySQL is the persistent
 * backend; other stores (SQLite, Postgres, …) can implement the same interface.
 */
export interface Repository {
  // spaces
  createSpace(input: CreateSpaceInput): Promise<Space>;
  getSpace(id: string): Promise<Space | undefined>;
  listSpaces(): Promise<Space[]>;
  updateSpace(id: string, patch: SpacePatch): Promise<Space | undefined>;
  deleteSpace(id: string): Promise<boolean>;

  // templates
  createTemplate(input: CreateTemplateInput): Promise<Template>;
  getTemplate(id: string): Promise<Template | undefined>;
  listTemplates(spaceId?: string): Promise<Template[]>;
  updateTemplate(id: string, patch: TemplatePatch): Promise<Template | undefined>;
  deleteTemplate(id: string): Promise<boolean>;

  // scenes
  createScene(input: CreateSceneInput): Promise<Scene>;
  getScene(id: string): Promise<Scene | undefined>;
  listScenes(filter?: { spaceId?: string; templateId?: string }): Promise<Scene[]>;
  updateScene(id: string, patch: ScenePatch): Promise<Scene | undefined>;
  deleteScene(id: string): Promise<boolean>;

  // exchanges
  addExchanges(inputs: AddExchangeInput[]): Promise<Exchange[]>;
  listExchanges(filter?: ExchangeFilter): Promise<Exchange[]>;
  clearExchanges(filter?: ExchangeFilter): Promise<number>;

  /** Release any resources (connection pools, …). Optional. */
  close?(): Promise<void>;
}
