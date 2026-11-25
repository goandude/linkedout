import { useEffect, useRef, useState } from 'react';
import {
  Briefcase,
  Database,
  Download,
  ExternalLink,
  GitMerge,
  Github,
  GraduationCap,
  LayoutDashboard,
  Menu,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Upload,
  Users,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import type { LinkedInDataset, SavedQuery } from './types/linkedin';
import { parseLinkedInZip } from './lib/linkedinParser';
import { mergeLinkedInDatasets, type MergeSummary } from './lib/mergeDataset';
import {
  clearAllLocalData,
  getSessionOnlyMode,
  loadDatasetFromIndexedDB,
  loadSavedQueries,
  persistSavedQueries,
  saveDatasetToIndexedDB,
  setSessionOnlyMode,
} from './lib/storage';
import { createSyntheticDemoDataset } from './lib/demoData';
import { AnimatedBackground } from './components/AnimatedBackground';
import { Logo } from './components/Logo';
import { UploadLanding } from './components/UploadLanding';
import { OverviewView, type NavTab } from './components/OverviewView';
import { NetworkView, type NetworkPreset } from './components/NetworkView';
import { MessagesView } from './components/MessagesView';
import { JobsView, LearningView } from './components/JobsLearningView';
import { PrivacyAuditView } from './components/PrivacyAuditView';
import { QueryBuilderView } from './components/QueryBuilderView';
import { GlobalSearchModal } from './components/GlobalSearchModal';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const NAV_ITEMS: { key: NavTab; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'network', label: 'Network & People', icon: Users },
  { key: 'messages', label: 'Messages', icon: MessageSquare },
  { key: 'jobs', label: 'Jobs & Career', icon: Briefcase },
  { key: 'learning', label: 'Learning & Articles', icon: GraduationCap },
  { key: 'privacy', label: 'Ad & Privacy Audit', icon: ShieldAlert },
  { key: 'query', label: 'Power Query Builder', icon: SlidersHorizontal },
];

