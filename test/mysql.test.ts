import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readMysqlConfigFromEnv } from "../src/store/config.js";
import { MySqlRepository } from "../src/store/mysql.js";
import { measure } from "../src/coverage/measure.js";

// Opt-in integration test. Provide a database to exercise the real backend:
//   ECHO_MYSQL_TEST_URL="mysql://user:pass@localhost:3306/echo_test" npm test
const testUrl = process.env.ECHO_MYSQL_TEST_URL;
const config = testUrl ? readMysqlConfigFromEnv({ ECHO_MYSQL_URL: testUrl }) : undefined;

describe.skipIf(!config)("MySqlRepository (integration)", () => {
  let repo: MySqlRepository;

  beforeAll(async () => {
    repo = await MySqlRepository.connect(config!);
  });

  afterAll(async () => {
    await repo?.close();
  });

  it("round-trips the full space → template → scene → measure lifecycle", async () => {
    const space = await repo.createSpace({ name: "it-space", businessLine: "qa" });

    const template = await repo.createTemplate({
      spaceId: space.id,
      name: "order",
      psm: "demo.order.api",
      method: "/order/create",
      features: [
        { name: "region", location: "inbound", source: "body", path: "region" },
        { name: "type", location: "inbound", source: "body", path: "type" },
      ],
    });

    const scene = await repo.createScene({
      spaceId: space.id,
      templateId: template.id,
      name: "region ID",
      conditions: [
        { feature: "region", operator: "eq", value: "ID" },
        { feature: "type", operator: "eq", value: 2 },
      ],
    });

    // JSON columns survive the round trip (incl. value type: number 2)
    const reread = await repo.getScene(scene.id);
    expect(reread?.conditions).toEqual(scene.conditions);

    await repo.addExchanges([
      {
        psm: "demo.order.api",
        method: "/order/create",
        request: { body: { region: "ID", type: 2 } },
      },
      {
        psm: "demo.order.api",
        method: "/order/create",
        request: { body: { region: "ID", type: 99 } },
      },
    ]);

    const report = measure({
      templates: await repo.listTemplates(space.id),
      scenes: await repo.listScenes({ spaceId: space.id }),
      exchanges: await repo.listExchanges({ psm: "demo.order.api" }),
    });
    expect(report.metrics.coveredScenes).toBe(1);
    expect(report.scenes[0]?.trafficCount).toBe(1);

    // update + persistence
    const updated = await repo.updateScene(scene.id, { enabled: false });
    expect(updated?.enabled).toBe(false);
    expect((await repo.getScene(scene.id))?.enabled).toBe(false);

    // cascade delete + cleanup
    await repo.clearExchanges({ psm: "demo.order.api" });
    expect(await repo.deleteSpace(space.id)).toBe(true);
    expect(await repo.getTemplate(template.id)).toBeUndefined();
    expect(await repo.getScene(scene.id)).toBeUndefined();
  });
});
