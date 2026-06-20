import {
  createConnection,
  createPool,
  type Pool,
  type ResultSetHeader,
  type RowDataPacket,
} from "mysql2/promise";
import { newId, nowIso } from "../domain/ids.js";
import type {
  Exchange,
  FeatureCondition,
  FeatureDef,
  Protocol,
  Scene,
  Space,
  Template,
} from "../domain/types.js";
import type { MysqlConfig } from "./config.js";
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

/** JSON columns come back parsed on MySQL 8 but as text on MariaDB; handle both. */
function parseJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

const j = (v: unknown) => JSON.stringify(v ?? null);

type Param = string | number | boolean | null;

function toSpace(r: RowDataPacket): Space {
  return {
    id: r.id,
    name: r.name,
    description: r.description ?? "",
    businessLine: r.business_line ?? "",
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function toTemplate(r: RowDataPacket): Template {
  return {
    id: r.id,
    spaceId: r.space_id,
    name: r.name,
    psm: r.psm,
    method: r.method,
    protocol: r.protocol as Protocol,
    priority: r.priority ?? "",
    features: parseJson<FeatureDef[]>(r.features, []),
    enabled: !!r.enabled,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function toScene(r: RowDataPacket): Scene {
  return {
    id: r.id,
    spaceId: r.space_id,
    templateId: r.template_id,
    name: r.name,
    priority: r.priority ?? "",
    source: r.source,
    conditions: parseJson<FeatureCondition[]>(r.conditions, []),
    enabled: !!r.enabled,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function toExchange(r: RowDataPacket): Exchange {
  return {
    id: r.id,
    psm: r.psm,
    method: r.method,
    request: parseJson<Exchange["request"]>(r.request, {}),
    response: parseJson<Exchange["response"]>(r.response, undefined as never),
    meta: parseJson<Exchange["meta"]>(r.meta, undefined as never),
  };
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS spaces (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    business_line VARCHAR(255) NULL,
    created_at VARCHAR(40) NOT NULL,
    updated_at VARCHAR(40) NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS templates (
    id VARCHAR(64) PRIMARY KEY,
    space_id VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    psm VARCHAR(255) NOT NULL,
    method VARCHAR(255) NOT NULL,
    protocol VARCHAR(32) NOT NULL,
    priority VARCHAR(64) NULL,
    features JSON NOT NULL,
    enabled TINYINT(1) NOT NULL,
    created_at VARCHAR(40) NOT NULL,
    updated_at VARCHAR(40) NOT NULL,
    INDEX idx_templates_space (space_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS scenes (
    id VARCHAR(64) PRIMARY KEY,
    space_id VARCHAR(64) NOT NULL,
    template_id VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    priority VARCHAR(64) NULL,
    source VARCHAR(32) NOT NULL,
    conditions JSON NOT NULL,
    enabled TINYINT(1) NOT NULL,
    created_at VARCHAR(40) NOT NULL,
    updated_at VARCHAR(40) NOT NULL,
    INDEX idx_scenes_space (space_id),
    INDEX idx_scenes_template (template_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS exchanges (
    id VARCHAR(64) PRIMARY KEY,
    psm VARCHAR(255) NOT NULL,
    method VARCHAR(255) NOT NULL,
    request JSON NULL,
    response JSON NULL,
    meta JSON NULL,
    INDEX idx_exchanges_psm (psm),
    INDEX idx_exchanges_method (method)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

/** MySQL/MariaDB-backed Repository. Construct via `MySqlRepository.connect`. */
export class MySqlRepository implements Repository {
  private constructor(private readonly pool: Pool) {}

  /** Create the database (optional) + tables, then return a ready repository. */
  static async connect(config: MysqlConfig): Promise<MySqlRepository> {
    if (config.createDatabase) {
      const admin = await createConnection({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        multipleStatements: false,
      });
      try {
        await admin.query(
          `CREATE DATABASE IF NOT EXISTS \`${config.database}\` ` +
            `CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
        );
      } finally {
        await admin.end();
      }
    }

    const pool = createPool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      connectionLimit: 10,
      waitForConnections: true,
      namedPlaceholders: false,
    });

    for (const ddl of SCHEMA) await pool.query(ddl);
    return new MySqlRepository(pool);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  private async rows(sql: string, params: Param[] = []): Promise<RowDataPacket[]> {
    const [rows] = await this.pool.execute<RowDataPacket[]>(sql, params);
    return rows;
  }

  private async run(sql: string, params: Param[] = []): Promise<ResultSetHeader> {
    const [res] = await this.pool.execute<ResultSetHeader>(sql, params);
    return res;
  }

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
    await this.run(
      `INSERT INTO spaces (id, name, description, business_line, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [space.id, space.name, space.description, space.businessLine, space.createdAt, space.updatedAt],
    );
    return space;
  }

  async getSpace(id: string): Promise<Space | undefined> {
    const rows = await this.rows(`SELECT * FROM spaces WHERE id = ?`, [id]);
    return rows[0] ? toSpace(rows[0]) : undefined;
  }

  async listSpaces(): Promise<Space[]> {
    const rows = await this.rows(`SELECT * FROM spaces ORDER BY created_at`);
    return rows.map(toSpace);
  }

  async updateSpace(id: string, patch: SpacePatch): Promise<Space | undefined> {
    const existing = await this.getSpace(id);
    if (!existing) return undefined;
    const updated: Space = { ...existing, ...patch, updatedAt: nowIso() };
    await this.run(
      `UPDATE spaces SET name = ?, description = ?, business_line = ?, updated_at = ? WHERE id = ?`,
      [updated.name, updated.description, updated.businessLine, updated.updatedAt, id],
    );
    return updated;
  }

  async deleteSpace(id: string): Promise<boolean> {
    await this.run(`DELETE FROM scenes WHERE space_id = ?`, [id]);
    await this.run(`DELETE FROM templates WHERE space_id = ?`, [id]);
    const res = await this.run(`DELETE FROM spaces WHERE id = ?`, [id]);
    return res.affectedRows > 0;
  }

  // ----- templates -----
  async createTemplate(input: CreateTemplateInput): Promise<Template> {
    const ts = nowIso();
    const tpl: Template = {
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
    await this.run(
      `INSERT INTO templates (id, space_id, name, psm, method, protocol, priority, features, enabled, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [tpl.id, tpl.spaceId, tpl.name, tpl.psm, tpl.method, tpl.protocol, tpl.priority, j(tpl.features), tpl.enabled ? 1 : 0, tpl.createdAt, tpl.updatedAt],
    );
    return tpl;
  }

  async getTemplate(id: string): Promise<Template | undefined> {
    const rows = await this.rows(`SELECT * FROM templates WHERE id = ?`, [id]);
    return rows[0] ? toTemplate(rows[0]) : undefined;
  }

  async listTemplates(spaceId?: string): Promise<Template[]> {
    const rows = spaceId
      ? await this.rows(`SELECT * FROM templates WHERE space_id = ? ORDER BY created_at`, [spaceId])
      : await this.rows(`SELECT * FROM templates ORDER BY created_at`);
    return rows.map(toTemplate);
  }

  async updateTemplate(id: string, patch: TemplatePatch): Promise<Template | undefined> {
    const existing = await this.getTemplate(id);
    if (!existing) return undefined;
    const u: Template = { ...existing, ...patch, updatedAt: nowIso() };
    await this.run(
      `UPDATE templates SET name = ?, psm = ?, method = ?, protocol = ?, priority = ?, features = ?, enabled = ?, updated_at = ? WHERE id = ?`,
      [u.name, u.psm, u.method, u.protocol, u.priority, j(u.features), u.enabled ? 1 : 0, u.updatedAt, id],
    );
    return u;
  }

  async deleteTemplate(id: string): Promise<boolean> {
    await this.run(`DELETE FROM scenes WHERE template_id = ?`, [id]);
    const res = await this.run(`DELETE FROM templates WHERE id = ?`, [id]);
    return res.affectedRows > 0;
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
    await this.run(
      `INSERT INTO scenes (id, space_id, template_id, name, priority, source, conditions, enabled, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [scene.id, scene.spaceId, scene.templateId, scene.name, scene.priority, scene.source, j(scene.conditions), scene.enabled ? 1 : 0, scene.createdAt, scene.updatedAt],
    );
    return scene;
  }

  async getScene(id: string): Promise<Scene | undefined> {
    const rows = await this.rows(`SELECT * FROM scenes WHERE id = ?`, [id]);
    return rows[0] ? toScene(rows[0]) : undefined;
  }

  async listScenes(filter?: { spaceId?: string; templateId?: string }): Promise<Scene[]> {
    const clauses: string[] = [];
    const params: Param[] = [];
    if (filter?.spaceId) {
      clauses.push(`space_id = ?`);
      params.push(filter.spaceId);
    }
    if (filter?.templateId) {
      clauses.push(`template_id = ?`);
      params.push(filter.templateId);
    }
    const where = clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
    const rows = await this.rows(`SELECT * FROM scenes${where} ORDER BY created_at`, params);
    return rows.map(toScene);
  }

  async updateScene(id: string, patch: ScenePatch): Promise<Scene | undefined> {
    const existing = await this.getScene(id);
    if (!existing) return undefined;
    const u: Scene = { ...existing, ...patch, updatedAt: nowIso() };
    await this.run(
      `UPDATE scenes SET name = ?, priority = ?, source = ?, conditions = ?, enabled = ?, updated_at = ? WHERE id = ?`,
      [u.name, u.priority, u.source, j(u.conditions), u.enabled ? 1 : 0, u.updatedAt, id],
    );
    return u;
  }

  async deleteScene(id: string): Promise<boolean> {
    const res = await this.run(`DELETE FROM scenes WHERE id = ?`, [id]);
    return res.affectedRows > 0;
  }

  // ----- exchanges -----
  async addExchanges(inputs: AddExchangeInput[]): Promise<Exchange[]> {
    const out: Exchange[] = [];
    for (const input of inputs) {
      const ex: Exchange = { ...input, id: input.id ?? newId("xch") };
      await this.run(
        `INSERT INTO exchanges (id, psm, method, request, response, meta)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [ex.id, ex.psm, ex.method, j(ex.request), j(ex.response), j(ex.meta)],
      );
      out.push(ex);
    }
    return out;
  }

  async listExchanges(filter?: ExchangeFilter): Promise<Exchange[]> {
    const clauses: string[] = [];
    const params: Param[] = [];
    if (filter?.psm) {
      clauses.push(`psm = ?`);
      params.push(filter.psm);
    }
    if (filter?.method) {
      clauses.push(`method = ?`);
      params.push(filter.method);
    }
    const where = clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
    const rows = await this.rows(`SELECT * FROM exchanges${where}`, params);
    return rows.map(toExchange);
  }

  async clearExchanges(filter?: ExchangeFilter): Promise<number> {
    const clauses: string[] = [];
    const params: Param[] = [];
    if (filter?.psm) {
      clauses.push(`psm = ?`);
      params.push(filter.psm);
    }
    if (filter?.method) {
      clauses.push(`method = ?`);
      params.push(filter.method);
    }
    const where = clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
    const res = await this.run(`DELETE FROM exchanges${where}`, params);
    return res.affectedRows;
  }
}
