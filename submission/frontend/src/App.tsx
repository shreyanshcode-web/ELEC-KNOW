import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import CopilotPanel from './components/CopilotPanel';
import Home from './pages/Home';
import Candidates from './pages/Candidates';
import TimelinePage from './pages/TimelinePage';

export default function App() {
  return (
    <div className="min-h-screen overflow-x-clip bg-canvas text-slate-900 selection:bg-primary/15 selection:text-slate-950">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(212,122,58,0.14),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(15,118,110,0.12),_transparent_28%)]" />
      <div className="soft-grid pointer-events-none fixed inset-0 opacity-50" />

      <div className="relative mx-auto max-w-[1680px] xl:grid xl:grid-cols-[280px_minmax(0,1fr)_380px] xl:gap-6 xl:px-6 xl:py-6">
        {/* Navigation */}
        <Sidebar />

        {/* Main Content Area */}
        <div className="min-w-0">
          <TopBar />

          <main className="px-4 pb-16 sm:px-6 lg:px-8 xl:px-0 xl:pb-20">
            <div className="mx-auto max-w-[1180px]">
              
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/candidates" element={<Candidates />} />
                <Route path="/timeline" element={<TimelinePage />} />
              </Routes>

              <footer className="mt-16 border-t border-slate-200/70 pt-8 text-sm text-slate-600 sm:mt-20 sm:pt-10">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-medium text-slate-700">&copy; 2026 Election Copilot Platform. Calm, visual civic education for every voter.</p>
                  <p className="text-slate-500">Designed for clarity, neutrality, and faster understanding.</p>
                </div>
              </footer>
            </div>
          </main>
        </div>

        {/* AI Panel */}
        <CopilotPanel />
      </div>
    </div>
  );
}
