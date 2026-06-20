import { readMysqlConfigFromEnv } from "./config.js";
import { MemoryRepository } from "./memory.js";
import { MySqlRepository } from "./mysql.js";
import type { Repository } from "./repository.js";

export interface CreateRepositoryResult {
  repo: Repository;
  backend: "mysql" | "memory";
  /** Present for the mysql backend; useful for logging. */
  database?: string;
}

/**
 * Pick a Repository from the environment: MySQL when the MYSQL_* (or
 * ECHO_MYSQL_URL) env vars are configured (see config.ts), otherwise memory.
 */
export async function createRepository(): Promise<CreateRepositoryResult> {
  const cfg = readMysqlConfigFromEnv();
  if (cfg) {
    const repo = await MySqlRepository.connect(cfg);
    return { repo, backend: "mysql", database: cfg.database };
  }
  return { repo: new MemoryRepository(), backend: "memory" };
}
