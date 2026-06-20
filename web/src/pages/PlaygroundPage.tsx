import { useState } from "react";
import { api } from "../api/client.ts";
import type { Json } from "../types.ts";

const SAMPLE_JSON = `{
  "data": {
    "page_size": 20,
    "task_list": [
      { "task_mode": "auto" },
      { "task_mode": "manual" }
    ]
  }
}`;

export function PlaygroundPage() {
  const [jsonText, setJsonText] = useState(SAMPLE_JSON);
  const [path, setPath] = useState("data->task_list->[*]->task_mode");
  const [result, setResult] = useState<{ count: number; values: Json[] }>();
  const [error, setError] = useState<string>();

  async function resolve() {
    setError(undefined);
    setResult(undefined);
    let json: Json;
    try {
      json = JSON.parse(jsonText) as Json;
    } catch (e) {
      setError(`Invalid JSON: ${(e as Error).message}`);
      return;
    }
    try {
      const r = await api.resolvePath(json, path);
      setResult({ count: r.count, values: r.values });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <>
      <h1>Path playground</h1>
      <p className="subtitle">
        Test a feature path against a JSON sample before adding it to a template.
      </p>

      <div className="panel">
        <div className="field">
          <label>JSON sample</label>
          <textarea value={jsonText} onChange={(e) => setJsonText(e.target.value)} spellCheck={false} />
        </div>
        <div className="field">
          <label>Path</label>
          <input className="mono" value={path} onChange={(e) => setPath(e.target.value)} />
        </div>
        <button onClick={resolve}>Resolve</button>
        {error && <div className="error">{error}</div>}
      </div>

      {result && (
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>
            Resolved {result.count} value{result.count === 1 ? "" : "s"}
          </h2>
          <pre className="mono" style={{ margin: 0, whiteSpace: "pre-wrap" }}>
            {JSON.stringify(result.values, null, 2)}
          </pre>
        </div>
      )}

      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Path syntax</h2>
        <table>
          <tbody>
            <tr><td className="mono">a-&gt;b</td><td className="muted">nested object key</td></tr>
            <tr><td className="mono">a</td><td className="muted">non-leaf — selects the whole subtree</td></tr>
            <tr><td className="mono">a-&gt;[*]-&gt;b</td><td className="muted">any array element</td></tr>
            <tr><td className="mono">a-&gt;[0]-&gt;b</td><td className="muted">a specific array index</td></tr>
            <tr><td className="mono">a-&gt;*-&gt;b</td><td className="muted">any dynamic map key</td></tr>
            <tr><td className="mono">a-&gt;^[0-9]$-&gt;b</td><td className="muted">map keys matching a regex</td></tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
