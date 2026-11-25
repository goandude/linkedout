import { useMemo } from 'react';
import {
  Briefcase,
  Building2,
  GraduationCap,
  Mail,
  MessageSquare,
  Search,
  ShieldAlert,
  Sparkles,
  Users,
} from 'lucide-react';
import type { LinkedInDataset } from '../types/linkedin';

export type NavTab = 'overview' | 'network' | 'messages' | 'jobs' | 'learning' | 'privacy' | 'query';

interface OverviewViewProps {
  dataset: LinkedInDataset;
  onNavigate: (tab: NavTab, preset?: { presetKey?: string; company?: string; title?: string }) => void;
}

export function OverviewView({ dataset, onNavigate }: OverviewViewProps) {
  const connections = dataset.tables.connections ?? [];
  const messages = dataset.tables.messages ?? [];
  const learning = dataset.tables.learning ?? [];
  const savedJobs = dataset.tables.saved_jobs ?? [];
  const jobApps = dataset.tables.job_applications ?? [];

  const emailsCount = useMemo(
    () => connections.filter((c) => (c['Email Address'] ?? '').trim().length > 0).length,
    [connections]
  );

  const topCompanies = useMemo(() => {
    const counts = new Map<string, number>();
    connections.forEach((c) => {
      const comp = (c.Company ?? '').trim();
      if (!comp) return;
      counts.set(comp, (counts.get(comp) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [connections]);

  const growthByYear = useMemo(() => {
    const counts = new Map<string, number>();
    connections.forEach((c) => {
      const raw = c['Connected On'] ?? '';
      const match = raw.match(/\b(19\d{2}|20\d{2})\b/);
      if (match) {
        counts.set(match[1], (counts.get(match[1]) ?? 0) + 1);
      }
    });
    return Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [connections]);

  const maxCompanyCount = topCompanies[0]?.[1] ?? 1;
  const maxYearCount = Math.max(1, ...growthByYear.map(([, v]) => v));

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <button
          type="button"
          onClick={() => onNavigate('network')}
          className="glass-card group rounded-2xl p-4 text-left transition hover:border-emerald-400"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Connections</span>
            <Users className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">{connections.length.toLocaleString()}</p>
          <p className="mt-1 text-xs text-emerald-700">{emailsCount.toLocaleString()} with visible email</p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('messages')}
          className="glass-card group rounded-2xl p-4 text-left transition hover:border-cyan-400"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Messages</span>
            <MessageSquare className="h-4 w-4 text-cyan-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">{messages.length.toLocaleString()}</p>
          <p className="mt-1 text-xs text-cyan-700">Full-text & thread search</p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('jobs')}
          className="glass-card group rounded-2xl p-4 text-left transition hover:border-indigo-400"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Jobs Tracked</span>
            <Briefcase className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
            {(savedJobs.length + jobApps.length).toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-indigo-700">
            {savedJobs.length} saved • {jobApps.length} applied
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('learning')}
          className="glass-card group rounded-2xl p-4 text-left transition hover:border-amber-400"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Learning & Articles</span>
            <GraduationCap className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
            {(learning.length + dataset.articles.length).toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-amber-700">
            {learning.length} courses • {dataset.articles.length} articles
          </p>
        </button>
      </div>

      {/* Quick-Launch Pre-Generated Queries */}
      <div className="glass-card rounded-2xl p-5">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-600" />
          <h2 className="text-sm font-semibold text-slate-900">Pre-Generated Quick Queries</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onNavigate('network', { presetKey: 'company' })}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
          >
            <Building2 className="h-3.5 w-3.5" /> Who works at Company X?
          </button>
          <button
            type="button"
            onClick={() => onNavigate('network', { presetKey: 'title' })}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-cyan-200 bg-cyan-50 px-3.5 py-2 text-xs font-medium text-cyan-700 transition hover:bg-cyan-100"
          >
            <Search className="h-3.5 w-3.5" /> People with Title (e.g. *VP*, *Director*)
          </button>
          <button
            type="button"
            onClick={() => onNavigate('network', { presetKey: 'emails' })}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100"
          >
            <Mail className="h-3.5 w-3.5" /> Connections with Emails
          </button>
          <button
            type="button"
            onClick={() => onNavigate('network', { presetKey: 'warmest' })}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-medium text-amber-700 transition hover:bg-amber-100"
          >
            <MessageSquare className="h-3.5 w-3.5" /> Warmest Connections
          </button>
          <button
            type="button"
            onClick={() => onNavigate('network', { presetKey: 'dormant' })}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Dormant Connections (12+ mo)
          </button>
          <button
            type="button"
            onClick={() => onNavigate('privacy')}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-medium text-rose-700 transition hover:bg-rose-100"
          >
            <ShieldAlert className="h-3.5 w-3.5" /> What LinkedIn Knows About Me
          </button>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top Companies */}
        <div className="glass-card rounded-2xl p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-900">Top Companies in Your Network</h3>
          {topCompanies.length === 0 ? (
            <p className="text-xs text-slate-500">No company data available.</p>
          ) : (
            <div className="space-y-2.5">
              {topCompanies.map(([company, count]) => (
                <button
                  key={company}
                  type="button"
                  onClick={() => onNavigate('network', { presetKey: 'company', company })}
                  className="group block w-full text-left"
                >
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="truncate font-medium text-slate-700 group-hover:text-emerald-700">
                      {company}
                    </span>
                    <span className="ml-2 shrink-0 text-slate-500">{count}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all group-hover:brightness-110"
                      style={{ width: `${Math.max(4, (count / maxCompanyCount) * 100)}%` }}
                    />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Network Growth */}
        <div className="glass-card rounded-2xl p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-900">Network Growth by Year</h3>
          {growthByYear.length === 0 ? (
            <p className="text-xs text-slate-500">No connection dates available.</p>
          ) : (
            <div className="flex h-52 items-end gap-2 pt-4">
              {growthByYear.map(([year, count]) => {
                const pct = Math.max(10, Math.round((count / maxYearCount) * 100));
                return (
                  <div key={year} className="group flex flex-1 flex-col items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-slate-600 opacity-0 transition group-hover:opacity-100">
                      {count}
                    </span>
                    <div className="flex h-36 w-full items-end">
                      <div
                        className="w-full rounded-t-md bg-gradient-to-t from-indigo-500 to-cyan-500 transition-all group-hover:brightness-110"
                        style={{ height: `${pct}%` }}
                        title={`${year}: ${count} connections`}
                      />
                    </div>
                    <span className="text-[10px] font-medium text-slate-500">{year.slice(-2)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Dataset Health Summary */}
      <div className="glass-card rounded-2xl p-5">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">
          Loaded Archive: <span className="text-emerald-700">{dataset.meta.fileName}</span>
        </h3>
        <div className="flex flex-wrap gap-2">
          {dataset.meta.tables.map((t) => (
            <span
              key={t.key}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100/80 px-2.5 py-1 text-xs text-slate-700"
            >
              <span>{t.label}</span>
              <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold text-cyan-700 shadow-2xs">
                {t.rowCount.toLocaleString()}
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
