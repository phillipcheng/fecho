import { useEffect, useState } from "react";
import { api } from "../api/client.ts";
import type {
  FeatureDef,
  FeatureLocation,
  FeatureSource,
  Template,
} from "../types.ts";

interface Props {
  spaceId: string;
  templates: Template[];
  loading: boolean;
  reload: () => void;
}

const LOCATIONS: FeatureLocation[] = ["inbound", "outbound"];
const SOURCES: FeatureSource[] = ["query", "header", "body", "response"];

export function TemplatesTab({ spaceId, templates, loading, reload }: Props) {
  const [name, setName] = useState("");
  const [psm, setPsm] = useState("");
  const [method, setMethod] = useState("");
  const [error, setError] = useState<string>();
  const [selectedId, setSelectedId] = useState<string>();

  async function create() {
    if (!name.trim() || !psm.trim() || !method.trim()) return;
    setError(undefined);
    try {
      const t = await api.createTemplate({ spaceId, name, psm, method });
      setName("");
      setPsm("");
      setMethod("");
      reload();
      setSelectedId(t.id);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const selected = templates.find((t) => t.id === selectedId);

  return (
    <>
      <div className="panel">
        <h2 style={{ marginTop: 0 }}>New template</h2>
        <div className="row">
          <div className="field" style={{ flex: 1 }}>
            <label>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="order create" />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>PSM / service</label>
            <input value={psm} onChange={(e) => setPsm(e.target.value)} placeholder="demo.order.api" />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Method</label>
            <input value={method} onChange={(e) => setMethod(e.target.value)} placeholder="/order/create" />
          </div>
          <button onClick={create} disabled={!name.trim() || !psm.trim() || !method.trim()}>
            Create
          </button>
        </div>
        {error && <div className="error">{error}</div>}
      </div>

      <div className="panel">
        {loading && <div className="empty">Loading…</div>}
        {!loading && templates.length === 0 && (
          <div className="empty">No templates yet — define one above.</div>
        )}
        {templates.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Interface</th>
                <th>Features</th>
                <th>Enabled</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td className="mono muted">
                    {t.psm} {t.method}
                  </td>
                  <td>{t.features.length}</td>
                  <td>
                    <span className={`badge ${t.enabled ? "on" : "off"}`}>
                      {t.enabled ? "on" : "off"}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      className="secondary small"
                      onClick={() => setSelectedId(selectedId === t.id ? undefined : t.id)}
                    >
                      {selectedId === t.id ? "Close" : "Edit features"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <FeatureEditor key={selected.id} template={selected} reload={reload} />
      )}
    </>
  );
}

function FeatureEditor({ template, reload }: { template: Template; reload: () => void }) {
  const [features, setFeatures] = useState<FeatureDef[]>(template.features);
  const [enabled, setEnabled] = useState(template.enabled);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setFeatures(template.features);
    setEnabled(template.enabled);
  }, [template]);

  function update(i: number, patch: Partial<FeatureDef>) {
    setFeatures((fs) => fs.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  }
  function add() {
    setFeatures((fs) => [
      ...fs,
      { name: "", location: "inbound", source: "body", path: "" },
    ]);
  }
  function remove(i: number) {
    setFeatures((fs) => fs.filter((_, idx) => idx !== i));
  }

  async function save() {
    setError(undefined);
    setSaved(false);
    const clean = features.filter((f) => f.name.trim() && f.path.trim());
    try {
      await api.updateTemplate(template.id, { features: clean, enabled });
      reload();
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function destroy() {
    if (!confirm("Delete this template and its scenes?")) return;
    await api.deleteTemplate(template.id);
    reload();
  }

  return (
    <div className="panel">
      <div className="row" style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>
          Features · <span className="mono muted">{template.name}</span>
        </h2>
        <label className="right" style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          <span className="muted">enabled for measurement</span>
        </label>
      </div>

      <div className="feat-row">
        <span className="muted">Feature name</span>
        <span className="muted">Location</span>
        <span className="muted">Source</span>
        <span className="muted">Path</span>
        <span></span>
      </div>
      {features.map((f, i) => (
        <div className="feat-row" key={i}>
          <input value={f.name} onChange={(e) => update(i, { name: e.target.value })} placeholder="buyer_region" />
          <select value={f.location} onChange={(e) => update(i, { location: e.target.value as FeatureLocation })}>
            {LOCATIONS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <select value={f.source} onChange={(e) => update(i, { source: e.target.value as FeatureSource })}>
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input
            className="mono"
            value={f.path}
            onChange={(e) => update(i, { path: e.target.value })}
            placeholder="data->items->[*]->mode"
          />
          <button className="danger small" onClick={() => remove(i)}>
            ✕
          </button>
        </div>
      ))}

      <div className="row" style={{ marginTop: 12 }}>
        <button className="secondary" onClick={add}>
          + Add feature
        </button>
        <button onClick={save}>Save</button>
        {saved && <span className="badge on">saved</span>}
        <button className="danger right" onClick={destroy}>
          Delete template
        </button>
      </div>
      {error && <div className="error">{error}</div>}
    </div>
  );
}
