import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Candidates() {
  return (
    <div className="pt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 transition mb-8">
        <ArrowLeft size={16} />
        Back to Dashboard
      </Link>
      
      <div className="panel rounded-[32px] p-8">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white">
            Profile View
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 font-display">
            Candidate Directory
          </h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            Compare candidate profiles, priorities, and background signals without partisan clutter. Understand exactly who is running in your constituency.
          </p>
        </div>

        <div className="mt-12 text-center py-20 border border-dashed border-slate-300 rounded-2xl bg-white/50">
          <p className="text-slate-500 font-medium">Candidate data is syncing with the Election Commission database...</p>
        </div>
      </div>
    </div>
  );
}
