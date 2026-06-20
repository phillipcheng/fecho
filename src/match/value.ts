import type { Json, ValueType } from "../domain/types.js";

/** Infer the echo value-type tag of a JSON value. */
export function valueTypeOf(v: Json): ValueType {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  switch (typeof v) {
    case "string":
      return "string";
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    default:
      return "object";
  }
}

/**
 * Structural equality. Distinguishes types, so `"1"` (string) is NOT equal to
 * `1` (number) — the precise matching Nario relies on for scene rules.
 */
export function deepEqual(a: Json, b: Json): boolean {
  if (a === b) return true;
  const ta = valueTypeOf(a);
  const tb = valueTypeOf(b);
  if (ta !== tb) return false;
  if (ta === "array") {
    const aa = a as Json[];
    const bb = b as Json[];
    if (aa.length !== bb.length) return false;
    for (let i = 0; i < aa.length; i++) {
      if (!deepEqual(aa[i] as Json, bb[i] as Json)) return false;
    }
    return true;
  }
  if (ta === "object") {
    const ao = a as Record<string, Json>;
    const bo = b as Record<string, Json>;
    const ak = Object.keys(ao);
    const bk = Object.keys(bo);
    if (ak.length !== bk.length) return false;
    for (const k of ak) {
      if (!Object.prototype.hasOwnProperty.call(bo, k)) return false;
      if (!deepEqual(ao[k] as Json, bo[k] as Json)) return false;
    }
    return true;
  }
  // primitives that weren't `===` are unequal
  return false;
}

/**
 * Typed equality: value matches `expected` AND, when `expectedType` is given,
 * the candidate's type tag equals it too.
 */
export function typedEqual(
  candidate: Json,
  expected: Json,
  expectedType?: ValueType,
): boolean {
  if (expectedType && valueTypeOf(candidate) !== expectedType) return false;
  return deepEqual(candidate, expected);
}
