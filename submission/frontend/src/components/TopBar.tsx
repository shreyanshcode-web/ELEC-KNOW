import { ArrowUpRight, Search, ShieldCheck, Sparkles } from 'lucide-react';

const browseLinks = [
  { href: '#quick-actions', label: 'Voting guide' },
  { href: '#election-timeline', label: 'Timeline' },
  { href: '#polling-locator', label: 'Booth map' },
] as const;

export default function TopBar() {
  return (
    <header className="sticky top-0 z-40 px-4 pt-4 sm:px-6 lg:px-8 xl:px-0 xl:pt-0">
      <div className="panel rounded-[28px] px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-2">
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-950 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white xl:hidden">
              Election Copilot
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                Non-partisan learning workspace
              </p>
              <h1 className="mt-1 text-lg font-semibold tracking-tight text-slate-950">
                Learn the process, verify your booth, and ask questions with context.
              </h1>
            </div>
          </div>

          <div className="flex flex-col gap-3 xl:min-w-[520px] xl:max-w-[560px] xl:flex-1">
            <div className="relative group">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary"
                size={18}
              />
              <input
                type="text"
                placeholder="Search voter ID rules, counting phases, or constituency topics"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white/90 pl-12 pr-4 text-sm outline-none transition focus:border-primary/25 focus:ring-4 focus:ring-primary/10"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                <ShieldCheck size={14} />
                Official-source cues
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                <Sparkles size={14} />
                AI-assisted explanations
              </div>
            </div>
          </div>

          <a
            href="#copilot-panel"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(15,23,42,0.18)]"
          >
            Open copilot
            <ArrowUpRight size={16} />
          </a>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 xl:hidden">
          {browseLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-full border border-slate-200 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </header>
  );
}
