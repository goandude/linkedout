import type { ArticleRecord, LinkedInDataset, RowRecord, TableInfo } from '../types/linkedin';

function getRowDedupeKey(tableKey: string, row: RowRecord): string {
  const norm = (v?: string) => (v ?? '').trim().toLowerCase();

  switch (tableKey) {
    case 'connections': {
      const url = norm(row.URL);
      if (url) return `url:${url}`;
      return `conn:${norm(row['First Name'])}|${norm(row['Last Name'])}|${norm(row.Company)}|${norm(row['Connected On'])}`;
    }
    case 'messages':
    case 'guide_messages':
    case 'learning_coach_messages':
    case 'learning_role_play_messages':
      return `msg:${norm(row['CONVERSATION ID'])}|${norm(row.DATE)}|${norm(row.FROM)}|${norm(row.CONTENT)}`;
    case 'invitations':
      return `inv:${norm(row.Direction)}|${norm(row.From)}|${norm(row.To)}|${norm(row['Sent At'])}`;
    case 'endorsements_received':
      return `endr:${norm(row['Endorsement Date'])}|${norm(row['Skill Name'])}|${norm(row['Endorser Public Url'])}|${norm(row['Endorser First Name'])}|${norm(row['Endorser Last Name'])}`;
    case 'endorsements_given':
      return `endg:${norm(row['Endorsement Date'])}|${norm(row['Skill Name'])}|${norm(row['Endorsee Public Url'])}|${norm(row['Endorsee First Name'])}|${norm(row['Endorsee Last Name'])}`;
    case 'saved_jobs':
      return norm(row['Job Url'])
        ? `sj:${norm(row['Job Url'])}`
        : `sj:${norm(row['Job Title'])}|${norm(row['Company Name'])}|${norm(row['Saved Date'])}`;
    case 'job_applications':
      return norm(row['Job Url'])
        ? `ja:${norm(row['Job Url'])}|${norm(row['Application Date'])}`
        : `ja:${norm(row['Job Title'])}|${norm(row['Company Name'])}|${norm(row['Application Date'])}`;
    case 'learning':
      return `learn:${norm(row['Content Title'])}|${norm(row['Content Type'])}`;
    case 'receipts':
      return norm(row['Invoice Number'])
        ? `rec:${norm(row['Invoice Number'])}`
        : `rec:${norm(row['Transaction Made At'])}|${norm(row['Total Amount'])}`;
    default: {
      const entries = Object.entries(row)
        .filter(([, v]) => v && v.trim().length > 0)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v.trim().toLowerCase()}`);
      return entries.join('|');
    }
  }
}

export interface MergeSummary {
  merged: LinkedInDataset;
  addedRows: number;
  newTables: number;
  addedArticles: number;
}

/**
 * Merges an incoming LinkedInDataset into an existing one, keeping existing records,
 * adding new tables, and appending only deduplicated delta rows.
 */
export function mergeLinkedInDatasets(
  existing: LinkedInDataset,
  incoming: LinkedInDataset
): MergeSummary {
  const mergedTables: Record<string, RowRecord[]> = {};
  const existingInfoMap = new Map<string, TableInfo>(
    existing.meta.tables.map((t) => [t.key, t])
  );
  const incomingInfoMap = new Map<string, TableInfo>(
    incoming.meta.tables.map((t) => [t.key, t])
  );

  const allKeys = new Set<string>([
    ...Object.keys(existing.tables),
    ...Object.keys(incoming.tables),
  ]);

  let addedRows = 0;
  let newTables = 0;
  const mergedTableInfos: TableInfo[] = [];

  for (const key of allKeys) {
    const baseRows = existing.tables[key] ?? [];
    const nextRows = incoming.tables[key] ?? [];

    if (baseRows.length === 0 && nextRows.length > 0 && !existingInfoMap.has(key)) {
      newTables += 1;
    }

    const rowMap = new Map<string, RowRecord>();
    for (const r of baseRows) {
      rowMap.set(getRowDedupeKey(key, r), r);
    }

    for (const r of nextRows) {
      const dKey = getRowDedupeKey(key, r);
      const prev = rowMap.get(dKey);
      if (!prev) {
        rowMap.set(dKey, r);
        addedRows += 1;
      } else {
        // Enrich any previously empty fields from the newer export without counting as a new row
        const enriched: RowRecord = { ...prev };
        for (const [col, val] of Object.entries(r)) {
          if (val && val.trim() && !(enriched[col] ?? '').trim()) {
            enriched[col] = val;
          }
        }
        rowMap.set(dKey, enriched);
      }
    }

    const combinedRows = Array.from(rowMap.values());
    mergedTables[key] = combinedRows;

    const baseInfo = existingInfoMap.get(key);
    const incInfo = incomingInfoMap.get(key);
    const colSet = new Set<string>([
      ...(baseInfo?.columns ?? []),
      ...(incInfo?.columns ?? []),
    ]);

    mergedTableInfos.push({
      key,
      label: baseInfo?.label ?? incInfo?.label ?? key,
      sourceFile: baseInfo?.sourceFile ?? incInfo?.sourceFile ?? `${key}.csv`,
      rowCount: combinedRows.length,
      columns: Array.from(colSet),
    });
  }

  mergedTableInfos.sort((a, b) => b.rowCount - a.rowCount);

  // Merge articles by filename
  const articleMap = new Map<string, ArticleRecord>();
  existing.articles.forEach((a) => articleMap.set(a.filename, a));
  let addedArticles = 0;
  incoming.articles.forEach((a) => {
    if (!articleMap.has(a.filename)) {
      articleMap.set(a.filename, a);
      addedArticles += 1;
    }
  });

  const mergedArticles = Array.from(articleMap.values()).sort((a, b) =>
    b.date.localeCompare(a.date)
  );

  const existingNames = existing.meta.fileName.split(' + ').map((s) => s.trim());
  const combinedFileName = existingNames.includes(incoming.meta.fileName)
    ? existing.meta.fileName
    : `${existing.meta.fileName} + ${incoming.meta.fileName}`;

  const totalRows = mergedTableInfos.reduce((acc, t) => acc + t.rowCount, 0);

  return {
    merged: {
      meta: {
        fileName: combinedFileName,
        importedAt: new Date().toISOString(),
        fileSizeBytes: existing.meta.fileSizeBytes + incoming.meta.fileSizeBytes,
        tableCount: mergedTableInfos.length,
        totalRows,
        tables: mergedTableInfos,
      },
      tables: mergedTables,
      articles: mergedArticles,
    },
    addedRows,
    newTables,
    addedArticles,
  };
}
