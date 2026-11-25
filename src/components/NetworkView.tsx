import { useEffect, useMemo, useState } from 'react';
import { Award, Building2, Clock, Mail, MessageSquare, Search, UserCheck, Users, X } from 'lucide-react';
import type { LinkedInDataset, RowRecord } from '../types/linkedin';
import { createPatternMatcher } from '../lib/wildcard';
import { ResponsiveDataTable } from './ResponsiveDataTable';

export type NetworkPreset =
  | 'all'
  | 'company'
  | 'title'
  | 'emails'
  | 'messaged_at_company'
  | 'warmest'
  | 'dormant'
  | 'invitations'
  | 'endorsements'
  | 'recommendations';

interface NetworkViewProps {
  dataset: LinkedInDataset;
  initialPreset?: NetworkPreset;
  initialCompany?: string;
  initialTitle?: string;
}

export function NetworkView({
  dataset,
  initialPreset = 'all',
  initialCompany = '',
  initialTitle = '',
}: NetworkViewProps) {
  const [preset, setPreset] = useState<NetworkPreset>(initialPreset);
  const [nameQuery, setNameQuery] = useState('');
  const [companyQuery, setCompanyQuery] = useState(initialCompany);
  const [titleQuery, setTitleQuery] = useState(initialTitle);
  const [emailQuery, setEmailQuery] = useState('');

  useEffect(() => {
    setPreset(initialPreset);
    if (initialCompany) setCompanyQuery(initialCompany);
    if (initialTitle) setTitleQuery(initialTitle);
  }, [initialPreset, initialCompany, initialTitle]);

  const connections = dataset.tables.connections ?? [];
  const messages = dataset.tables.messages ?? [];
  const invitations = dataset.tables.invitations ?? [];
  const endorsements = dataset.tables.endorsements_received ?? [];
  const recommendations = dataset.tables.recommendations_given ?? [];

  // Build message stats lookup by profile URL and full name
  const messageStats = useMemo(() => {
    const byUrl = new Map<string, { count: number; lastDate: string }>();
    const byName = new Map<string, { count: number; lastDate: string }>();

    const bump = (map: Map<string, { count: number; lastDate: string }>, key: string, date: string) => {
      const k = key.trim().toLowerCase();
      if (!k) return;
      const prev = map.get(k);
      if (!prev) {
        map.set(k, { count: 1, lastDate: date });
      } else {
        prev.count += 1;
        if (date > prev.lastDate) prev.lastDate = date;
      }
    };

    messages.forEach((m) => {
      const date = m.DATE ?? '';
      bump(byUrl, m['SENDER PROFILE URL'] ?? '', date);
      bump(byUrl, m['RECIPIENT PROFILE URLS'] ?? '', date);
      bump(byName, m.FROM ?? '', date);
      bump(byName, m.TO ?? '', date);
    });

    return { byUrl, byName };
  }, [messages]);

  const endorsementCounts = useMemo(() => {
    const counts = new Map<string, number>();
    endorsements.forEach((e) => {
      const url = (e['Endorser Public Url'] ?? '').trim().toLowerCase();
      const name = `${e['Endorser First Name'] ?? ''} ${e['Endorser Last Name'] ?? ''}`.trim().toLowerCase();
      if (url) counts.set(url, (counts.get(url) ?? 0) + 1);
      if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
    });
    return counts;
  }, [endorsements]);

  const getContactStats = (c: RowRecord) => {
    const url = (c.URL ?? '').trim().toLowerCase();
    const fullName = `${c['First Name'] ?? ''} ${c['Last Name'] ?? ''}`.trim().toLowerCase();
    const msg = (url && messageStats.byUrl.get(url)) || messageStats.byName.get(fullName);
    const endCount = (url && endorsementCounts.get(url)) || endorsementCounts.get(fullName) || 0;
    return {
      msgCount: msg?.count ?? 0,
      lastMessaged: msg?.lastDate ?? '',
      endorsements: endCount,
    };
  };

  const filteredData = useMemo<{ rows: RowRecord[]; columns?: string[]; title: string }>(() => {
    if (preset === 'invitations') {
      const matchName = createPatternMatcher(nameQuery);
      const rows = invitations.filter(
        (inv) => !nameQuery.trim() || matchName(`${inv.From ?? ''} ${inv.To ?? ''} ${inv.Message ?? ''}`)
      );
      return { rows, title: 'Invitations (Incoming & Outgoing)' };
    }

    if (preset === 'endorsements') {
      const matchName = createPatternMatcher(nameQuery);
      const matchTitle = createPatternMatcher(titleQuery);
      const rows = endorsements.filter((e) => {
        const person = `${e['Endorser First Name'] ?? ''} ${e['Endorser Last Name'] ?? ''}`;
        return (!nameQuery.trim() || matchName(person)) && (!titleQuery.trim() || matchTitle(e['Skill Name']));
      });
      return { rows, title: 'Endorsements Received' };
    }

    if (preset === 'recommendations') {
      return { rows: recommendations, title: 'Recommendations Given' };
    }

    const matchName = createPatternMatcher(nameQuery);
    const matchCompany = createPatternMatcher(companyQuery);
    const matchTitle = createPatternMatcher(titleQuery);
    const matchEmail = createPatternMatcher(emailQuery);

    const nowMs = Date.now();
    const oneYearMs = 365 * 24 * 60 * 60 * 1000;

    let base: RowRecord[] = connections.filter((c) => {
      const fullName = `${c['First Name'] ?? ''} ${c['Last Name'] ?? ''}`.trim();
      if (nameQuery.trim() && !matchName(fullName)) return false;
      if (companyQuery.trim() && !matchCompany(c.Company)) return false;
      if (titleQuery.trim() && !matchTitle(c.Position)) return false;
      if (emailQuery.trim() && !matchEmail(c['Email Address'])) return false;
      if (preset === 'emails' && !(c['Email Address'] ?? '').trim()) return false;
      return true;
    });

    if (preset === 'messaged_at_company' || preset === 'warmest' || preset === 'dormant') {
      const enriched = base.map((c) => {
        const stats = getContactStats(c);
        return {
          ...c,
          Messages: String(stats.msgCount),
          'Last Messaged': stats.lastMessaged ? stats.lastMessaged.slice(0, 10) : 'Never',
          Endorsements: String(stats.endorsements),
          _score: stats.msgCount + stats.endorsements * 3,
          _lastMs: stats.lastMessaged ? Date.parse(stats.lastMessaged) : 0,
        };
      });

      if (preset === 'messaged_at_company') {
        base = enriched
          .filter((r) => Number(r.Messages) > 0)
          .sort((a, b) => Number(b.Messages) - Number(a.Messages))
          .map(({ _score, _lastMs, ...rest }) => rest);
      } else if (preset === 'warmest') {
        base = enriched
          .filter((r) => r._score > 0)
          .sort((a, b) => b._score - a._score)
          .map(({ _score, _lastMs, ...rest }) => rest);
      } else if (preset === 'dormant') {
        base = enriched
          .filter((r) => r._lastMs === 0 || nowMs - r._lastMs > oneYearMs)
          .map(({ _score, _lastMs, ...rest }) => rest);
      }
    }

    return { rows: base, title: 'Connections' };
  }, [
    preset,
    connections,
    invitations,
    endorsements,
    recommendations,
    nameQuery,
    companyQuery,
    titleQuery,
    emailQuery,
    messageStats,
    endorsementCounts,
  ]);

  const clearFilters = () => {
    setNameQuery('');
    setCompanyQuery('');
    setTitleQuery('');
    setEmailQuery('');
  };

  const hasFilters = Boolean(nameQuery || companyQuery || titleQuery || emailQuery);

  const presetButtons: { key: NetworkPreset; label: string; icon: typeof Users }[] = [
    { key: 'all', label: 'All Connections', icon: Users },
    { key: 'company', label: 'At Company X', icon: Building2 },
    { key: 'title', label: 'By Title / Role', icon: Search },
    { key: 'emails', label: 'With Email ID', icon: Mail },
    { key: 'messaged_at_company', label: 'Messaged Contacts', icon: MessageSquare },
    { key: 'warmest', label: 'Warmest Connections', icon: UserCheck },
    { key: 'dormant', label: 'Dormant (12+ mo)', icon: Clock },
    { key: 'invitations', label: 'Invitations', icon: Mail },
    { key: 'endorsements', label: 'Endorsements', icon: Award },
  ];

  return (
    <div className="space-y-5">
      {/* Pre-generated query pills */}
      <div className="flex flex-wrap gap-2">
        {presetButtons.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setPreset(key)}
            className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-medium transition ${
              preset === key
                ? 'border border-emerald-300 bg-emerald-50 text-emerald-800 shadow-xs'
                : 'border border-slate-200 bg-white/80 text-slate-700 hover:border-slate-300 hover:text-slate-900'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Wildcard Filter Bar */}
      <div className="glass-card rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-600">
            Wildcards supported: <code className="font-semibold text-emerald-700">*</code> (any chars),{' '}
            <code className="font-semibold text-emerald-700">?</code> (single char),{' '}
            <code className="font-semibold text-emerald-700">&quot;exact&quot;</code>,{' '}
            <code className="font-semibold text-emerald-700">-exclude</code>,{' '}
            <code className="font-semibold text-emerald-700">/regex/</code>
          </p>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-700"
            >
              <X className="h-3.5 w-3.5" /> Clear filters
            </button>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-600">Company</label>
            <input
              type="text"
              value={companyQuery}
              onChange={(e) => setCompanyQuery(e.target.value)}
              placeholder="e.g. *Google*, Micro*"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-600">Title / Position</label>
            <input
              type="text"
              value={titleQuery}
              onChange={(e) => setTitleQuery(e.target.value)}
              placeholder="e.g. *VP*, *Engineer* -Intern"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-600">Name</label>
            <input
              type="text"
              value={nameQuery}
              onChange={(e) => setNameQuery(e.target.value)}
              placeholder="e.g. John*, *Smith"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-600">Email ID</label>
            <input
              type="text"
              value={emailQuery}
              onChange={(e) => setEmailQuery(e.target.value)}
              placeholder="e.g. *@gmail.com, *.edu"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Results Table / Cards */}
      <ResponsiveDataTable
        rows={filteredData.rows}
        exportName={`linkedout_${preset}`}
        emptyMessage="No matching network records found. Try broadening your wildcard pattern."
      />
    </div>
  );
}
