import { useState } from "react";
import { api } from "../api/client.ts";
import type { CoverageReport } from "../types.ts";

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

export function ReportTab({
  spaceId,
  onChanged,
}: {
  spaceId: string;
  onChanged: () => void;
}) {
  const [report, setReport] = useState<CoverageReport>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setError(undefined);
    try {
      onChanged();
      setReport(await api.measure({ spaceId }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="panel">
        <div className="row">
          <h2 style={{ margin: 0 }}>Coverage report</h2>
          <button className="right" onClick={run} disabled={busy}>
            {busy ? "Measuring…" : "Run measurement"}
          </button>
        </div>
        <p className="muted" style={{ marginBottom: 0 }}>
          Measures the stored traffic against this space's enabled scenes.
        </p>
        {error && <div className="error">{error}</div>}
      </div>

      {report && (
        <>
          <div className="panel">
            <div className="metric-grid">
              <Metric label="Scene coverage" value={pct(report.metrics.sceneCoverageRate)} />
              <Metric
                label="Covered scenes"
                value={`${report.metrics.coveredScenes} / ${report.metrics.sceneTotal}`}
              />
              <Metric label="Hit-traffic ratio" value={pct(report.metrics.hitTrafficRatio)} />
              <Metric label="Total traffic" value={String(report.metrics.totalTraffic)} />
              <Metric label="Interfaces" value={String(report.metrics.interfaceTotal)} />
              <Metric label="Templates" value={String(report.metrics.templateTotal)} />
            </div>
          </div>

          <div className="panel">
            <h2 style={{ marginTop: 0 }}>Scenes</h2>
            {report.scenes.length === 0 ? (
              <div className="empty">No enabled scenes participated.</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Scene</th>
                    <th>Interface</th>
                    <th>Traffic hits</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {report.scenes.map((s) => (
                    <tr key={s.sceneId}>
                      <td>{s.name}</td>
                      <td className="mono muted">
                        {s.psm} {s.method}
                      </td>
                      <td>{s.trafficCount}</td>
                      <td>
                        <span className={`badge ${s.covered ? "on" : "muted"}`}>
                          {s.covered ? "covered" : "uncovered"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <div className="value">{value}</div>
      <div className="label">{label}</div>
    </div>
  );
}
