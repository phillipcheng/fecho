import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.ts";
import { useAsync } from "../hooks.ts";

export function SpacesPage() {
  const spaces = useAsync(() => api.listSpaces(), []);
  const [name, setName] = useState("");
  const [businessLine, setBusinessLine] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!name.trim()) return;
    setBusy(true);
    setError(undefined);
    try {
      await api.createSpace({ name, businessLine, description });
      setName("");
      setBusinessLine("");
      setDescription("");
      spaces.reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this space and all its templates/scenes?")) return;
    await api.deleteSpace(id);
    spaces.reload();
  }

  return (
    <>
      <h1>Spaces</h1>
      <p className="subtitle">
        A space groups the templates and scenes for a team or business line.
      </p>

      <div className="panel">
        <h2 style={{ marginTop: 0 }}>New space</h2>
        <div className="row">
          <div className="field" style={{ flex: 1 }}>
            <label>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. reverse-qa" />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Business line</label>
            <input
              value={businessLine}
              onChange={(e) => setBusinessLine(e.target.value)}
              placeholder="e.g. ecom / aftersale"
            />
          </div>
          <div className="field" style={{ flex: 2 }}>
            <label>Description</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="optional"
            />
          </div>
          <button onClick={create} disabled={busy || !name.trim()}>
            Create
          </button>
        </div>
        {error && <div className="error">{error}</div>}
      </div>

      <div className="panel">
        {spaces.loading && <div className="empty">Loading…</div>}
        {spaces.error && (
          <div className="error">
            Could not reach the echo API: {spaces.error}. Is the backend running on :3000?
          </div>
        )}
        {spaces.data && spaces.data.length === 0 && (
          <div className="empty">No spaces yet — create one above.</div>
        )}
        {spaces.data && spaces.data.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Business line</th>
                <th>Description</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {spaces.data.map((s) => (
                <tr key={s.id}>
                  <td>
                    <Link to={`/spaces/${s.id}`}>{s.name}</Link>
                  </td>
                  <td className="muted">{s.businessLine || "—"}</td>
                  <td className="muted">{s.description || "—"}</td>
                  <td style={{ textAlign: "right" }}>
                    <button className="danger small" onClick={() => remove(s.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
