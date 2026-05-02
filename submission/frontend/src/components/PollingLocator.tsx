import { Loader2, MapPin, Navigation, Search, ShieldCheck } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import IllustrationFrame from './IllustrationFrame';
import SectionHeader from './SectionHeader';

interface PollingStationData {
  acName?: string;
  ac_name?: string;
  name?: string;
  partNo?: number | string;
  part_no?: number | string;
  psName?: string;
  ps_name?: string;
  state?: string;
}

interface PollingLookupResult {
  data?: PollingStationData;
  error?: string;
  source?: string;
}

function firstDefinedValue(...values: Array<number | string | undefined>) {
  return values.find((value) => value !== undefined && `${value}`.trim().length > 0);
}

export default function PollingLocator() {
  const [epicNumber, setEpicNumber] = useState('');
  const [epicResult, setEpicResult] = useState<PollingLookupResult | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const handleEpicSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEpic = epicNumber.trim().toUpperCase();

    if (!normalizedEpic) {
      return;
    }

    setIsLocating(true);
    setEpicResult(null);

    try {
      const response = await fetch(`/api/election/polling-station/${normalizedEpic}`, {
        headers: {
          Authorization: 'Bearer mock_jwt_for_development',
        },
      });

      const data = (await response.json()) as PollingLookupResult;

      if (!response.ok) {
        throw new Error(data.error || 'Failed to locate polling station');
      }

      setEpicResult(data);
    } catch (error) {
      setEpicResult({
        error: error instanceof Error ? error.message : 'Unable to locate polling station right now.',
      });
    } finally {
      setIsLocating(false);
    }
  };

  const voterName = firstDefinedValue(epicResult?.data?.name);
  const stateName = firstDefinedValue(epicResult?.data?.state);
  const assemblyName = firstDefinedValue(epicResult?.data?.acName, epicResult?.data?.ac_name);
  const pollingStationName = firstDefinedValue(epicResult?.data?.psName, epicResult?.data?.ps_name);
  const partNumber = firstDefinedValue(epicResult?.data?.partNo, epicResult?.data?.part_no);

  return (
    <section id="polling-locator" className="pt-14">
      <SectionHeader
        description="Map-style visuals make the booth finder feel approachable while still keeping the utility grounded in search and verification."
        eyebrow="Constituency & map view"
        title="Find your polling booth before the line forms."
      />

      <div className="panel mt-6 grid overflow-hidden rounded-[32px] lg:grid-cols-[1.05fr_.95fr]">
        <div className="p-6 sm:p-8 lg:p-10">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-2 text-white">
              <MapPin size={14} />
              Locator utility
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-emerald-700">
              <ShieldCheck size={14} />
              Search, verify, navigate
            </div>
          </div>

          <h3 className="mt-6 font-display text-3xl tracking-tight text-slate-950 sm:text-4xl">
            Enter an EPIC number to reveal the right booth and constituency context.
          </h3>

          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
            The visual map gives users geographic confidence, while the result panel surfaces polling station,
            assembly details, and source labels in a tidy learning-first format.
          </p>

          <form onSubmit={handleEpicSubmit} className="mt-8 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                type="text"
                value={epicNumber}
                onChange={(event) => setEpicNumber(event.target.value)}
                placeholder="Enter EPIC number, for example ABC1234567"
                className="h-14 w-full rounded-2xl border border-slate-200 bg-white/95 pl-12 pr-4 text-sm font-medium outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/10"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLocating}
              className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-[0_18px_30px_rgba(15,23,42,0.18)] disabled:translate-y-0 disabled:opacity-60"
            >
              {isLocating ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Locating booth
                </>
              ) : (
                <>
                  Locate booth
                  <Navigation size={18} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[22px] bg-slate-50 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Lookup mode</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">EPIC-first search</p>
            </div>
            <div className="rounded-[22px] bg-slate-50 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Shows</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">Assembly + part details</p>
            </div>
            <div className="rounded-[22px] bg-slate-50 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Best for</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">Last-mile confidence</p>
            </div>
          </div>

          <div className="mt-6 rounded-[28px] border border-slate-200 bg-white/85 p-5 shadow-[0_12px_25px_rgba(15,23,42,0.05)]">
            {isLocating ? (
              <div aria-live="polite" className="space-y-3">
                <div className="skeleton-wave h-4 w-28 rounded-full" />
                <div className="skeleton-wave h-12 rounded-2xl" />
                <div className="skeleton-wave h-4 w-3/4 rounded-full" />
                <div className="skeleton-wave h-4 w-2/3 rounded-full" />
              </div>
            ) : epicResult?.error ? (
              <div className="rounded-[24px] bg-rose-50 px-4 py-4 text-sm font-medium text-rose-700">
                {epicResult.error}
              </div>
            ) : epicResult ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Verified data</p>
                    <h4 className="mt-1 text-lg font-semibold text-slate-950">
                      {pollingStationName || 'Polling station found'}
                    </h4>
                  </div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
                    {epicResult.source || 'Official'}
                  </span>
                </div>

                <dl className="grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Voter</dt>
                    <dd className="mt-2 font-semibold text-slate-950">{voterName || 'Unknown'}</dd>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">State</dt>
                    <dd className="mt-2 font-semibold text-slate-950">{stateName || 'Unknown'}</dd>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Assembly</dt>
                    <dd className="mt-2 font-semibold text-slate-950">{assemblyName || 'Unknown'}</dd>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Part number</dt>
                    <dd className="mt-2 font-semibold text-slate-950">{partNumber || 'Unknown'}</dd>
                  </div>
                </dl>
              </div>
            ) : (
              <div className="rounded-[24px] bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
                Search results will appear here with location-friendly labels and booth details.
              </div>
            )}
          </div>
        </div>

        <div className="relative min-h-[360px] border-t border-slate-200/70 lg:border-l lg:border-t-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.7),_transparent_44%),linear-gradient(180deg,rgba(15,118,110,0.06),rgba(255,255,255,0))]" />
          <IllustrationFrame
            alt="Stylized constituency map with location pins and district markers"
            className="h-full min-h-[360px] rounded-none bg-transparent shadow-none ring-0"
            imageClassName="object-cover p-6 sm:p-8"
            src="/illustrations/constituency-map.svg"
          >
            <div className="absolute left-6 top-6 rounded-2xl bg-white/92 px-4 py-3 shadow-[0_18px_36px_rgba(15,23,42,0.1)] ring-1 ring-slate-200/70">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Map cue</p>
              <p className="mt-1 text-sm font-semibold text-slate-950">Constituency boundaries + polling hints</p>
            </div>

            {epicResult && !epicResult.error ? (
              <div className="absolute bottom-6 right-6 max-w-[220px] rounded-[24px] bg-slate-950/92 px-4 py-4 text-white shadow-[0_18px_35px_rgba(15,23,42,0.2)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/70">Pinned booth</p>
                <p className="mt-2 text-sm font-semibold">{pollingStationName || 'Polling station located'}</p>
                <p className="mt-1 text-xs leading-6 text-white/70">{assemblyName || 'Assembly details available in the result panel'}</p>
              </div>
            ) : null}
          </IllustrationFrame>
        </div>
      </div>
    </section>
  );
}
