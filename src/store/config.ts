export interface MysqlConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  /** Attempt CREATE DATABASE IF NOT EXISTS on connect (default true). */
  createDatabase: boolean;
}

function parseUrl(url: string): MysqlConfig | undefined {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return undefined;
  }
  if (!u.protocol.startsWith("mysql")) return undefined;
  return {
    host: u.hostname || "localhost",
    port: u.port ? Number(u.port) : 3306,
    user: decodeURIComponent(u.username) || "root",
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, "") || "echo",
    createDatabase: process.env.ECHO_MYSQL_CREATE_DB !== "false",
  };
}

/**
 * Read MySQL config from the environment. Returns undefined when no MySQL is
 * configured (caller falls back to the in-memory store).
 *
 * Supported:
 *   ECHO_MYSQL_URL / MYSQL_URL = mysql://user:pass@host:3306/dbname
 *   or MYSQL_HOST / MYSQL_PORT / MYSQL_USER / MYSQL_PASSWORD / MYSQL_DATABASE
 */
export function readMysqlConfigFromEnv(env = process.env): MysqlConfig | undefined {
  const url = env.ECHO_MYSQL_URL ?? env.MYSQL_URL;
  if (url) return parseUrl(url);

  const host = env.MYSQL_HOST;
  const user = env.MYSQL_USER;
  if (!host && !user) return undefined; // MySQL not configured

  return {
    host: host ?? "localhost",
    port: env.MYSQL_PORT ? Number(env.MYSQL_PORT) : 3306,
    user: user ?? "root",
    password: env.MYSQL_PASSWORD ?? "",
    database: env.MYSQL_DATABASE ?? "echo",
    createDatabase: env.ECHO_MYSQL_CREATE_DB !== "false",
  };
}
