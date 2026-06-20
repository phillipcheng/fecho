import { newId, nowIso } from "../domain/ids.js";
import type { Exchange, Scene, Space, Template } from "../domain/types.js";
import type {
  AddExchangeInput,
  CreateSceneInput,
  CreateSpaceInput,
  CreateTemplateInput,
  ExchangeFilter,
  Repository,
  ScenePatch,
  SpacePatch,
  TemplatePatch,
} from "./repository.js";

/** In-memory Repository. Default backend; resolves immediately, test-friendly. */
export class MemoryRepository implements Repository {
  private spaces = new Map<string, Space>();
  private templates = new Map<string, Template>();
  private scenes = new Map<string, Scene>();
  private exchanges = new Map<string, Exchange>();

  // ----- spaces -----
  async createSpace(input: CreateSpaceInput): Promise<Space> {
    const ts = nowIso();
    const space: Space = {
      id: newId("spc"),
      name: input.name,
      description: input.description ?? "",
      businessLine: input.businessLine ?? "",
      createdAt: ts,
      updatedAt: ts,
    };
    this.spaces.set(space.id, space);
    return space;
  }

  async getSpace(id: string): Promise<Space | undefined> {
    return this.spaces.get(id);
  }

  async listSpaces(): Promise<Space[]> {
    return [...this.spaces.values()];
  }

  async updateSpace(id: string, patch: SpacePatch): Promise<Space | undefined> {
    const existing = this.spaces.get(id);
    if (!existing) return undefined;
    const updated: Space = { ...existing, ...patch, updatedAt: nowIso() };
    this.spaces.set(id, updated);
    return updated;
  }

  async deleteSpace(id: string): Promise<boolean> {
    if (!this.spaces.delete(id)) return false;
    // cascade
    for (const t of await this.listTemplates(id)) await this.deleteTemplate(t.id);
    return true;
  }

  // ----- templates -----
  async createTemplate(input: CreateTemplateInput): Promise<Template> {
    const ts = nowIso();
    const template: Template = {
      id: newId("tpl"),
      spaceId: input.spaceId,
      name: input.name,
      psm: input.psm,
      method: input.method,
      protocol: input.protocol ?? "http",
      priority: input.priority ?? "",
      features: input.features ?? [],
      enabled: input.enabled ?? true,
      createdAt: ts,
      updatedAt: ts,
    };
    this.templates.set(template.id, template);
    return template;
  }

  async getTemplate(id: string): Promise<Template | undefined> {
    return this.templates.get(id);
  }

  async listTemplates(spaceId?: string): Promise<Template[]> {
    const all = [...this.templates.values()];
    return spaceId ? all.filter((t) => t.spaceId === spaceId) : all;
  }

  async updateTemplate(
    id: string,
    patch: TemplatePatch,
  ): Promise<Template | undefined> {
    const existing = this.templates.get(id);
    if (!existing) return undefined;
    const updated: Template = { ...existing, ...patch, updatedAt: nowIso() };
    this.templates.set(id, updated);
    return updated;
  }

  async deleteTemplate(id: string): Promise<boolean> {
    if (!this.templates.delete(id)) return false;
    for (const s of await this.listScenes({ templateId: id }))
      await this.deleteScene(s.id);
    return true;
  }

  // ----- scenes -----
  async createScene(input: CreateSceneInput): Promise<Scene> {
    const ts = nowIso();
    const scene: Scene = {
      id: newId("scn"),
      spaceId: input.spaceId,
      templateId: input.templateId,
      name: input.name,
      priority: input.priority ?? "",
      source: input.source ?? "manual",
      conditions: input.conditions ?? [],
      enabled: input.enabled ?? true,
      createdAt: ts,
      updatedAt: ts,
    };
    this.scenes.set(scene.id, scene);
    return scene;
  }

  async getScene(id: string): Promise<Scene | undefined> {
    return this.scenes.get(id);
  }

  async listScenes(filter?: {
    spaceId?: string;
    templateId?: string;
  }): Promise<Scene[]> {
    let all = [...this.scenes.values()];
    if (filter?.spaceId) all = all.filter((s) => s.spaceId === filter.spaceId);
    if (filter?.templateId)
      all = all.filter((s) => s.templateId === filter.templateId);
    return all;
  }

  async updateScene(id: string, patch: ScenePatch): Promise<Scene | undefined> {
    const existing = this.scenes.get(id);
    if (!existing) return undefined;
    const updated: Scene = { ...existing, ...patch, updatedAt: nowIso() };
    this.scenes.set(id, updated);
    return updated;
  }

  async deleteScene(id: string): Promise<boolean> {
    return this.scenes.delete(id);
  }

  // ----- exchanges -----
  async addExchanges(inputs: AddExchangeInput[]): Promise<Exchange[]> {
    return inputs.map((input) => {
      const exchange: Exchange = { ...input, id: input.id ?? newId("xch") };
      this.exchanges.set(exchange.id, exchange);
      return exchange;
    });
  }

  async listExchanges(filter?: ExchangeFilter): Promise<Exchange[]> {
    let all = [...this.exchanges.values()];
    if (filter?.psm) all = all.filter((e) => e.psm === filter.psm);
    if (filter?.method) all = all.filter((e) => e.method === filter.method);
    return all;
  }

  async clearExchanges(filter?: ExchangeFilter): Promise<number> {
    const toRemove = await this.listExchanges(filter);
    for (const e of toRemove) this.exchanges.delete(e.id);
    return toRemove.length;
  }
}
