import { randomUUID } from "node:crypto";

/** Generate a prefixed, sortable-ish id, e.g. "scn_3f1c…". */
export function newId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 20)}`;
}

/** Current timestamp in ISO-8601, for createdAt/updatedAt fields. */
export function nowIso(): string {
  return new Date().toISOString();
}
