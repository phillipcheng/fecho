import { describe, expect, it } from "vitest";
import { deepEqual, typedEqual, valueTypeOf } from "../src/match/value.js";
import { evaluateCondition } from "../src/match/condition.js";
import { evaluateScene } from "../src/match/scene.js";
import type {
  Exchange,
  FeatureDef,
  Scene,
  Template,
} from "../src/domain/types.js";

describe("value typing & equality", () => {
  it("infers value types", () => {
    expect(valueTypeOf("x")).toBe("string");
    expect(valueTypeOf(1)).toBe("number");
    expect(valueTypeOf(true)).toBe("boolean");
    expect(valueTypeOf(null)).toBe("null");
    expect(valueTypeOf([1])).toBe("array");
    expect(valueTypeOf({ a: 1 })).toBe("object");
  });

  it("distinguishes string and number (\"1\" != 1)", () => {
    expect(deepEqual("1", 1)).toBe(false);
    expect(deepEqual(1, 1)).toBe(true);
  });

  it("deep-equals objects and arrays regardless of key order", () => {
    expect(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
    expect(deepEqual([1, [2, 3]], [1, [2, 3]])).toBe(true);
    expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  it("typedEqual enforces an explicit type tag", () => {
    expect(typedEqual(1, 1, "number")).toBe(true);
    expect(typedEqual(1, 1, "string")).toBe(false);
  });
});

const features: FeatureDef[] = [
  { name: "buyer_region", location: "inbound", source: "body", path: "buyer_region" },
  { name: "shipment_type", location: "inbound", source: "body", path: "shipment_type" },
  { name: "order_status", location: "outbound", source: "response", path: "data->status" },
  { name: "any_mode", location: "inbound", source: "body", path: "items->[*]->mode" },
];

const template: Template = {
  id: "tpl1",
  spaceId: "spc1",
  name: "order",
  psm: "demo.order.api",
  method: "/order/create",
  protocol: "http",
  priority: "P0",
  features,
  enabled: true,
  createdAt: "",
  updatedAt: "",
};

function exchange(overrides: Partial<Exchange> = {}): Exchange {
  return {
    id: "x1",
    psm: "demo.order.api",
    method: "/order/create",
    request: {
      body: {
        buyer_region: "ID",
        shipment_type: 2,
        items: [{ mode: "a" }, { mode: "b" }],
      },
    },
    response: { body: { data: { status: 1 } } },
    ...overrides,
  };
}

describe("evaluateCondition", () => {
  const idx = new Map(features.map((f) => [f.name, f]));

  it("matches value AND type with eq", () => {
    const r = evaluateCondition(
      { feature: "buyer_region", operator: "eq", value: "ID" },
      idx.get("buyer_region"),
      exchange(),
    );
    expect(r.satisfied).toBe(true);
  });

  it("fails eq on type mismatch (string vs number)", () => {
    const r = evaluateCondition(
      { feature: "shipment_type", operator: "eq", value: "2" },
      idx.get("shipment_type"),
      exchange(),
    );
    expect(r.satisfied).toBe(false);
  });

  it("supports any-match over [*] fan-out", () => {
    const r = evaluateCondition(
      { feature: "any_mode", operator: "eq", value: "b" },
      idx.get("any_mode"),
      exchange(),
    );
    expect(r.satisfied).toBe(true);
    expect(r.resolved).toEqual(["a", "b"]);
  });

  it("reads from the response side for outbound features", () => {
    const r = evaluateCondition(
      { feature: "order_status", operator: "eq", value: 1 },
      idx.get("order_status"),
      exchange(),
    );
    expect(r.satisfied).toBe(true);
  });

  it("handles exists / absent", () => {
    expect(
      evaluateCondition(
        { feature: "buyer_region", operator: "exists" },
        idx.get("buyer_region"),
        exchange(),
      ).satisfied,
    ).toBe(true);
    expect(
      evaluateCondition(
        { feature: "buyer_region", operator: "absent" },
        idx.get("buyer_region"),
        exchange({ request: { body: {} } }),
      ).satisfied,
    ).toBe(true);
  });

  it("flags an unknown feature", () => {
    const r = evaluateCondition(
      { feature: "ghost", operator: "eq", value: 1 },
      undefined,
      exchange(),
    );
    expect(r.satisfied).toBe(false);
    expect(r.reason).toContain("not defined");
  });
});

describe("evaluateScene", () => {
  function scene(conditions: Scene["conditions"]): Scene {
    return {
      id: "scn1",
      spaceId: "spc1",
      templateId: "tpl1",
      name: "ID standard",
      priority: "P0",
      source: "manual",
      conditions,
      enabled: true,
      createdAt: "",
      updatedAt: "",
    };
  }

  it("hits only when ALL conditions match", () => {
    const s = scene([
      { feature: "buyer_region", operator: "eq", value: "ID" },
      { feature: "shipment_type", operator: "eq", value: 2 },
    ]);
    expect(evaluateScene(s, template, exchange()).hit).toBe(true);

    const miss = scene([
      { feature: "buyer_region", operator: "eq", value: "ID" },
      { feature: "shipment_type", operator: "eq", value: 99 },
    ]);
    expect(evaluateScene(miss, template, exchange()).hit).toBe(false);
  });

  it("does not hit when the interface differs", () => {
    const s = scene([{ feature: "buyer_region", operator: "eq", value: "ID" }]);
    const other = exchange({ method: "/order/cancel" });
    const m = evaluateScene(s, template, other);
    expect(m.applicable).toBe(false);
    expect(m.hit).toBe(false);
  });

  it("never hits with zero conditions", () => {
    expect(evaluateScene(scene([]), template, exchange()).hit).toBe(false);
  });
});
