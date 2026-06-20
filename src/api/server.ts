import Fastify from "fastify";
import type { FastifyInstance, FastifyServerOptions } from "fastify";
import { newId } from "../domain/ids.js";
import type { Exchange, Json } from "../domain/types.js";
import { measure } from "../coverage/measure.js";
import { resolvePath } from "../path/resolve.js";
import { MemoryRepository } from "../store/memory.js";
import type {
  AddExchangeInput,
  CreateSceneInput,
  CreateSpaceInput,
  CreateTemplateInput,
  Repository,
  ScenePatch,
  SpacePatch,
  TemplatePatch,
} from "../store/repository.js";

export interface BuildServerOptions {
  repo?: Repository;
  logger?: FastifyServerOptions["logger"];
}

function requireFields(body: unknown, fields: string[]): string | undefined {
  if (!body || typeof body !== "object") return "request body must be a JSON object";
  const record = body as Record<string, unknown>;
  for (const f of fields) {
    if (record[f] === undefined || record[f] === null || record[f] === "") {
      return `missing required field "${f}"`;
    }
  }
  return undefined;
}

/** Build a configured Fastify instance backed by `repo`. */
export function buildServer(options: BuildServerOptions = {}): FastifyInstance {
  const repo = options.repo ?? new MemoryRepository();
  const app = Fastify({ logger: options.logger ?? false });

  app.get("/health", async () => ({ status: "ok", service: "echo" }));

  // ----- spaces -----
  app.post("/spaces", async (req, reply) => {
    const body = req.body as CreateSpaceInput;
    const err = requireFields(body, ["name"]);
    if (err) return reply.code(400).send({ error: err });
    return reply.code(201).send(await repo.createSpace(body));
  });

  app.get("/spaces", async () => repo.listSpaces());

  app.get("/spaces/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const space = await repo.getSpace(id);
    return space ? space : reply.code(404).send({ error: "space not found" });
  });

  app.patch("/spaces/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const updated = await repo.updateSpace(id, req.body as SpacePatch);
    return updated ? updated : reply.code(404).send({ error: "space not found" });
  });

  app.delete("/spaces/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    return (await repo.deleteSpace(id))
      ? reply.code(204).send()
      : reply.code(404).send({ error: "space not found" });
  });

  // ----- templates -----
  app.post("/templates", async (req, reply) => {
    const body = req.body as CreateTemplateInput;
    const err = requireFields(body, ["spaceId", "name", "psm", "method"]);
    if (err) return reply.code(400).send({ error: err });
    if (!(await repo.getSpace(body.spaceId)))
      return reply.code(400).send({ error: "spaceId does not exist" });
    return reply.code(201).send(await repo.createTemplate(body));
  });

  app.get("/templates", async (req) => {
    const { spaceId } = req.query as { spaceId?: string };
    return repo.listTemplates(spaceId);
  });

  app.get("/templates/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const tpl = await repo.getTemplate(id);
    return tpl ? tpl : reply.code(404).send({ error: "template not found" });
  });

  app.patch("/templates/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const updated = await repo.updateTemplate(id, req.body as TemplatePatch);
    return updated ? updated : reply.code(404).send({ error: "template not found" });
  });

  app.delete("/templates/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    return (await repo.deleteTemplate(id))
      ? reply.code(204).send()
      : reply.code(404).send({ error: "template not found" });
  });

  // ----- scenes -----
  app.post("/scenes", async (req, reply) => {
    const body = req.body as CreateSceneInput;
    const err = requireFields(body, ["spaceId", "templateId", "name"]);
    if (err) return reply.code(400).send({ error: err });
    if (!(await repo.getTemplate(body.templateId)))
      return reply.code(400).send({ error: "templateId does not exist" });
    return reply.code(201).send(await repo.createScene(body));
  });

  app.get("/scenes", async (req) => {
    const { spaceId, templateId } = req.query as {
      spaceId?: string;
      templateId?: string;
    };
    return repo.listScenes({ spaceId, templateId });
  });

  app.get("/scenes/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const scene = await repo.getScene(id);
    return scene ? scene : reply.code(404).send({ error: "scene not found" });
  });

  app.patch("/scenes/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const updated = await repo.updateScene(id, req.body as ScenePatch);
    return updated ? updated : reply.code(404).send({ error: "scene not found" });
  });

  app.delete("/scenes/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    return (await repo.deleteScene(id))
      ? reply.code(204).send()
      : reply.code(404).send({ error: "scene not found" });
  });

  // ----- exchanges (traffic) -----
  app.post("/exchanges", async (req, reply) => {
    const body = req.body as AddExchangeInput | AddExchangeInput[];
    const inputs = Array.isArray(body) ? body : [body];
    for (const ex of inputs) {
      const err = requireFields(ex, ["psm", "method"]);
      if (err) return reply.code(400).send({ error: err });
    }
    return reply.code(201).send(await repo.addExchanges(inputs));
  });

  app.get("/exchanges", async (req) => {
    const { psm, method } = req.query as { psm?: string; method?: string };
    return repo.listExchanges({ psm, method });
  });

  app.delete("/exchanges", async (req) => {
    const { psm, method } = req.query as { psm?: string; method?: string };
    return { deleted: await repo.clearExchanges({ psm, method }) };
  });

  // ----- measurement -----
  app.post("/measure", async (req) => {
    const body = (req.body ?? {}) as {
      spaceId?: string;
      exchanges?: AddExchangeInput[];
    };
    const [templates, scenes] = await Promise.all([
      repo.listTemplates(body.spaceId),
      repo.listScenes(body.spaceId ? { spaceId: body.spaceId } : undefined),
    ]);
    const exchanges: Exchange[] = body.exchanges
      ? body.exchanges.map((e) => ({ ...e, id: e.id ?? newId("xch") }))
      : await repo.listExchanges();
    return measure({ templates, scenes, exchanges });
  });

  // ----- tools: path playground (helps build templates) -----
  app.post("/tools/resolve-path", async (req, reply) => {
    const body = req.body as { json?: Json; path?: string };
    if (!body || typeof body.path !== "string")
      return reply.code(400).send({ error: 'missing "path" string' });
    try {
      const values = resolvePath(body.json ?? null, body.path);
      return { path: body.path, count: values.length, values };
    } catch (e) {
      return reply.code(400).send({ error: (e as Error).message });
    }
  });

  return app;
}
