import { Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import IncidentDetail from './pages/IncidentDetail';
import Postmortem from './pages/Postmortem';

export default function App() {
  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      <header className="sticky top-0 z-50 border-b border-[var(--border-default)] bg-[var(--bg-base)]/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link
            to="/"
            className="text-[15px] font-medium tracking-tight text-[var(--text-primary)] transition-opacity hover:opacity-90"
          >
            Incident Response
          </Link>
          <nav className="flex items-center gap-1">
            <Link
              to="/"
              className="rounded-[var(--radius-sm)] px-3 py-2 text-[13px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
            >
              Dashboard
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/incidents/:id" element={<IncidentDetail />} />
          <Route path="/incidents/:id/postmortem" element={<Postmortem />} />
        </Routes>
      </main>
    </div>
  );
}
