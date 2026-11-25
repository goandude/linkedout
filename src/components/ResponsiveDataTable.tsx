import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Download, LayoutGrid, Table as TableIcon } from 'lucide-react';
import type { RowRecord } from '../types/linkedin';
import { exportRowsToCsv, exportRowsToJson } from '../lib/wildcard';

interface ResponsiveDataTableProps {
  rows: RowRecord[];
  columns?: string[];
  exportName?: string;
  emptyMessage?: string;
  pageSize?: number;
}

export function ResponsiveDataTable({
  rows,
  columns,
  exportName = 'linkedout_export',
  emptyMessage = 'No matching records found.',
  pageSize = 25,
}: ResponsiveDataTableProps) {
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const [mobileMode, setMobileMode] = useState<'cards' | 'table'>('cards');

  const derivedColumns = useMemo(() => {
    if (columns && columns.length > 0) return columns;
    const set = new Set<string>();
    for (let i = 0; i < Math.min(rows.length, 30); i++) {
      Object.keys(rows[i]).forEach((k) => set.add(k));
    }
    return Array.from(set);
  }, [rows, columns]);

  const sortedRows = useMemo(() => {
    if (!sortCol) return rows;
    return [...rows].sort((a, b) => {
      const av = (a[sortCol] ?? '').toLowerCase();
      const bv = (b[sortCol] ?? '').toLowerCase();
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [rows, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = sortedRows.slice(safePage * pageSize, (safePage + 1) * pageSize);

  const toggleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
    setPage(0);
  };

  if (rows.length === 0) {
    return (
      <div className="glass-card rounded-xl p-8 text-center text-sm text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
        <span>
          Showing <strong className="text-slate-900">{safePage * pageSize + 1}</strong>–
          <strong className="text-slate-900">{Math.min((safePage + 1) * pageSize, sortedRows.length)}</strong> of{' '}
          <strong className="text-emerald-700">{sortedRows.length.toLocaleString()}</strong> results
        </span>

        <div className="flex items-center gap-2">
          {/* Mobile layout switcher */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 md:hidden">
            <button
              type="button"
              onClick={() => setMobileMode('cards')}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs ${
                mobileMode === 'cards' ? 'bg-slate-900 text-white' : 'text-slate-600'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Cards
            </button>
            <button
              type="button"
              onClick={() => setMobileMode('table')}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs ${
                mobileMode === 'table' ? 'bg-slate-900 text-white' : 'text-slate-600'
              }`}
            >
              <TableIcon className="h-3.5 w-3.5" /> Table
            </button>
          </div>

          <button
            type="button"
            onClick={() => exportRowsToCsv(sortedRows, `${exportName}.csv`)}
            className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs transition hover:border-emerald-500 hover:text-emerald-700"
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
          <button
            type="button"
            onClick={() => exportRowsToJson(sortedRows, `${exportName}.json`)}
            className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs transition hover:border-cyan-500 hover:text-cyan-700"
          >
            <Download className="h-3.5 w-3.5" /> JSON
          </button>
        </div>
      </div>

      {/* Mobile Card View */}
      {mobileMode === 'cards' && (
        <div className="grid gap-3 md:hidden">
          {pageRows.map((row, idx) => (
            <div key={idx} className="glass-card rounded-xl p-4 space-y-2">
              {derivedColumns.slice(0, 7).map((col) => {
                const val = row[col];
                if (!val) return null;
                const isUrl = /^https?:\/\//i.test(val);
                return (
                  <div key={col} className="flex flex-col gap-0.5 border-b border-slate-200/80 pb-1.5 last:border-b-0 last:pb-0">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{col}</span>
                    {isUrl ? (
                      <a
                        href={val}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate text-xs text-cyan-700 underline decoration-cyan-500/40"
                      >
                        {val}
                      </a>
                    ) : (
                      <span className="break-words text-xs text-slate-800">{val}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Desktop Table (and mobile when toggled to table) */}
      <div className={`${mobileMode === 'cards' ? 'hidden md:block' : 'block'} glass-card overflow-hidden rounded-xl`}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/80 text-slate-700">
                {derivedColumns.map((col) => (
                  <th
                    key={col}
                    onClick={() => toggleSort(col)}
                    className="cursor-pointer whitespace-nowrap px-3.5 py-3 font-semibold select-none hover:bg-slate-200/60 hover:text-slate-900"
                  >
                    <div className="inline-flex items-center gap-1">
                      <span>{col}</span>
                      {sortCol === col &&
                        (sortDir === 'asc' ? (
                          <ArrowUp className="h-3 w-3 text-emerald-600" />
                        ) : (
                          <ArrowDown className="h-3 w-3 text-emerald-600" />
                        ))}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70">
              {pageRows.map((row, rIdx) => (
                <tr key={rIdx} className="transition-colors hover:bg-slate-100/60">
                  {derivedColumns.map((col) => {
                    const val = row[col] ?? '';
                    const isUrl = /^https?:\/\//i.test(val);
                    return (
                      <td key={col} className="max-w-[280px] truncate px-3.5 py-2.5 text-slate-700" title={val}>
                        {isUrl ? (
                          <a
                            href={val}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-700 hover:underline"
                          >
                            {val}
                          </a>
                        ) : (
                          val || <span className="text-slate-300">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1 text-xs text-slate-600">
          <span>
            Page {safePage + 1} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-slate-700 shadow-xs disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>
            <button
              type="button"
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-slate-700 shadow-xs disabled:opacity-40"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
