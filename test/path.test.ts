import { describe, expect, it } from "vitest";
import { parsePath, PathParseError } from "../src/path/parse.js";
import { resolvePath } from "../src/path/resolve.js";
import type { Json } from "../src/domain/types.js";

const doc: Json = {
  data: {
    page_size: 20,
    task_list: [{ task_mode: "auto" }, { task_mode: "manual" }],
  },
  Arguments: {
    "1": {
      reqs: {
        k1: { buyer_region: "ID" },
        k2: { buyer_region: "US" },
      },
    },
  },
  nums: {
    "0": { v: 1 },
    "10": { v: 2 },
    abc: { v: 3 },
  },
};

describe("parsePath", () => {
  it("classifies segment kinds", () => {
    expect(parsePath("data->task_list->[*]->task_mode")).toEqual([
      { kind: "key", key: "data" },
      { kind: "key", key: "task_list" },
      { kind: "anyIndex" },
      { kind: "key", key: "task_mode" },
    ]);
  });

  it("treats [N] as array index and bare number as object key", () => {
    expect(parsePath("Arguments->1->[0]")).toEqual([
      { kind: "key", key: "Arguments" },
      { kind: "key", key: "1" },
      { kind: "index", index: 0 },
    ]);
  });

  it("recognises dynamic and regex keys", () => {
    const segs = parsePath("a->*->^[0-9]$");
    expect(segs[1]).toEqual({ kind: "anyKey" });
    expect(segs[2]?.kind).toBe("regexKey");
  });

  it("rejects empty paths and empty segments", () => {
    expect(() => parsePath("")).toThrow(PathParseError);
    expect(() => parsePath("a->")).toThrow(PathParseError);
  });
});

describe("resolvePath", () => {
  it("resolves a leaf path", () => {
    expect(resolvePath(doc, "data->page_size")).toEqual([20]);
  });

  it("resolves a non-leaf path to the whole subtree", () => {
    expect(resolvePath(doc, "data->task_list->[0]")).toEqual([
      { task_mode: "auto" },
    ]);
  });

  it("fans out over [*]", () => {
    expect(resolvePath(doc, "data->task_list->[*]->task_mode")).toEqual([
      "auto",
      "manual",
    ]);
  });

  it("selects a specific array index", () => {
    expect(resolvePath(doc, "data->task_list->[1]->task_mode")).toEqual([
      "manual",
    ]);
  });

  it("returns empty for out-of-range index", () => {
    expect(resolvePath(doc, "data->task_list->[9]->task_mode")).toEqual([]);
  });

  it("fans out over dynamic map keys (*)", () => {
    expect(resolvePath(doc, "Arguments->1->reqs->*->buyer_region")).toEqual([
      "ID",
      "US",
    ]);
  });

  it("matches map keys by regex", () => {
    // only key "0" matches /^[0-9]$/; "10" and "abc" do not
    expect(resolvePath(doc, "nums->^[0-9]$->v")).toEqual([1]);
  });

  it("returns empty when the path misses", () => {
    expect(resolvePath(doc, "data->missing")).toEqual([]);
    expect(resolvePath(doc, "data->page_size->deeper")).toEqual([]);
  });
});
