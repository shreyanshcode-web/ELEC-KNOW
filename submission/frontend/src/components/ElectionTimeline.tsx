import { BarChart3, Calculator, CheckCheck, FileText, Megaphone, Users2 } from 'lucide-react';
import { motion } from 'motion/react';
import SectionHeader from './SectionHeader';

const stages = [
  {
    id: 'announcement',
    icon: Megaphone,
    label: 'Announcement',
    state: 'completed',
    summary: 'Authorities publish the election schedule, boundaries, and key rules for voters and parties.',
  },
  {
    id: 'nomination',
    icon: FileText,
    label: 'Nomination',
    state: 'completed',
    summary: 'Candidates submit papers, compliance checks happen, and final ballot eligibility is confirmed.',
  },
  {
    id: 'campaign',
    icon: Users2,
    label: 'Campaign',
    state: 'active',
    summary: 'Debates, manifestos, and public outreach help voters compare ideas before polling begins.',
  },
  {
    id: 'voting',
    icon: CheckCheck,
    label: 'Voting',
    state: 'upcoming',
    summary: 'Polling stations open, identity is verified, and ballots or EVM choices are cast securely.',
  },
  {
    id: 'counting',
    icon: Calculator,
    label: 'Counting',
    state: 'upcoming',
    summary: 'Votes are tabulated under observation, and official counting trends begin to form.',
  },
  {
    id: 'results',
    icon: BarChart3,
    label: 'Results',
    state: 'upcoming',
    summary: 'Final tallies are declared and interpreted with constituency-level context and turnout signals.',
  },
] as const;

const stageStyles = {
  active: 'border-primary/20 bg-white text-slate-950 shadow-[0_18px_32px_rgba(15,23,42,0.08)]',
  completed: 'border-emerald-200 bg-emerald-50/80 text-slate-900',
  upcoming: 'border-slate-200 bg-slate-50/80 text-slate-700',
} as const;

const statusLabels = {
  active: 'Current phase',
  completed: 'Completed',
  upcoming: 'Upcoming',
} as const;

export default function ElectionTimeline() {
  return (
    <section id="election-timeline" className="pt-14">
      <SectionHeader
        description="The timeline breaks the election cycle into explainable moments, so users see not just what happens, but why it matters."
        eyebrow="Step-by-step election cycle"
        title="Follow the full process from announcement to declared results."
      />

      <div className="panel mt-6 rounded-[32px] p-6 sm:p-8">
        <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          <div className="rounded-[28px] bg-slate-950 px-5 py-6 text-white shadow-[0_20px_40px_rgba(15,23,42,0.14)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/70">Currently active</p>
            <h3 className="mt-3 font-display text-3xl tracking-tight">Campaign & public outreach</h3>
            <p className="mt-4 text-sm leading-7 text-white/76">
              This is when voters compare promises, media narratives, debates, and local issues before the quiet period.
            </p>
            <div className="mt-6 rounded-2xl bg-white/10 px-4 py-4 text-sm leading-6 text-white/80">
              Tip: the copilot is strongest here for explaining manifestos, FAQs, and what to check before polling day.
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {stages.map((stage, index) => (
              <motion.article
                key={stage.id}
                animate={{ opacity: 1, y: 0 }}
                className={`relative overflow-hidden rounded-[28px] border p-5 ${stageStyles[stage.state]}`}
                initial={{ opacity: 0, y: 16 }}
                transition={{ delay: index * 0.06, duration: 0.45 }}
                whileHover={{ y: -4 }}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.55),_transparent_42%)]" />
                <div className="relative">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-950 shadow-[0_12px_24px_rgba(15,23,42,0.08)]">
                      <stage.icon size={20} />
                    </div>
                    <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-600">
                      {statusLabels[stage.state]}
                    </span>
                  </div>

                  <h4 className="mt-5 text-xl font-semibold tracking-tight">{stage.label}</h4>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{stage.summary}</p>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
