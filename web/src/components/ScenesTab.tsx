import { useEffect, useState } from "react";
import { api } from "../api/client.ts";
import type {
  FeatureCondition,
  Json,
  Operator,
  Scene,
  Template,
  ValueType,
} from "../types.ts";

interface Props {
  spaceId: string;
  templates: Template[];
  scenes: Scene[];
  loading: boolean;
  reload: () => void;
}

const OPERATORS: Operator[] = ["eq", "neq", "exists", "absent", "contains", "in"];
const VALUE_TYPES: (ValueType | "auto")[] = [
  "auto",
  "string",
  "number",
  "boolean",
  "null",
  "object",
  "array",
];

/** Parse a free-text value into typed JSON, falling back to a string. */
function parseValue(text: string): Json {
  const t = text.trim();
  if (t === "") return "";
  try {
    return JSON.parse(t) as Json;
  } catch {
    return text;
  }
}

export function ScenesTab({ spaceId, templates, scenes, loading, reload }: Props) {
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [error, setError] = useState<string>();
  const [selectedId, setSelectedId] = useState<string>();

  useEffect(() => {
    if (!templateId && templates[0]) setTemplateId(templates[0].id);
  }, [templates, templateId]);

  async function create() {
    if (!name.trim() || !templateId) return;
    setError(undefined);
    try {
      const s = await api.createScene({ spaceId, templateId, name });
      setName("");
      reload();
      setSelectedId(s.id);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const selected = scenes.find((s) => s.id === selectedId);
  const selectedTemplate = templates.find((t) => t.id === selected?.templateId);
  const templateById = (id: string) => templates.find((t) => t.id === id);

  return (
    <>
      <div className="panel">
        <h2 style={{ marginTop: 0 }}>New scene</h2>
        {templates.length === 0 ? (
          <div className="muted">Create a template first — scenes reference its features.</div>
        ) : (
          <div className="row">
            <div className="field" style={{ flex: 1 }}>
              <label>Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ID standard return" />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Template</label>
              <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <button onClick={create} disabled={!name.trim() || !templateId}>
              Create
            </button>
          </div>
        )}
        {error && <div className="error">{error}</div>}
      </div>

      <div className="panel">
        {loading && <div className="empty">Loading…</div>}
        {!loading && scenes.length === 0 && <div className="empty">No scenes yet.</div>}
        {scenes.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Template</th>
                <th>Conditions</th>
                <th>Enabled</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {scenes.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td className="muted">{templateById(s.templateId)?.name ?? "—"}</td>
                  <td>{s.conditions.length}</td>
                  <td>
                    <span className={`badge ${s.enabled ? "on" : "off"}`}>
                      {s.enabled ? "on" : "off"}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      className="secondary small"
                      onClick={() => setSelectedId(selectedId === s.id ? undefined : s.id)}
                    >
                      {selectedId === s.id ? "Close" : "Edit conditions"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && selectedTemplate && (
        <ConditionEditor
          key={selected.id}
          scene={selected}
          template={selectedTemplate}
          reload={reload}
        />
      )}
    </>
  );
}

interface EditorRow {
  feature: string;
  operator: Operator;
  valueText: string;
  valueType: ValueType | "auto";
}

function ConditionEditor({
  scene,
  template,
  reload,
}: {
  scene: Scene;
  template: Template;
  reload: () => void;
}) {
  const toRow = (c: FeatureCondition): EditorRow => ({
    feature: c.feature,
    operator: c.operator,
    valueText: c.value === undefined ? "" : JSON.stringify(c.value),
    valueType: c.valueType ?? "auto",
  });

  const [rows, setRows] = useState<EditorRow[]>(scene.conditions.map(toRow));
  const [enabled, setEnabled] = useState(scene.enabled);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setRows(scene.conditions.map(toRow));
    setEnabled(scene.enabled);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  const featureNames = template.features.map((f) => f.name);

  function update(i: number, patch: Partial<EditorRow>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function add() {
    setRows((rs) => [
      ...rs,
      {
        feature: featureNames[0] ?? "",
        operator: "eq",
        valueText: "",
        valueType: "auto",
      },
    ]);
  }
  function remove(i: number) {
    setRows((rs) => rs.filter((_, idx) => idx !== i));
  }

  async function save() {
    setError(undefined);
    setSaved(false);
    const conditions: FeatureCondition[] = rows
      .filter((r) => r.feature)
      .map((r) => {
        const needsValue = r.operator !== "exists" && r.operator !== "absent";
        const cond: FeatureCondition = { feature: r.feature, operator: r.operator };
        if (needsValue) cond.value = parseValue(r.valueText);
        if (r.valueType !== "auto") cond.valueType = r.valueType;
        return cond;
      });
    try {
      await api.updateScene(scene.id, { conditions, enabled });
      reload();
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function destroy() {
    if (!confirm("Delete this scene?")) return;
    await api.deleteScene(scene.id);
    reload();
  }

  return (
    <div className="panel">
      <div className="row" style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>
          Conditions · <span className="mono muted">{scene.name}</span>
        </h2>
        <label className="right" style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          <span className="muted">enabled</span>
        </label>
      </div>
      <p className="muted" style={{ marginTop: 0 }}>
        A scene is hit when <b>all</b> conditions match. Values are matched on
        type too — enter JSON (<span className="mono">"ID"</span>,{" "}
        <span className="mono">2</span>, <span className="mono">true</span>).
      </p>

      <div className="cond-row">
        <span className="muted">Feature</span>
        <span className="muted">Operator</span>
        <span className="muted">Value (JSON)</span>
        <span className="muted">Type</span>
        <span></span>
      </div>
      {rows.map((r, i) => {
        const needsValue = r.operator !== "exists" && r.operator !== "absent";
        return (
          <div className="cond-row" key={i}>
            <select value={r.feature} onChange={(e) => update(i, { feature: e.target.value })}>
              {featureNames.length === 0 && <option value="">(no features)</option>}
              {featureNames.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <select value={r.operator} onChange={(e) => update(i, { operator: e.target.value as Operator })}>
              {OPERATORS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
            <input
              className="mono"
              value={r.valueText}
              disabled={!needsValue}
              onChange={(e) => update(i, { valueText: e.target.value })}
              placeholder={needsValue ? '"ID"' : "—"}
            />
            <select
              value={r.valueType}
              disabled={!needsValue}
              onChange={(e) => update(i, { valueType: e.target.value as ValueType | "auto" })}
            >
              {VALUE_TYPES.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
            <button className="danger small" onClick={() => remove(i)}>
              ✕
            </button>
          </div>
        );
      })}

      <div className="row" style={{ marginTop: 12 }}>
        <button className="secondary" onClick={add} disabled={featureNames.length === 0}>
          + Add condition
        </button>
        <button onClick={save}>Save</button>
        {saved && <span className="badge on">saved</span>}
        <button className="danger right" onClick={destroy}>
          Delete scene
        </button>
      </div>
      {error && <div className="error">{error}</div>}
    </div>
  );
}
