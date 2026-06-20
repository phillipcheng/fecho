import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildServer } from "../src/api/server.js";

describe("HTTP API", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildServer();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("reports health", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: "ok", service: "echo" });
  });

  it("runs the full space → template → scene → measure flow", async () => {
    const space = (
      await app.inject({
        method: "POST",
        url: "/spaces",
        payload: { name: "demo", businessLine: "qa" },
      })
    ).json();
    expect(space.id).toBeTruthy();

    const template = (
      await app.inject({
        method: "POST",
        url: "/templates",
        payload: {
          spaceId: space.id,
          name: "order",
          psm: "demo.order.api",
          method: "/order/create",
          features: [
            { name: "region", location: "inbound", source: "body", path: "region" },
          ],
        },
      })
    ).json();
    expect(template.id).toBeTruthy();

    const scene = (
      await app.inject({
        method: "POST",
        url: "/scenes",
        payload: {
          spaceId: space.id,
          templateId: template.id,
          name: "region ID",
          conditions: [{ feature: "region", operator: "eq", value: "ID" }],
        },
      })
    ).json();
    expect(scene.id).toBeTruthy();

    await app.inject({
      method: "POST",
      url: "/exchanges",
      payload: [
        {
          psm: "demo.order.api",
          method: "/order/create",
          request: { body: { region: "ID" } },
        },
        {
          psm: "demo.order.api",
          method: "/order/create",
          request: { body: { region: "US" } },
        },
      ],
    });

    const report = (
      await app.inject({
        method: "POST",
        url: "/measure",
        payload: { spaceId: space.id },
      })
    ).json();

    expect(report.metrics.totalTraffic).toBe(2);
    expect(report.metrics.coveredScenes).toBe(1);
    expect(report.scenes[0].trafficCount).toBe(1);
  });

  it("validates required fields", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/spaces",
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });

  it("rejects a template with an unknown space", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/templates",
      payload: { spaceId: "nope", name: "x", psm: "a.b.c", method: "/m" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("404s on a missing scene", async () => {
    const res = await app.inject({ method: "GET", url: "/scenes/missing" });
    expect(res.statusCode).toBe(404);
  });

  it("exposes the path resolver tool", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/tools/resolve-path",
      payload: {
        json: { data: { list: [{ v: 1 }, { v: 2 }] } },
        path: "data->list->[*]->v",
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ count: 2, values: [1, 2] });
  });
});
