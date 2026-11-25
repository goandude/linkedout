import { useMemo, useState } from 'react';
import { BookOpen, Briefcase, Building2, FileText, GraduationCap, Search } from 'lucide-react';
import type { ArticleRecord, LinkedInDataset } from '../types/linkedin';
import { createPatternMatcher } from '../lib/wildcard';
import { ResponsiveDataTable } from './ResponsiveDataTable';

export function JobsView({ dataset }: { dataset: LinkedInDataset }) {
  const [subTab, setSubTab] = useState<'saved' | 'applied' | 'network_overlap' | 'qa' | 'timeline'>('saved');

  const savedJobs = dataset.tables.saved_jobs ?? [];
  const jobApps = dataset.tables.job_applications ?? [];
  const connections = dataset.tables.connections ?? [];
  const savedAnswers = dataset.tables.saved_answers ?? [];
  const screening = dataset.tables.screening_responses ?? [];
  const positions = dataset.tables.positions ?? [];
  const education = dataset.tables.education ?? [];
  const certifications = dataset.tables.certifications ?? [];

  const companyOverlap = useMemo(() => {
    const connByCompany = new Map<string, number>();
    connections.forEach((c) => {
      const comp = (c.Company ?? '').trim().toLowerCase();
      if (comp) connByCompany.set(comp, (connByCompany.get(comp) ?? 0) + 1);
    });

    const allTargetJobs = [
      ...savedJobs.map((j) => ({ Status: 'Saved', Company: j['Company Name'] ?? '', Title: j['Job Title'] ?? '', Date: j['Saved Date'] ?? '' })),
      ...jobApps.map((j) => ({ Status: 'Applied', Company: j['Company Name'] ?? '', Title: j['Job Title'] ?? '', Date: j['Application Date'] ?? '' })),
    ];

    return allTargetJobs.map((j) => ({
      ...j,
      'Network Connections': String(connByCompany.get(j.Company.trim().toLowerCase()) ?? 0),
    }));
  }, [savedJobs, jobApps, connections]);

  const qaRows = useMemo(() => [...savedAnswers, ...screening], [savedAnswers, screening]);

  const timelineRows = useMemo(
    () => [
      ...positions.map((p) => ({
        Type: 'Position',
        Organization: p['Company Name'] ?? '',
        Title: p.Title ?? '',
        Start: p['Started On'] ?? '',
        End: p['Finished On'] || 'Present',
      })),
      ...education.map((e) => ({
        Type: 'Education',
        Organization: e['School Name'] ?? '',
        Title: e['Degree Name'] ?? '',
        Start: e['Start Date'] ?? '',
        End: e['End Date'] ?? '',
      })),
      ...certifications.map((c) => ({
        Type: 'Certification',
        Organization: c.Authority ?? '',
        Title: c.Name ?? '',
        Start: c['Started On'] ?? '',
        End: c['Finished On'] ?? '',
      })),
    ],
    [positions, education, certifications]
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'saved', label: `Saved Jobs (${savedJobs.length})`, icon: Briefcase },
          { key: 'applied', label: `Applications (${jobApps.length})`, icon: FileText },
          { key: 'network_overlap', label: 'Connections at Target Companies', icon: Building2 },
          { key: 'qa', label: `Saved Q&A (${qaRows.length})`, icon: Search },
          { key: 'timeline', label: `Career Timeline (${timelineRows.length})`, icon: GraduationCap },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setSubTab(key as typeof subTab)}
            className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-medium transition ${
              subTab === key
                ? 'border border-indigo-300 bg-indigo-50 text-indigo-800 shadow-xs'
                : 'border border-slate-200 bg-white/80 text-slate-700 hover:border-slate-300'
            }`}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      {subTab === 'saved' && <ResponsiveDataTable rows={savedJobs} exportName="linkedout_saved_jobs" />}
      {subTab === 'applied' && <ResponsiveDataTable rows={jobApps} exportName="linkedout_job_applications" />}
      {subTab === 'network_overlap' && (
        <ResponsiveDataTable rows={companyOverlap} exportName="linkedout_target_company_overlap" />
      )}
      {subTab === 'qa' && <ResponsiveDataTable rows={qaRows} exportName="linkedout_saved_qa" />}
      {subTab === 'timeline' && <ResponsiveDataTable rows={timelineRows} exportName="linkedout_career_timeline" />}
    </div>
  );
}

export function LearningView({ dataset }: { dataset: LinkedInDataset }) {
  const [tab, setTab] = useState<'courses' | 'articles'>('courses');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'in_progress' | 'saved'>('all');
  const [activeArticle, setActiveArticle] = useState<ArticleRecord | null>(null);

  const learning = dataset.tables.learning ?? [];
  const articles = dataset.articles ?? [];

  const filteredCourses = useMemo(() => {
    const matcher = createPatternMatcher(search);
    return learning.filter((row) => {
      const completed = (row['Content Completed At (if completed)'] ?? '').trim();
      const saved = (row['Content Saved'] ?? '').toLowerCase() === 'true';
      if (statusFilter === 'completed' && !completed) return false;
      if (statusFilter === 'in_progress' && completed) return false;
      if (statusFilter === 'saved' && !saved) return false;

      if (search.trim()) {
        const hay = `${row['Content Title'] ?? ''} ${row['Content Description'] ?? ''} ${row['Notes taken on videos (if taken)'] ?? ''}`;
        if (!matcher(hay)) return false;
      }
      return true;
    });
  }, [learning, search, statusFilter]);

  const filteredArticles = useMemo(() => {
    const matcher = createPatternMatcher(search);
    return articles.filter((a) => !search.trim() || matcher(`${a.title} ${a.textContent}`));
  }, [articles, search]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setTab('courses')}
          className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-medium transition ${
            tab === 'courses'
              ? 'border border-amber-300 bg-amber-50 text-amber-800 shadow-xs'
              : 'border border-slate-200 bg-white/80 text-slate-700'
          }`}
        >
          <GraduationCap className="h-3.5 w-3.5" /> LinkedIn Learning ({learning.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('articles')}
          className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-medium transition ${
            tab === 'articles'
              ? 'border border-emerald-300 bg-emerald-50 text-emerald-800 shadow-xs'
              : 'border border-slate-200 bg-white/80 text-slate-700'
          }`}
        >
          <BookOpen className="h-3.5 w-3.5" /> Published Articles ({articles.length})
        </button>
      </div>

      {/* Search */}
      <div className="glass-card flex flex-col gap-3 rounded-2xl p-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Wildcard search across titles, descriptions, notes, or article text..."
            className="w-full rounded-xl border border-slate-300 bg-white py-2 pr-3 pl-9 text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none"
          />
        </div>

        {tab === 'courses' && (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 focus:border-amber-500 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="in_progress">In Progress</option>
            <option value="saved">Saved</option>
          </select>
        )}
      </div>

      {tab === 'courses' ? (
        <ResponsiveDataTable rows={filteredCourses} exportName="linkedout_learning" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="space-y-3 lg:col-span-5">
            {filteredArticles.length === 0 ? (
              <div className="glass-card rounded-2xl p-6 text-center text-xs text-slate-500">
                No articles found.
              </div>
            ) : (
              filteredArticles.map((art) => (
                <button
                  key={art.filename}
                  type="button"
                  onClick={() => setActiveArticle(art)}
                  className={`glass-card w-full rounded-2xl p-4 text-left transition ${
                    activeArticle?.filename === art.filename
                      ? 'border-emerald-400 bg-emerald-50/80'
                      : 'hover:border-slate-300'
                  }`}
                >
                  <p className="text-xs font-semibold text-slate-900">{art.title}</p>
                  <p className="mt-1 text-[11px] font-medium text-emerald-700">{art.date || art.filename}</p>
                  <p className="mt-2 line-clamp-2 text-xs text-slate-600">{art.textContent}</p>
                </button>
              ))
            )}
          </div>

          <div className="glass-card rounded-2xl p-6 lg:col-span-7">
            {activeArticle ? (
              <article className="prose prose-slate prose-sm max-w-none">
                <h2 className="text-lg font-bold text-slate-900">{activeArticle.title}</h2>
                <p className="mb-4 text-xs text-slate-500">{activeArticle.date}</p>
                <div
                  className="space-y-3 text-xs leading-relaxed text-slate-700"
                  dangerouslySetInnerHTML={{ __html: activeArticle.htmlBody }}
                />
              </article>
            ) : (
              <p className="text-center text-xs text-slate-500">Select an article to read it offline.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
