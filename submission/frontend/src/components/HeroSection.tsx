import { ArrowRight, BadgeCheck, BrainCircuit, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import IllustrationFrame from './IllustrationFrame';

const proofStats = [
  { id: 'topics', label: 'Learning topics', value: '22+' },
  { id: 'sources', label: 'Source-aware explainers', value: 'Official' },
  { id: 'tools', label: 'Interactive tools', value: 'AI + Maps' },
] as const;

const trustSignals = [
  { id: 'neutral', icon: ShieldCheck, label: 'Neutral tone by design' },
  { id: 'guided', icon: BrainCircuit, label: 'Guided AI explanations' },
  { id: 'verified', icon: BadgeCheck, label: 'Booth lookup utilities' },
] as const;

export default function HeroSection() {
  return (
    <section id="overview" className="pt-6 xl:pt-8">
      <div className="panel relative overflow-hidden rounded-[36px] px-6 py-7 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(212,122,58,0.14),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(15,118,110,0.12),_transparent_34%)]" />
        <div className="relative grid items-center gap-8 lg:grid-cols-[1.05fr_.95fr] lg:gap-10">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="order-2 lg:order-1"
            initial={{ opacity: 0, y: 18 }}
            transition={{ duration: 0.65 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-700 shadow-[0_8px_20px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70">
              Premium civic assistant
            </div>

            <h2 className="mt-5 max-w-2xl font-display text-4xl leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-[3.8rem]">
              Understand every election step with visual, calm guidance.
            </h2>

            <p className="mt-5 max-w-xl text-base leading-8 text-slate-600 sm:text-lg">
              This interface turns complex voting information into clear learning paths, source-aware answers,
              booth discovery, and easy-to-read election timelines for first-time voters and returning citizens alike.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#quick-actions"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-[0_18px_32px_rgba(15,23,42,0.18)]"
              >
                Start with the voting process
                <ArrowRight size={16} />
              </a>
              <a
                href="#copilot-panel"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white/85 px-5 py-3.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
              >
                Ask the AI guide
              </a>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {proofStats.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[24px] bg-white/85 px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                    {item.label}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              {trustSignals.map((signal) => (
                <div
                  key={signal.id}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/80 px-3 py-2 text-sm text-slate-700"
                >
                  <signal.icon size={16} className="text-primary" />
                  {signal.label}
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="order-1 lg:order-2"
            initial={{ opacity: 0, y: 18 }}
            transition={{ delay: 0.1, duration: 0.65 }}
          >
            <IllustrationFrame
              alt="Illustration of citizens participating in voting with a ballot box and civic data cards"
              className="group h-[320px] rounded-[32px] bg-white/60 shadow-[0_24px_50px_rgba(15,23,42,0.12)] ring-1 ring-white/70 sm:h-[380px] lg:h-[460px]"
              imageClassName="object-contain p-5 sm:p-7"
              priority
              src="/illustrations/hero-civic.svg"
            >
              <div className="pointer-events-none absolute inset-0 rounded-[32px] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.65),_transparent_42%)]" />
              <div className="absolute left-5 top-5 rounded-2xl bg-white/88 px-4 py-3 shadow-[0_14px_28px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70 transition duration-500 group-hover:-translate-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Learning path</p>
                <p className="mt-1 text-sm font-semibold text-slate-950">From voter basics to results interpretation</p>
              </div>
              <div className="absolute bottom-5 right-5 rounded-2xl bg-slate-950/92 px-4 py-3 text-white shadow-[0_18px_36px_rgba(15,23,42,0.16)] transition duration-500 group-hover:translate-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/70">Booth ready</p>
                <p className="mt-1 text-sm font-semibold">Map cues and EPIC search built in</p>
              </div>
            </IllustrationFrame>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
