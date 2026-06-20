# echo

**echo** is a business-scenario **coverage measurement** engine for HTTP traffic.

Code coverage tells you which *lines* ran. echo tells you which *business
scenarios* your traffic actually exercised — "did we ever see a return order
from region `ID` with `shipment_type = 2`?" — so you can measure the
business-semantic sufficiency of a test run, not just its line coverage.

It is an open-source reimagining of the core ideas behind internal
scenario-coverage platforms (Nario): you define **scenes** as labelled feature
combinations, feed in recorded **traffic**, and echo reports which scenes were
hit and your overall scene-coverage rate.

> Status: **engine + HTTP API** (v1). No web UI yet — that's on the roadmap.

## Concepts

```
Space ──▶ Template ──▶ Scene        +  Exchange (traffic)  ──▶ Coverage report
```

- **Space** — a workspace grouping templates and scenes for a team/business line.
- **Template** — the *feature keys* of one service interface (`psm` + `method`).
  A feature is a named, business-semantic **path** into a request or response,
  e.g. `buyer_region → body: buyer_region`.
- **Scene** — a labelled business case: a set of **conditions** over a
  template's features (`buyer_region == "ID"` AND `shipment_type == 2`). A scene
  is *hit* by an exchange when **all** its conditions match.
- **Exchange** — one recorded HTTP request/response pair (a unit of traffic).
- **Coverage report** — per-scene hit counts plus aggregate metrics
  (scene-coverage rate, hit-traffic ratio, …).

Matching is **exact on value *and* type**, so `"1"` (string) never matches `1`
(number) — the same precision Nario relies on.

## Path language

Feature paths address values inside a JSON document with `->` separators:

| Path | Meaning |
|------|---------|
| `data->page_size` | a leaf value |
| `data` | a non-leaf node — compares the whole subtree |
| `data->task_list->[*]->task_mode` | any array element (`[*]`) |
| `data->task_list->[0]->task_mode` | a specific array index |
| `Arguments->1->reqs->*->buyer_region` | any dynamic map key (`*`) |
| `data->^[0-9]$->v` | map keys matching the regex `/^[0-9]$/` |

Fan-out selectors (`[*]`, `*`, `^regex$`) can resolve to many values; a
value-comparing condition is satisfied when **any** resolved value matches.

## Quick start

```bash
npm install
npm test          # 35 tests
npm run build
npm start         # serves on :3000 (PORT / HOST env vars)
```

### Use as a library

```ts
import { measure, type Template, type Scene, type Exchange } from "fecho";

const template: Template = {
  id: "t1", spaceId: "s1", name: "order",
  psm: "demo.order.api", method: "/order/create", protocol: "http",
  priority: "P0", enabled: true, createdAt: "", updatedAt: "",
  features: [{ name: "region", location: "inbound", source: "body", path: "region" }],
};

const scenes: Scene[] = [{
  id: "sc1", spaceId: "s1", templateId: "t1", name: "region ID",
  priority: "P0", source: "manual", enabled: true, createdAt: "", updatedAt: "",
  conditions: [{ feature: "region", operator: "eq", value: "ID" }],
}];

const exchanges: Exchange[] = [
  { id: "x1", psm: "demo.order.api", method: "/order/create", request: { body: { region: "ID" } } },
  { id: "x2", psm: "demo.order.api", method: "/order/create", request: { body: { region: "US" } } },
];

const report = measure({ templates: [template], scenes, exchanges });
console.log(report.metrics.sceneCoverageRate); // 1  (the single scene was hit)
```

## HTTP API

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/health` | liveness |
| `POST`/`GET` | `/spaces`, `/spaces/:id` | manage spaces (also `PATCH`/`DELETE`) |
| `POST`/`GET` | `/templates`, `/templates/:id` | manage templates (`?spaceId=` filter) |
| `POST`/`GET` | `/scenes`, `/scenes/:id` | manage scenes (`?spaceId=`/`?templateId=`) |
| `POST`/`GET`/`DELETE` | `/exchanges` | ingest / list / clear traffic |
| `POST` | `/measure` | run coverage over stored or supplied traffic |
| `POST` | `/tools/resolve-path` | resolve a path against a JSON sample |

`POST /measure` accepts `{ spaceId?, exchanges? }`. With `exchanges` it measures
the supplied traffic ad-hoc; otherwise it uses stored exchanges.

## Operators

`eq` (value + type), `neq`, `exists`, `absent`, `contains` (array/substring),
`in` (value ∈ list).

## Roadmap

- Persistent stores (SQLite / Postgres) behind the `Repository` interface
- Web UI for templates, scenes, and coverage reports
- Traffic ingestion adapters (capture proxy, log import)
- Scene recommendation from observed traffic
- gRPC / Thrift exchange support

## License

MIT © Phillip Cheng
