import { useState } from "react";
import { api } from "../api/client.ts";
import { useAsync } from "../hooks.ts";

const SAMPLE = `[
  {
    "psm": "demo.order.api",
    "method": "/order/create",
    "request": { "body": { "region": "ID", "shipment_type": 2 } },
    "response": { "body": { "data": { "status": 1 } } }
  }
]`;

export function TrafficTab() {
  const exchanges = useAsync(() => api.listExchanges(), []);
  const [text, setText] = useState(SAMPLE);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function ingest() {
    setError(undefined);
    setBusy(true);
    try {
      const parsed = JSON.parse(text);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      await api.addExchanges(arr);
      exchanges.reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function clearAll() {
    if (!confirm("Clear all stored traffic?")) return;
    await api.clearExchanges();
    exchanges.reload();
  }

  return (
    <>
      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Ingest traffic</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Paste recorded HTTP exchanges as a JSON array. Each needs{" "}
          <span className="mono">psm</span> and <span className="mono">method</span>; request/response
          bodies are what scenes match against.
        </p>
        <textarea value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} />
        <div className="row" style={{ marginTop: 10 }}>
          <button onClick={ingest} disabled={busy}>
            Ingest
          </button>
          <button className="secondary" onClick={() => setText(SAMPLE)}>
            Reset sample
          </button>
        </div>
        {error && <div className="error">{error}</div>}
      </div>

      <div className="panel">
        <div className="row" style={{ marginBottom: 10 }}>
          <h2 style={{ margin: 0 }}>Stored traffic ({exchanges.data?.length ?? 0})</h2>
          {(exchanges.data?.length ?? 0) > 0 && (
            <button className="danger right" onClick={clearAll}>
              Clear all
            </button>
          )}
        </div>
        {exchanges.loading && <div className="empty">Loading…</div>}
        {exchanges.data && exchanges.data.length === 0 && (
          <div className="empty">No traffic stored yet.</div>
        )}
        {exchanges.data && exchanges.data.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>PSM</th>
                <th>Method</th>
                <th>Request body</th>
              </tr>
            </thead>
            <tbody>
              {exchanges.data.map((x) => (
                <tr key={x.id}>
                  <td className="mono muted">{x.id.slice(0, 12)}</td>
                  <td className="mono">{x.psm}</td>
                  <td className="mono">{x.method}</td>
                  <td className="mono muted" style={{ maxWidth: 380, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {JSON.stringify(x.request?.body ?? {})}
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
