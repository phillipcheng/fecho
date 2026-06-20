import { NavLink, Route, Routes } from "react-router-dom";
import { SpacesPage } from "./pages/SpacesPage.tsx";
import { SpaceDetailPage } from "./pages/SpaceDetailPage.tsx";
import { PlaygroundPage } from "./pages/PlaygroundPage.tsx";

export function App() {
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span>echo</span>
        </div>
        <div className="tagline">scenario coverage</div>
        <nav className="nav">
          <NavLink to="/" end>
            Spaces
          </NavLink>
          <NavLink to="/playground">Path playground</NavLink>
        </nav>
      </aside>
      <main className="main">
        <Routes>
          <Route path="/" element={<SpacesPage />} />
          <Route path="/spaces/:spaceId" element={<SpaceDetailPage />} />
          <Route path="/playground" element={<PlaygroundPage />} />
          <Route path="*" element={<p>Not found.</p>} />
        </Routes>
      </main>
    </div>
  );
}
