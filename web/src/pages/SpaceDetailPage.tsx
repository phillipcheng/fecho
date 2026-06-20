import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client.ts";
import { useAsync } from "../hooks.ts";
import { TemplatesTab } from "../components/TemplatesTab.tsx";
import { ScenesTab } from "../components/ScenesTab.tsx";
import { TrafficTab } from "../components/TrafficTab.tsx";
import { ReportTab } from "../components/ReportTab.tsx";

type Tab = "templates" | "scenes" | "traffic" | "report";

export function SpaceDetailPage() {
  const { spaceId = "" } = useParams();
  const [tab, setTab] = useState<Tab>("templates");

  const space = useAsync(() => api.getSpace(spaceId), [spaceId]);
  const templates = useAsync(() => api.listTemplates(spaceId), [spaceId]);
  const scenes = useAsync(() => api.listScenes(spaceId), [spaceId]);

  const reloadAll = () => {
    templates.reload();
    scenes.reload();
  };

  return (
    <>
      <div className="muted" style={{ marginBottom: 8 }}>
        <Link to="/">← Spaces</Link>
      </div>
      <h1>{space.data?.name ?? "Space"}</h1>
      <p className="subtitle">
        {space.data?.businessLine ? `${space.data.businessLine} · ` : ""}
        {templates.data?.length ?? 0} templates · {scenes.data?.length ?? 0} scenes
      </p>

      <div className="tabs">
        <button className={tab === "templates" ? "active" : ""} onClick={() => setTab("templates")}>
          Templates
        </button>
        <button className={tab === "scenes" ? "active" : ""} onClick={() => setTab("scenes")}>
          Scenes
        </button>
        <button className={tab === "traffic" ? "active" : ""} onClick={() => setTab("traffic")}>
          Traffic
        </button>
        <button className={tab === "report" ? "active" : ""} onClick={() => setTab("report")}>
          Coverage report
        </button>
      </div>

      {tab === "templates" && (
        <TemplatesTab
          spaceId={spaceId}
          templates={templates.data ?? []}
          loading={templates.loading}
          reload={() => templates.reload()}
        />
      )}
      {tab === "scenes" && (
        <ScenesTab
          spaceId={spaceId}
          templates={templates.data ?? []}
          scenes={scenes.data ?? []}
          loading={scenes.loading}
          reload={() => scenes.reload()}
        />
      )}
      {tab === "traffic" && <TrafficTab />}
      {tab === "report" && <ReportTab spaceId={spaceId} onChanged={reloadAll} />}
    </>
  );
}
