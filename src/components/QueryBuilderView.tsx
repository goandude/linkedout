import { useMemo, useState } from 'react';
import { Bookmark, Play, Plus, Trash2 } from 'lucide-react';
import type { FilterCondition, FilterOperator, LinkedInDataset, SavedQuery } from '../types/linkedin';
import { filterRows } from '../lib/wildcard';
import { ResponsiveDataTable } from './ResponsiveDataTable';

interface QueryBuilderViewProps {
  dataset: LinkedInDataset;
  savedQueries: SavedQuery[];
  onSaveQuery: (q: SavedQuery) => void;
  onDeleteQuery: (id: string) => void;
}

const OPERATORS: { value: FilterOperator; label: string }[] = [
  { value: 'wildcard', label: 'matches wildcard (*, ?)' },
  { value: 'contains', label: 'contains' },
  { value: 'equals', label: 'equals' },
  { value: 'not_equals', label: 'not equals' },
  { value: 'starts_with', label: 'starts with' },
  { value: 'ends_with', label: 'ends with' },
  { value: 'is_not_empty', label: 'is not empty' },
  { value: 'is_empty', label: 'is empty' },
  { value: 'regex', label: 'matches regex' },
];

export function QueryBuilderView({
  dataset,
  savedQueries,
  onSaveQuery,
  onDeleteQuery,
}: QueryBuilderViewProps) {
  const tableList = dataset.meta.tables;
  const [selectedTable, setSelectedTable] = useState(tableList[0]?.key ?? 'connections');
  const [combinator, setCombinator] = useState<'AND' | 'OR'>('AND');
  const [queryName, setQueryName] = useState('');

  const tableInfo = tableList.find((t) => t.key === selectedTable) ?? tableList[0];
  const columns = tableInfo?.columns ?? [];

  const [conditions, setConditions] = useState<FilterCondition[]>([
    {
      id: 'cond-1',
      field: columns[0] ?? 'Company',
      operator: 'wildcard',
      value: '',
    },
  ]);

  const rows = dataset.tables[selectedTable] ?? [];

  const results = useMemo(
    () => filterRows(rows, conditions, combinator),
    [rows, conditions, combinator]
  );

  const handleTableChange = (nextTable: string) => {
    setSelectedTable(nextTable);
    const nextCols = tableList.find((t) => t.key === nextTable)?.columns ?? [];
    setConditions([
      {
        id: `cond-${Date.now()}`,
        field: nextCols[0] ?? '',
        operator: 'wildcard',
        value: '',
      },
    ]);
  };

  const addCondition = () => {
    setConditions((prev) => [
      ...prev,
      {
        id: `cond-${Date.now()}`,
        field: columns[0] ?? '',
        operator: 'wildcard',
        value: '',
      },
    ]);
  };

  const updateCondition = (id: string, patch: Partial<FilterCondition>) => {
    setConditions((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const removeCondition = (id: string) => {
    setConditions((prev) => (prev.length > 1 ? prev.filter((c) => c.id !== id) : prev));
  };

  const handleSave = () => {
    const name = queryName.trim() || `${tableInfo?.label ?? selectedTable} Query`;
    onSaveQuery({
      id: `sq-${Date.now()}`,
      name,
      table: selectedTable,
      combinator,
      conditions,
      createdAt: new Date().toISOString(),
    });
    setQueryName('');
  };

  const applySaved = (sq: SavedQuery) => {
    setSelectedTable(sq.table);
    setCombinator(sq.combinator);
    setConditions(sq.conditions);
  };

  return (
    <div className="space-y-5">
      {/* Saved Queries */}
      {savedQueries.length > 0 && (
        <div className="glass-card rounded-2xl p-4">
          <p className="mb-2 text-xs font-semibold text-slate-700">Saved Local Queries</p>
          <div className="flex flex-wrap gap-2">
            {savedQueries.map((sq) => (
              <div
                key={sq.id}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs shadow-2xs"
              >
                <button
                  type="button"
                  onClick={() => applySaved(sq)}
                  className="inline-flex items-center gap-1.5 font-medium text-cyan-700 hover:text-cyan-800"
                >
                  <Play className="h-3 w-3" /> {sq.name}
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteQuery(sq.id)}
                  className="ml-1 text-slate-400 hover:text-rose-600"
                  title="Delete saved query"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Builder Card */}
      <div className="glass-card rounded-2xl p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-600">Dataset Table</label>
              <select
                value={selectedTable}
                onChange={(e) => handleTableChange(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
              >
                {tableList.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label} ({t.rowCount.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-600">Match Logic</label>
              <select
                value={combinator}
                onChange={(e) => setCombinator(e.target.value as 'AND' | 'OR')}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
              >
                <option value="AND">Match ALL (AND)</option>
                <option value="OR">Match ANY (OR)</option>
              </select>
            </div>
          </div>

          <div className="flex items-end gap-2">
            <input
              type="text"
              value={queryName}
              onChange={(e) => setQueryName(e.target.value)}
              placeholder="Name this query..."
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-cyan-300 bg-cyan-50 px-3 py-2 text-xs font-medium text-cyan-800 hover:bg-cyan-100"
            >
              <Bookmark className="h-3.5 w-3.5" /> Save
            </button>
          </div>
        </div>

        {/* Conditions */}
        <div className="space-y-2.5">
          {conditions.map((cond) => {
            const needsValue = cond.operator !== 'is_empty' && cond.operator !== 'is_not_empty';
            return (
              <div key={cond.id} className="grid gap-2 sm:grid-cols-12">
                <select
                  value={cond.field}
                  onChange={(e) => updateCondition(cond.id, { field: e.target.value })}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 sm:col-span-4"
                >
                  {columns.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>

                <select
                  value={cond.operator}
                  onChange={(e) => updateCondition(cond.id, { operator: e.target.value as FilterOperator })}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 sm:col-span-3"
                >
                  {OPERATORS.map((op) => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  disabled={!needsValue}
                  value={cond.value}
                  onChange={(e) => updateCondition(cond.id, { value: e.target.value })}
                  placeholder={needsValue ? 'Value or wildcard (*VP*, *@gmail.com)...' : 'No value needed'}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 disabled:bg-slate-100 disabled:opacity-60 sm:col-span-4"
                />

                <button
                  type="button"
                  onClick={() => removeCondition(cond.id)}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:text-rose-600 sm:col-span-1"
                  title="Remove condition"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={addCondition}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-emerald-500 hover:text-emerald-700"
        >
          <Plus className="h-3.5 w-3.5" /> Add Condition
        </button>
      </div>

      <ResponsiveDataTable rows={results} columns={columns} exportName={`linkedout_query_${selectedTable}`} />
    </div>
  );
}
