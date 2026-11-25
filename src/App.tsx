import { useEffect, useState } from 'react';
import {
  Briefcase,
  Database,
  Download,
  GraduationCap,
  LayoutDashboard,
  Menu,
  MessageSquare,
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
  const [isHydrating, setIsHydrating] = useState(true);
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
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
    };
  }, []);

  const handleToggleSessionOnly = (val: boolean) => {
    setSessionOnly(val);
    setSessionOnlyMode(val);
  };

  const handleFileSelected = async (file: File) => {
    setError(null);
    setIsParsing(true);
    setProgress(0);
    setProgressLabel('Starting...');
    try {
      const parsed = await parseLinkedInZip(file, (pct, lbl) => {
        setProgress(pct);
        setProgressLabel(lbl);
      });
      if (!sessionOnly) {
        await saveDatasetToIndexedDB(parsed);
      }
      setDataset(parsed);
      setActiveTab('overview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse LinkedIn zip archive.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleLoadDemo = async () => {
    const demo = createSyntheticDemoDataset();
    if (!sessionOnly) {
      await saveDatasetToIndexedDB(demo);
    }
    setDataset(demo);
    setActiveTab('overview');
  };

  const handleClearData = async () => {
    await clearAllLocalData();
    setDataset(null);
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
          onToggleSessionOnly={handleToggleSessionOnly}
          onFileSelected={handleFileSelected}
          onLoadDemo={handleLoadDemo}
        />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col lg:flex-row">
      <AnimatedBackground />

      {/* Desktop Sidebar */}
      <aside className="glass-panel hidden w-64 shrink-0 flex-col justify-between border-r border-slate-200/80 p-4 lg:flex">
        <div className="space-y-6">
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
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition ${
                    active
                      ? 'border border-emerald-200 bg-gradient-to-r from-emerald-50 to-cyan-50 text-emerald-800 shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer: Privacy & Storage */}
        <div className="space-y-2.5 border-t border-slate-200/80 pt-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-3 text-[11px] text-emerald-800">
            <div className="flex items-center gap-1.5 font-semibold">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
              Local-Only Mode
            </div>
            <p className="mt-1 text-[10px] text-emerald-700/85">
              {sessionOnly ? 'Ephemeral memory only' : 'Persisted in browser IndexedDB'} • 0 bytes sent to server
            </p>
          </div>

          {installPrompt && (
            <button
              type="button"
              onClick={handleInstallPwa}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-300 bg-cyan-50 px-3 py-2 text-xs font-medium text-cyan-800 hover:bg-cyan-100"
            >
              <Download className="h-3.5 w-3.5" /> Install Offline App
            </button>
          )}

          <button
            type="button"
            onClick={() => setDataset(null)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-2xs hover:border-slate-300 hover:text-slate-900"
          >
            <Upload className="h-3.5 w-3.5" /> Import New .zip
          </button>

          <button
            type="button"
            onClick={handleClearData}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 hover:bg-rose-100"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear Local Data
          </button>
        </div>
      </aside>

      {/* Mobile / Tablet Header */}
      <header className="glass-panel sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/80 px-4 py-3 lg:hidden">
        <Logo size={28} />
        <div className="flex items-center gap-2">
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
                setDataset(null);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
            >
              <Upload className="h-3.5 w-3.5" /> Import .zip
            </button>
            <button
              type="button"
              onClick={handleClearData}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700"
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear Data
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:pb-8">
        {/* Top Context Bar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
              {NAV_ITEMS.find((i) => i.key === activeTab)?.label}
            </h1>
            <p className="text-xs text-slate-500">
              {dataset.meta.tableCount} tables • {dataset.meta.totalRows.toLocaleString()} total records
            </p>
          </div>

          <div className="hidden items-center gap-2 lg:flex">
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
    </div>
  );
}

export default App;
