import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import ElectionTimeline from '../components/ElectionTimeline';

export default function TimelinePage() {
  return (
    <div className="pt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 transition mb-8">
        <ArrowLeft size={16} />
        Back to Dashboard
      </Link>
      
      <div className="panel rounded-[32px] p-8">
        <ElectionTimeline />
      </div>
    </div>
  );
}
