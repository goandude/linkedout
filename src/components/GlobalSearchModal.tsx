import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Briefcase,
  GraduationCap,
  MessageSquare,
  Search,
  Users,
  X,
} from 'lucide-react';
import type { LinkedInDataset } from '../types/linkedin';
import { createPatternMatcher } from '../lib/wildcard';
import type { NavTab } from './OverviewView';

interface GlobalSearchModalProps {
  open: boolean;
  dataset: LinkedInDataset;
  onClose: () => void;
  onNavigate: (
    tab: NavTab,
    preset?: { presetKey?: string; company?: string; title?: string }
  ) => void;
}

interface SearchHit {
  id: string;
  category: 'Connections' | 'Messages' | 'Jobs' | 'Learning' | 'Articles';
  title: string;
  subtitle: string;
  tab: NavTab;
  preset?: { presetKey?: string; company?: string; title?: string };
}

export function GlobalSearchModal({
  open,
  dataset,
  onClose,
  onNavigate,
}: GlobalSearchModalProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 20);
    } else {
      setQuery('');
    }
  }, [open]);

  const results = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return { hits: [] as SearchHit[], total: 0 };

    const matcher = createPatternMatcher(trimmed);
    const hits: SearchHit[] = [];
    let total = 0;

    // 1. Connections
    const connections = dataset.tables.connections ?? [];
    let connCount = 0;
    for (let i = 0; i < connections.length; i++) {
      const c = connections[i];
      const name = `${c['First Name'] ?? ''} ${c['Last Name'] ?? ''}`.trim();
      const hay = `${name} ${c.Company ?? ''} ${c.Position ?? ''} ${c['Email Address'] ?? ''}`;
      if (matcher(hay)) {
        total++;
        if (connCount < 6) {
          connCount++;
          hits.push({
            id: `conn-${i}`,
            category: 'Connections',
            title: name || 'Unknown Connection',
            subtitle: [c.Position, c.Company, c['Email Address']].filter(Boolean).join(' • '),
            tab: 'network',
            preset: c.Company ? { presetKey: 'company', company: c.Company } : undefined,
          });
        }
      }
    }

    // 2. Messages
    const messages = dataset.tables.messages ?? [];
    let msgCount = 0;
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      const hay = `${m['CONVERSATION TITLE'] ?? ''} ${m.FROM ?? ''} ${m.TO ?? ''} ${m.SUBJECT ?? ''} ${m.CONTENT ?? ''}`;
      if (matcher(hay)) {
        total++;
        if (msgCount < 6) {
          msgCount++;
          hits.push({
            id: `msg-${i}`,
            category: 'Messages',
            title: `${m['CONVERSATION TITLE'] || m.FROM || 'Message'} (${(m.DATE ?? '').slice(0, 10)})`,
            subtitle: (m.CONTENT || m.SUBJECT || '').slice(0, 110),
            tab: 'messages',
          });
        }
      }
    }

    // 3. Jobs (Saved + Applied)
    const savedJobs = dataset.tables.saved_jobs ?? [];
    const jobApps = dataset.tables.job_applications ?? [];
    const allJobs = [
      ...savedJobs.map((j) => ({ kind: 'Saved', title: j['Job Title'] ?? '', comp: j['Company Name'] ?? '' })),
      ...jobApps.map((j) => ({ kind: 'Applied', title: j['Job Title'] ?? '', comp: j['Company Name'] ?? '' })),
    ];
    let jobCount = 0;
    for (let i = 0; i < allJobs.length; i++) {
      const j = allJobs[i];
      if (matcher(`${j.title} ${j.comp}`)) {
        total++;
        if (jobCount < 5) {
          jobCount++;
          hits.push({
            id: `job-${i}`,
            category: 'Jobs',
            title: j.title || 'Job Listing',
            subtitle: `${j.comp} • ${j.kind}`,
            tab: 'jobs',
          });
        }
      }
    }

    // 4. Learning
    const learning = dataset.tables.learning ?? [];
    let learnCount = 0;
    for (let i = 0; i < learning.length; i++) {
      const l = learning[i];
      const hay = `${l['Content Title'] ?? ''} ${l['Content Description'] ?? ''} ${l['Notes taken on videos (if taken)'] ?? ''}`;
      if (matcher(hay)) {
        total++;
        if (learnCount < 5) {
          learnCount++;
          hits.push({
            id: `learn-${i}`,
            category: 'Learning',
            title: l['Content Title'] || 'Course',
            subtitle: l['Content Type'] || 'Learning',
            tab: 'learning',
          });
        }
      }
    }

    // 5. Articles
    let artCount = 0;
    for (let i = 0; i < dataset.articles.length; i++) {
      const a = dataset.articles[i];
      if (matcher(`${a.title} ${a.textContent}`)) {
        total++;
        if (artCount < 4) {
          artCount++;
          hits.push({
            id: `art-${i}`,
            category: 'Articles',
            title: a.title,
            subtitle: a.date || a.filename,
            tab: 'learning',
          });
        }
      }
    }

    return { hits, total };
  }, [query, dataset]);

  if (!open) return null;

  const iconForCategory = (cat: SearchHit['category']) => {
    switch (cat) {
      case 'Connections':
        return <Users className="h-3.5 w-3.5 text-emerald-600" />;
      case 'Messages':
        return <MessageSquare className="h-3.5 w-3.5 text-cyan-600" />;
      case 'Jobs':
        return <Briefcase className="h-3.5 w-3.5 text-indigo-600" />;
      case 'Learning':
        return <GraduationCap className="h-3.5 w-3.5 text-amber-600" />;
      case 'Articles':
        return <BookOpen className="h-3.5 w-3.5 text-rose-600" />;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/45 p-4 pt-16 backdrop-blur-xs sm:pt-24"
      role="dialog"
      aria-modal="true"
      aria-label="Global search"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              if (e.key === 'Enter' && results.hits.length > 0) {
                const first = results.hits[0];
                onNavigate(first.tab, first.preset);
                onClose();
              }
            }}
            placeholder="Search connections, messages, jobs, learning, articles (wildcards * ? supported)..."
            className="w-full min-w-0 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd className="hidden rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 sm:inline-block">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto p-3">
          {!query.trim() ? (
            <div className="py-8 text-center text-xs text-slate-500">
              <p className="font-medium text-slate-700">Instant Cross-Dataset Search</p>
              <p className="mt-1">
                Try <code className="rounded bg-slate-100 px-1.5 py-0.5 text-emerald-700">*Google*</code>,{' '}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 text-emerald-700">*VP*</code>,{' '}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 text-emerald-700">*@gmail.com</code>, or{' '}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 text-emerald-700">referral</code>
              </p>
            </div>
          ) : results.hits.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No matches found for &ldquo;{query}&rdquo;.
            </div>
          ) : (
            <div className="space-y-1.5">
              <p className="px-2 pb-1 text-[11px] font-medium text-slate-500">
                Found <strong className="text-emerald-700">{results.total.toLocaleString()}</strong> matches across your archive
              </p>
              {results.hits.map((hit) => (
                <button
                  key={hit.id}
                  type="button"
                  onClick={() => {
                    onNavigate(hit.tab, hit.preset);
                    onClose();
                  }}
                  className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-slate-100"
                >
                  <div className="mt-0.5 shrink-0 rounded-lg border border-slate-200 bg-slate-50 p-1.5">
                    {iconForCategory(hit.category)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-semibold text-slate-900">{hit.title}</span>
                      <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                        {hit.category}
                      </span>
                    </div>
                    {hit.subtitle && (
                      <p className="mt-0.5 truncate text-[11px] text-slate-500">{hit.subtitle}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
