import type { Json } from "../domain/types.js";
import { parsePath, type Segment } from "./parse.js";

function isPlainObject(v: Json): v is { [key: string]: Json } {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function step(values: Json[], seg: Segment): Json[] {
  const out: Json[] = [];
  for (const v of values) {
    switch (seg.kind) {
      case "key": {
        if (isPlainObject(v) && Object.prototype.hasOwnProperty.call(v, seg.key)) {
          out.push(v[seg.key] as Json);
        }
        break;
      }
      case "index": {
        if (Array.isArray(v) && seg.index >= 0 && seg.index < v.length) {
          out.push(v[seg.index] as Json);
        }
        break;
      }
      case "anyIndex": {
        if (Array.isArray(v)) {
          for (const el of v) out.push(el);
        }
        break;
      }
      case "anyKey": {
        if (isPlainObject(v)) {
          for (const key of Object.keys(v)) out.push(v[key] as Json);
        }
        break;
      }
      case "regexKey": {
        if (isPlainObject(v)) {
          for (const key of Object.keys(v)) {
            if (seg.re.test(key)) out.push(v[key] as Json);
          }
        }
        break;
      }
    }
  }
  return out;
}

/**
 * Resolve a parsed path against a JSON root, returning every value the path
 * addresses. Selectors that fan out (`[*]`, `*`, `^regex$`) can yield multiple
 * values; a path that addresses nothing yields an empty array.
 */
export function resolveSegments(root: Json, segments: Segment[]): Json[] {
  let current: Json[] = [root];
  for (const seg of segments) {
    if (current.length === 0) break;
    current = step(current, seg);
  }
  return current;
}

/** Convenience: parse `path` and resolve it against `root`. */
export function resolvePath(root: Json, path: string): Json[] {
  return resolveSegments(root, parsePath(path));
}
