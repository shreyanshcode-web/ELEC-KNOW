import { BarChart3, BookOpen, CalendarDays, LayoutDashboard, Map, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

const navItems = [
  { href: '#overview', icon: LayoutDashboard, id: 'overview', label: 'Overview' },
  { href: '#quick-actions', icon: BookOpen, id: 'quick-actions', label: 'Guides' },
  { href: '#election-timeline', icon: CalendarDays, id: 'timeline', label: 'Timeline' },
  { href: '#polling-locator', icon: Map, id: 'locator', label: 'Locator' },
  { href: '#copilot-panel', icon: BarChart3, id: 'copilot', label: 'Copilot' },
] as const;

export default function Sidebar() {
  return (
    <aside className="hidden xl:block">
      <div className="sticky top-6 h-[calc(100vh-3rem)]">
        <div className="panel flex h-full flex-col rounded-[32px] px-4 py-5">
          <div className="mb-6 flex items-center gap-3 px-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-sm font-bold tracking-[0.24em] text-white shadow-[0_16px_30px_rgba(15,23,42,0.2)]">
              EC
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                Election Copilot
              </p>
              <p className="mt-1 text-sm text-slate-700">Visual civic education</p>
            </div>
          </div>

          <nav className="flex flex-1 flex-col gap-2">
            {navItems.map((item) => (
              <motion.a
                key={item.id}
                href={item.href}
                whileHover={{ x: 4 }}
                className="group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm text-slate-600 transition-colors hover:bg-white/90 hover:text-slate-950"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/70 text-slate-700 ring-1 ring-slate-200 transition-colors group-hover:bg-slate-950 group-hover:text-white">
                  <item.icon size={18} />
                </div>
                <span className="font-medium">{item.label}</span>
              </motion.a>
            ))}
          </nav>

          <div className="mt-6 rounded-[28px] bg-slate-950 px-4 py-5 text-white shadow-[0_20px_45px_rgba(15,23,42,0.18)]">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.26em] text-white/80">
              <ShieldCheck size={14} />
              Trust layer
            </div>
            <p className="text-sm leading-6 text-white/80">
              Neutral learning flows, official-source cues, and booth lookup tools in one workspace.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