export function App() {
  const [dataset, setDataset] = useState<LinkedInDataset | null>(null);
  const [pendingImport, setPendingImport] = useState<{
    incoming: LinkedInDataset;
    mergePreview: MergeSummary;
  } | null>(null);
  const [mergeBanner, setMergeBanner] = useState<string | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [sessionOnly, setSessionOnly] = useState(() => getSessionOnlyMode());
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>(() => loadSavedQueries());
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [networkPreset, setNetworkPreset] = useState<{
    presetKey?: NetworkPreset;
    company?: string;
    title?: string;
  }>({});
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  // Hydrate from IndexedDB on mount
  useEffect(() => {
    let active = true;
    loadDatasetFromIndexedDB().then((saved) => {
      if (active && saved) {
        setDataset(saved);
      }
      if (active) setIsHydrating(false);
    });
    return () => {
      active = false;
    };
  }, []);

  // Online/offline + PWA install prompt listeners
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const handleToggleSessionOnly = (val: boolean) => {
    setSessionOnly(val);
    setSessionOnlyMode(val);
  };

  const handleFileSelected = async (file: File) => {
    setError(null);
    setMergeBanner(null);
    setIsParsing(true);
    setProgress(0);
    setProgressLabel('Starting...');
    try {
      const parsed = await parseLinkedInZip(file, (pct, lbl) => {
        setProgress(pct);
        setProgressLabel(lbl);
      });

      if (dataset) {
        // Show confirmation popup for Merge vs Replace instead of jumping away
        const mergePreview = mergeLinkedInDatasets(dataset, parsed);
        setPendingImport({ incoming: parsed, mergePreview });
      } else {
        if (!sessionOnly) {
          await saveDatasetToIndexedDB(parsed);
        }
        setDataset(parsed);
        setActiveTab('overview');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse LinkedIn zip archive.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirmPendingImport = async (mode: 'merge' | 'replace') => {
    if (!pendingImport) return;
    const finalDataset =
      mode === 'merge' ? pendingImport.mergePreview.merged : pendingImport.incoming;

    if (!sessionOnly) {
      await saveDatasetToIndexedDB(finalDataset);
    }

    if (mode === 'merge') {
      const { addedRows, newTables, addedArticles } = pendingImport.mergePreview;
      setMergeBanner(
        `Merged ${pendingImport.incoming.meta.fileName}: +${addedRows.toLocaleString()} new rows, +${newTables} new tables, +${addedArticles} new articles.`
      );
    } else {
      setMergeBanner(`Replaced dataset with ${pendingImport.incoming.meta.fileName}.`);
    }

    setDataset(finalDataset);
    setPendingImport(null);
    setActiveTab('overview');
  };

  const handleLoadDemo = async () => {
    const demo = createSyntheticDemoDataset();
    if (!sessionOnly) {
      await saveDatasetToIndexedDB(demo);
    }
    setDataset(demo);
    setPendingImport(null);
    setMergeBanner(null);
    setActiveTab('overview');
  };

  const handleClearData = async () => {
    await clearAllLocalData();
    setDataset(null);
    setPendingImport(null);
    setMergeBanner(null);
    setSavedQueries([]);
    setNetworkPreset({});
    setActiveTab('overview');
  };

  const handleNavigate = (
    tab: NavTab,
    preset?: { presetKey?: string; company?: string; title?: string }
  ) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
    if (tab === 'network' && preset) {
      setNetworkPreset({
        presetKey: (preset.presetKey as NetworkPreset) ?? 'all',
        company: preset.company ?? '',
        title: preset.title ?? '',
      });
    }
  };

  const handleSaveQuery = (q: SavedQuery) => {
    const next = [q, ...savedQueries];
    setSavedQueries(next);
    persistSavedQueries(next);
  };

  const handleDeleteQuery = (id: string) => {
    const next = savedQueries.filter((q) => q.id !== id);
    setSavedQueries(next);
    persistSavedQueries(next);
  };

  const handleInstallPwa = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  if (isHydrating) {
    return (
      <div className="relative flex min-h-screen items-center justify-center">
        <AnimatedBackground />
        <div className="flex flex-col items-center gap-3">
          <Logo size={48} showWordmark={false} />
          <p className="text-xs text-slate-500">Loading local storage...</p>
        </div>
      </div>
    );
  }

  if (!dataset) {
    return (
      <div className="relative min-h-screen">
        <AnimatedBackground />
        <UploadLanding
          isParsing={isParsing}
          progress={progress}
          progressLabel={progressLabel}
          error={error}
          sessionOnly={sessionOnly}
          importMode="merge"
          onChangeImportMode={() => {}}
          onToggleSessionOnly={handleToggleSessionOnly}
          onFileSelected={handleFileSelected}
          onLoadDemo={handleLoadDemo}
        />
      </div>
    );
  }

  const connectionsCount = dataset.tables.connections?.length ?? 0;

  return (
    <div className="relative flex min-h-screen flex-col lg:flex-row">
      <AnimatedBackground />

      {/* Hidden file input for direct Merge / Import .zip */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".zip,application/zip"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) handleFileSelected(file);
        }}
      />

      {/* Desktop Sidebar */}
      <aside className="glass-panel hidden w-64 shrink-0 flex-col gap-5 border-r border-[#EAE6D7] p-4 lg:flex">
        <div className="px-2 pt-1">
          <Logo size={32} />
        </div>

        <nav className="space-y-1">
          {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
            const active = activeTab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleNavigate(key)}
                className={`flex w-full items-center gap-3 rounded-full px-3.5 py-2.5 text-xs font-medium transition ${
                  active
                    ? 'bg-[#00674F] text-[#FFFAEB] shadow-xs'
                    : 'text-[#1B1C15]/75 hover:bg-[#F4EDD9]/70 hover:text-[#1B1C15]'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        {/* File Upload & Local Storage Settings right below menu options */}
        <div className="space-y-2.5 border-t border-[#EAE6D7] pt-4">
          <p className="px-1 text-[10px] font-semibold uppercase tracking-wider text-[#1B1C15]/45">
            Data &amp; Local Storage
          </p>

          <button
            type="button"
            disabled={isParsing}
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#1B1C15] px-3 py-2 text-xs font-medium text-[#FFFAEB] shadow-xs transition hover:bg-[#2d2f24] disabled:opacity-50"
          >
            <Upload className="h-3.5 w-3.5" />
            {isParsing ? `Parsing ${progress}%...` : 'Merge / Import .zip'}
          </button>

          <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-[#EAE6D7] bg-[#FBFBF8] p-2.5 text-[11px] text-[#1B1C15]/80">
            <input
              type="checkbox"
              checked={sessionOnly}
              onChange={(e) => handleToggleSessionOnly(e.target.checked)}
              className="mt-0.5 h-3.5 w-3.5 rounded border-[#EAE6D7] text-[#00674F] focus:ring-[#00674F]"
            />
            <span>
              <strong className="block text-[#1B1C15]">Session-Only Mode</strong>
              <span className="text-[10px] text-[#1B1C15]/55">Skip IndexedDB persistence</span>
            </span>
          </label>

          <div className="rounded-xl border border-[#00674F]/20 bg-[#00674F]/8 p-2.5 text-[11px] text-[#00674F]">
            <div className="flex items-center gap-1.5 font-semibold">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#00674F]" />
              Local-Only Mode
            </div>
            <p className="mt-0.5 text-[10px] text-[#00674F]/80">
              {sessionOnly ? 'Memory only' : 'Stored in browser IndexedDB'} • 0 bytes uploaded
            </p>
          </div>

          {installPrompt && (
            <button
              type="button"
              onClick={handleInstallPwa}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-[#00674F]/30 bg-[#00674F]/10 px-3 py-2 text-xs font-medium text-[#00674F] hover:bg-[#00674F]/15"
            >
              <Download className="h-3.5 w-3.5" /> Install Offline App
            </button>
          )}

          <button
            type="button"
            onClick={handleClearData}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-[#C41E3A]/25 bg-[#C41E3A]/8 px-3 py-2 text-xs font-medium text-[#C41E3A] hover:bg-[#C41E3A]/12"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear Local Data
          </button>

          <a
            href="https://www.linkedin.com/mypreferences/d/download-my-data"
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-full border border-[#EAE6D7] bg-[#FBFBF8] px-3 py-2 text-xs font-medium text-[#1B1C15] shadow-2xs transition hover:bg-[#F4EDD9]"
          >
            <Download className="h-3.5 w-3.5 text-[#00674F]" />
            <span>Request LinkedIn Data</span>
            <ExternalLink className="h-3 w-3 text-[#1B1C15]/45" />
          </a>

          <a
            href="https://github.com/goandude/linkedout"
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-full border border-[#EAE6D7] bg-[#FBFBF8] px-3 py-2 text-xs font-medium text-[#1B1C15] shadow-2xs transition hover:bg-[#F4EDD9]"
          >
            <Github className="h-3.5 w-3.5" />
            <span>GitHub Repo</span>
            <ExternalLink className="h-3 w-3 text-[#1B1C15]/45" />
          </a>
        </div>
      </aside>

      {/* Mobile / Tablet Header */}
      <header className="glass-panel sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/80 px-4 py-3 lg:hidden">
        <Logo size={28} />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-2xs"
            aria-label="Global search"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Search</span>
          </button>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium ${
              isOnline ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}
          >
            {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {isOnline ? 'Local' : 'Offline'}
          </span>
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-700 shadow-2xs"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-x-0 top-[57px] z-20 border-b border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur-xl lg:hidden">
          <nav className="grid gap-1.5">
            {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => handleNavigate(key)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium ${
                  activeTab === key ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'text-slate-700'
                }`}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </nav>
          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200 pt-3">
            {installPrompt && (
              <button
                type="button"
                onClick={handleInstallPwa}
                className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-300 bg-cyan-50 px-3 py-2 text-xs text-cyan-800"
              >
                <Download className="h-3.5 w-3.5" /> Install App
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                fileInputRef.current?.click();
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800"
            >
              <Upload className="h-3.5 w-3.5" /> Merge / Import .zip
            </button>
            <button
              type="button"
              onClick={handleClearData}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700"
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear Data
            </button>
            <a
              href="https://www.linkedin.com/mypreferences/d/download-my-data"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs text-cyan-800"
            >
              <Download className="h-3.5 w-3.5" /> Request Data
            </a>
            <a
              href="https://github.com/goandude/linkedout"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
            >
              <Github className="h-3.5 w-3.5" /> GitHub
            </a>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="min-w-0 flex-1 px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:pb-8">
        {/* Top Context Bar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-editorial text-2xl font-normal text-[#1B1C15] sm:text-3xl">
              {NAV_ITEMS.find((i) => i.key === activeTab)?.label}
            </h1>
            <p className="text-xs text-[#1B1C15]/60">
              {connectionsCount.toLocaleString()} connections • {dataset.meta.totalRows.toLocaleString()} total rows across{' '}
              {dataset.meta.tableCount} tables
            </p>
          </div>

          <div className="hidden items-center gap-2.5 lg:flex">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-3 py-1.5 text-xs text-slate-600 shadow-2xs transition hover:border-emerald-300 hover:text-slate-900"
            >
              <Search className="h-3.5 w-3.5 text-slate-400" />
              <span>Quick Search...</span>
              <kbd className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                Ctrl+K
              </kbd>
            </button>

            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
                isOnline
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-amber-200 bg-amber-50 text-amber-700'
              }`}
            >
              {isOnline ? <Database className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
              {isOnline ? 'Local Storage Active' : 'Offline Mode Active'}
            </span>
          </div>
        </div>

        {mergeBanner && (
          <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800">
            <span>{mergeBanner}</span>
            <button
              type="button"
              onClick={() => setMergeBanner(null)}
              className="rounded-md p-1 text-emerald-700 hover:bg-emerald-100"
              aria-label="Dismiss merge notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {activeTab === 'overview' && <OverviewView dataset={dataset} onNavigate={handleNavigate} />}
        {activeTab === 'network' && (
          <NetworkView
            dataset={dataset}
            initialPreset={networkPreset.presetKey}
            initialCompany={networkPreset.company}
            initialTitle={networkPreset.title}
          />
        )}
        {activeTab === 'messages' && <MessagesView dataset={dataset} />}
        {activeTab === 'jobs' && <JobsView dataset={dataset} />}
        {activeTab === 'learning' && <LearningView dataset={dataset} />}
        {activeTab === 'privacy' && <PrivacyAuditView dataset={dataset} />}
        {activeTab === 'query' && (
          <QueryBuilderView
            dataset={dataset}
            savedQueries={savedQueries}
            onSaveQuery={handleSaveQuery}
            onDeleteQuery={handleDeleteQuery}
          />
        )}
      </main>

      {/* Mobile Bottom Quick-Nav */}
      <nav className="glass-panel fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-slate-200/80 px-1 py-1.5 lg:hidden">
        {NAV_ITEMS.slice(0, 5).map(({ key, label, icon: Icon }) => {
          const active = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => handleNavigate(key)}
              className={`flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] font-medium ${
                active ? 'text-emerald-700 font-semibold' : 'text-slate-500'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="truncate max-w-[64px]">{label.split(' ')[0]}</span>
            </button>
          );
        })}
      </nav>

      {/* Global Ctrl+K Search Modal */}
      <GlobalSearchModal
        open={searchOpen}
        dataset={dataset}
        onClose={() => setSearchOpen(false)}
        onNavigate={handleNavigate}
      />

      {/* Merge vs Replace Confirmation Modal */}
      {pendingImport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="merge-modal-title"
        >
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="merge-modal-title" className="text-base font-bold text-slate-900">
                  Import Archive: {pendingImport.incoming.meta.fileName}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Parsed {(pendingImport.incoming.tables.connections?.length ?? 0).toLocaleString()} connections and{' '}
                  {pendingImport.incoming.meta.totalRows.toLocaleString()} total rows across{' '}
                  {pendingImport.incoming.meta.tableCount} tables.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPendingImport(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 text-xs text-emerald-900">
              <p className="font-semibold">Delta Preview (if Merged):</p>
              <p className="mt-1 text-emerald-800">
                <strong>+{pendingImport.mergePreview.addedRows.toLocaleString()}</strong> new rows,{' '}
                <strong>+{pendingImport.mergePreview.newTables}</strong> new tables,{' '}
                <strong>+{pendingImport.mergePreview.addedArticles}</strong> new articles{' '}
                <span className="text-emerald-700/80">(duplicate records automatically skipped)</span>
              </p>
            </div>

            <div className="flex flex-col gap-2.5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setPendingImport(null)}
                className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmPendingImport('replace')}
                className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-cyan-300 bg-cyan-50 px-4 py-2 text-xs font-semibold text-cyan-800 hover:bg-cyan-100"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Replace Existing
              </button>
              <button
                type="button"
                onClick={() => handleConfirmPendingImport('merge')}
                className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:brightness-110"
              >
                <GitMerge className="h-3.5 w-3.5" /> Merge (Add Delta Only)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
