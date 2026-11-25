import { useRef, useState } from 'react';
import {
  Database,
  FileArchive,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  WifiOff,
  Search,
} from 'lucide-react';
import { Logo } from './Logo';

interface UploadLandingProps {
  isParsing: boolean;
  progress: number;
  progressLabel: string;
  error: string | null;
  sessionOnly: boolean;
  onToggleSessionOnly: (val: boolean) => void;
  onFileSelected: (file: File) => void;
  onLoadDemo: () => void;
}

export function UploadLanding({
  isParsing,
  progress,
  progressLabel,
  error,
  sessionOnly,
  onToggleSessionOnly,
  onFileSelected,
  onLoadDemo,
}: UploadLandingProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    onFileSelected(files[0]);
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-4 py-10 sm:px-6 lg:px-8">
      {/* Top Hero */}
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-5">
          <Logo size={52} showWordmark={false} />
        </div>
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-medium text-emerald-700">
          <ShieldCheck className="h-3.5 w-3.5" />
          100% Client-Side • Local Browser Storage Only
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Query your LinkedIn archive{' '}
          <span className="bg-gradient-to-r from-emerald-600 via-cyan-600 to-indigo-600 bg-clip-text text-transparent">
            without leaving your device.
          </span>
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-600 sm:text-base">
          Drop your <code className="rounded bg-slate-200/80 px-1.5 py-0.5 text-emerald-700">Basic_LinkedInDataExport.zip</code>{' '}
          to search connections by company, title, or email wildcards, explore 10,000+ messages, and audit your ad profile—even offline.
        </p>
      </div>

      {/* Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => !isParsing && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !isParsing) {
            inputRef.current?.click();
          }
        }}
        className={`glass-panel group relative cursor-pointer rounded-2xl p-8 text-center transition-all duration-200 sm:p-12 ${
          isDragging
            ? 'border-emerald-500 bg-emerald-50/70 shadow-[0_0_40px_rgba(16,185,129,0.18)]'
            : 'hover:border-cyan-500/50 hover:bg-white/95'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".zip,application/zip"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        {isParsing ? (
          <div className="mx-auto max-w-md space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
              <FileArchive className="h-7 w-7 animate-pulse" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-800">{progressLabel || 'Parsing archive...'}</p>
              <p className="text-xs text-slate-500">{progress}% complete</p>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-cyan-500 to-indigo-500 transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100/80 text-cyan-600 transition-transform duration-200 group-hover:scale-105 group-hover:border-cyan-400">
              <UploadCloud className="h-8 w-8" />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-900 sm:text-lg">
                Drag & drop your LinkedIn <span className="text-emerald-600">.zip</span> export here
              </p>
              <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                Or tap to browse from your computer or phone • Zero bytes uploaded
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  inputRef.current?.click();
                }}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition hover:brightness-110"
              >
                <FileArchive className="h-4 w-4" />
                Select .zip Archive
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onLoadDemo();
                }}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-xs transition hover:border-slate-400 hover:bg-slate-50"
              >
                <Sparkles className="h-4 w-4 text-amber-500" />
                Try Synthetic Demo Data
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}
      </div>

      {/* Session-Only Toggle & LinkedIn Instructions */}
      <div className="mt-5 flex flex-col items-center justify-between gap-3 text-xs text-slate-500 sm:flex-row">
        <label className="inline-flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 bg-white/80 px-3 py-2 shadow-xs">
          <input
            type="checkbox"
            checked={sessionOnly}
            onChange={(e) => onToggleSessionOnly(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 bg-white text-emerald-600 focus:ring-emerald-500"
          />
          <span>
            <strong className="text-slate-800">Ephemeral Session Mode</strong> (keep in memory only, skip IndexedDB)
          </span>
        </label>

        <p className="text-center sm:text-right">
          Get your export: LinkedIn → <span className="font-medium text-slate-700">Settings & Privacy → Data Privacy → Get a copy of your data</span>
        </p>
      </div>

      {/* Feature Highlights */}
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <div className="glass-card rounded-xl p-4">
          <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
            <Database className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">Local Storage Only</h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            Parsed tables persist in your browser&apos;s IndexedDB for instant reloads, with a one-click wipe anytime.
          </p>
        </div>

        <div className="glass-card rounded-xl p-4">
          <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700">
            <Search className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">Wildcard & Pre-Built Queries</h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            Use <code className="font-semibold text-cyan-700">*</code>, <code className="font-semibold text-cyan-700">?</code>, and{' '}
            <code className="font-semibold text-cyan-700">-exclude</code> across companies, titles, emails, and 10,000+ messages.
          </p>
        </div>

        <div className="glass-card rounded-xl p-4">
          <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
            <WifiOff className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">Offline-Ready PWA</h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            Install LinkedOut to desktop or mobile and query your dataset even with Wi-Fi turned off.
          </p>
        </div>
      </div>
    </div>
  );
}
