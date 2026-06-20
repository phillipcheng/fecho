import { describe, expect, it } from "vitest";
import { measure } from "../src/coverage/measure.js";
import type {
  Exchange,
  FeatureDef,
  Scene,
  Template,
} from "../src/domain/types.js";

const features: FeatureDef[] = [
  { name: "region", location: "inbound", source: "body", path: "region" },
  { name: "type", location: "inbound", source: "body", path: "type" },
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

function scene(id: string, region: string, enabled = true): Scene {
  return {
    id,
    spaceId: "spc1",
    templateId: "tpl1",
    name: `region ${region}`,
    priority: "P0",
    source: "manual",
    conditions: [{ feature: "region", operator: "eq", value: region }],
    enabled,
    createdAt: "",
    updatedAt: "",
  };
}

function exchange(id: string, region: string): Exchange {
  return {
    id,
    psm: "demo.order.api",
    method: "/order/create",
    request: { body: { region, type: 1 } },
  };
}

describe("measure", () => {
  it("computes per-scene coverage and aggregate metrics", () => {
    const scenes = [scene("s_id", "ID"), scene("s_us", "US"), scene("s_gb", "GB")];
    const exchanges = [
      exchange("x1", "ID"),
      exchange("x2", "ID"),
      exchange("x3", "US"),
      exchange("x4", "FR"), // hits no scene
    ];

    const report = measure({ templates: [template], scenes, exchanges });

    const byId = Object.fromEntries(report.scenes.map((s) => [s.sceneId, s]));
    expect(byId.s_id?.trafficCount).toBe(2);
    expect(byId.s_id?.covered).toBe(true);
    expect(byId.s_us?.trafficCount).toBe(1);
    expect(byId.s_gb?.covered).toBe(false);

    expect(report.metrics.totalTraffic).toBe(4);
    expect(report.metrics.sceneTotal).toBe(3);
    expect(report.metrics.coveredScenes).toBe(2);
    expect(report.metrics.templateTotal).toBe(1);
    expect(report.metrics.interfaceTotal).toBe(1);
    expect(report.metrics.sceneCoverageRate).toBeCloseTo(2 / 3);
    // x1,x2,x3 hit a scene; x4 doesn't → 3/4
    expect(report.metrics.hitTrafficRatio).toBeCloseTo(3 / 4);
  });

  it("excludes disabled scenes from measurement", () => {
    const scenes = [scene("s_id", "ID"), scene("s_us", "US", false)];
    const report = measure({
      templates: [template],
      scenes,
      exchanges: [exchange("x1", "ID"), exchange("x2", "US")],
    });
    expect(report.metrics.sceneTotal).toBe(1);
    expect(report.scenes.map((s) => s.sceneId)).toEqual(["s_id"]);
  });

  it("excludes scenes on a disabled template", () => {
    const disabledTpl = { ...template, enabled: false };
    const report = measure({
      templates: [disabledTpl],
      scenes: [scene("s_id", "ID")],
      exchanges: [exchange("x1", "ID")],
    });
    expect(report.metrics.sceneTotal).toBe(0);
    expect(report.metrics.sceneCoverageRate).toBe(0);
  });

  it("handles empty traffic gracefully", () => {
    const report = measure({
      templates: [template],
      scenes: [scene("s_id", "ID")],
      exchanges: [],
    });
    expect(report.metrics.hitTrafficRatio).toBe(0);
    expect(report.metrics.coveredScenes).toBe(0);
  });
});
