import { ArrowRight, BarChart3, BookOpen, CalendarDays, Map, Users2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import IllustrationFrame from './IllustrationFrame';
import SectionHeader from './SectionHeader';

const cards = [
  {
    accent: 'from-amber-50 to-orange-100/70',
    description: 'Learn registration, voter ID needs, booth etiquette, and what happens from queue to ballot.',
    to: '/#overview',
    icon: BookOpen,
    id: 'voting-process',
    imageSrc: '/illustrations/action-voting-process.svg',
    stat: 'Step-by-step',
    title: 'Voting Process',
  },
  {
    accent: 'from-teal-50 to-cyan-100/70',
    description: 'See the election phases from announcement through results with plain-language context.',
    to: '/timeline',
    icon: CalendarDays,
    id: 'timeline',
    imageSrc: '/illustrations/action-timeline.svg',
    stat: '6 key phases',
    title: 'Timeline',
  },
  {
    accent: 'from-rose-50 to-orange-100/70',
    description: 'Compare candidate profiles, priorities, and background signals without partisan clutter.',
    to: '/candidates',
    icon: Users2,
    id: 'candidates',
    imageSrc: '/illustrations/action-candidates.svg',
    stat: 'Profile view',
    title: 'Candidates',
  },
  {
    accent: 'from-sky-50 to-emerald-100/70',
    description: 'Find the right booth faster with map cues, constituency hints, and EPIC-based lookup.',
    to: '/#polling-locator',
    icon: Map,
    id: 'booth-finder',
    imageSrc: '/illustrations/action-booth-finder.svg',
    stat: 'Map-assisted',
    title: 'Booth Finder',
  },
  {
    accent: 'from-slate-100 to-amber-100/80',
    description: 'Understand counting patterns, result announcements, and what each number actually means.',
    to: '/#copilot-panel',
    icon: BarChart3,
    id: 'results',
    imageSrc: '/illustrations/action-results.svg',
    stat: 'Results literacy',
    title: 'Results',
  },
] as const;

// Need a custom motion wrapper for Link to make framer-motion work with react-router
const MotionLink = motion(Link);

export default function QuickAccessCards() {
  return (
    <section id="quick-actions" className="pt-14">
      <SectionHeader
        description="Each shortcut pairs a mini illustration with a focused learning task, so the interface teaches as you move through it."
        eyebrow="Guided shortcuts"
        title="Start from the exact election concept you need."
      />

      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        {cards.map((card, index) => (
          <MotionLink
            key={card.id}
            to={card.to}
            aria-label={`Open ${card.title} section`}
            animate={{ opacity: 1, y: 0 }}
            className="panel group flex h-full flex-col rounded-[28px] p-5"
            initial={{ opacity: 0, y: 16 }}
            transition={{ delay: index * 0.06, duration: 0.45 }}
            whileHover={{ y: -6 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-[0_14px_28px_rgba(15,23,42,0.14)]">
                <card.icon size={20} />
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-600">
                {card.stat}
              </span>
            </div>

            <IllustrationFrame
              alt={`${card.title} illustration`}
              className={`mt-5 h-40 rounded-[24px] bg-gradient-to-br ${card.accent}`}
              imageClassName="object-cover p-3 transition duration-500 group-hover:scale-[1.04]"
              src={card.imageSrc}
            />

            <div className="mt-5 flex flex-1 flex-col">
              <h3 className="text-xl font-semibold tracking-tight text-slate-950">{card.title}</h3>
              <p className="mt-3 flex-1 text-sm leading-7 text-slate-600">{card.description}</p>
              <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                Open section
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </MotionLink>
        ))}
      </div>
    </section>
  );
}
