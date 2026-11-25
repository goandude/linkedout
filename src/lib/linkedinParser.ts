import { unzipSync, strFromU8 } from 'fflate';
import Papa from 'papaparse';
import type { ArticleRecord, LinkedInDataset, RowRecord, TableInfo } from '../types/linkedin';

const FILE_TO_TABLE_MAP: Record<string, { key: string; label: string }> = {
  'connections.csv': { key: 'connections', label: 'Connections' },
  'messages.csv': { key: 'messages', label: 'Messages' },
  'invitations.csv': { key: 'invitations', label: 'Invitations' },
  'company follows.csv': { key: 'company_follows', label: 'Company Follows' },
  'events.csv': { key: 'events', label: 'Events' },
  'notes.csv': { key: 'notes', label: 'Connection Notes' },
  'endorsement_received_info.csv': { key: 'endorsements_received', label: 'Endorsements Received' },
  'endorsement_given_info.csv': { key: 'endorsements_given', label: 'Endorsements Given' },
  'recommendations_given.csv': { key: 'recommendations_given', label: 'Recommendations Given' },
  'recommendations_received.csv': { key: 'recommendations_received', label: 'Recommendations Received' },
  'profile.csv': { key: 'profile', label: 'Profile' },
  'profile summary.csv': { key: 'profile_summary', label: 'Profile Summary' },
  'positions.csv': { key: 'positions', label: 'Positions' },
  'education.csv': { key: 'education', label: 'Education' },
  'skills.csv': { key: 'skills', label: 'Skills' },
  'certifications.csv': { key: 'certifications', label: 'Certifications' },
  'patents.csv': { key: 'patents', label: 'Patents' },
  'rich_media.csv': { key: 'rich_media', label: 'Rich Media' },
  'learning.csv': { key: 'learning', label: 'LinkedIn Learning' },
  'jobs/job applications.csv': { key: 'job_applications', label: 'Job Applications' },
  'jobs/saved jobs.csv': { key: 'saved_jobs', label: 'Saved Jobs' },
  'jobs/job seeker preferences.csv': { key: 'job_preferences', label: 'Job Seeker Preferences' },
  'jobs/job applicant saved answers.csv': { key: 'saved_answers', label: 'Saved Application Answers' },
  'job applicant saved screening question responses.csv': {
    key: 'screening_responses',
    label: 'Screening Question Responses',
  },
  'savedjobalerts.csv': { key: 'saved_job_alerts', label: 'Saved Job Alerts' },
  'ad_targeting.csv': { key: 'ad_targeting', label: 'Ad Targeting' },
  'receipts_v2.csv': { key: 'receipts', label: 'Receipts & Spend' },
  'registration.csv': { key: 'registration', label: 'Registration' },
  'email addresses.csv': { key: 'email_addresses', label: 'Email Addresses' },
  'phonenumbers.csv': { key: 'phone_numbers', label: 'Phone Numbers' },
  'whatsapp phone numbers.csv': { key: 'whatsapp_numbers', label: 'WhatsApp Numbers' },
  'verifications/verifications.csv': { key: 'verifications', label: 'Verifications' },
  'guide_messages.csv': { key: 'guide_messages', label: 'Guide Messages' },
  'learning_coach_messages.csv': { key: 'learning_coach_messages', label: 'Learning Coach Messages' },
  'learning_role_play_messages.csv': { key: 'learning_role_play_messages', label: 'Learning Role Play Messages' },
};

function canonicalizeFile(fullName: string): { key: string; label: string } {
  const normalized = fullName.replace(/^\/+/, '').toLowerCase();
  if (FILE_TO_TABLE_MAP[normalized]) {
    return FILE_TO_TABLE_MAP[normalized];
  }
  const base = fullName.split('/').pop() ?? fullName;
  const cleanName = base.replace(/\.csv$/i, '');
  const key = cleanName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  return { key: key || 'unknown', label: cleanName };
}

/**
 * Strips LinkedIn's "Notes:" 3-line preamble found in Connections.csv
 */
function stripNotesPreamble(csvText: string): string {
  const lines = csvText.split(/\r?\n/);
  if (lines.length > 3 && /^"?Notes:/i.test(lines[0].trim())) {
    // Find the first non-empty line after the preamble quote
    for (let i = 1; i < Math.min(lines.length, 10); i++) {
      if (lines[i].includes('First Name') && lines[i].includes('Last Name')) {
        return lines.slice(i).join('\n');
      }
    }
    return lines.slice(3).join('\n');
  }
  return csvText;
}

/**
 * Parses CSV using PapaParse with support for:
 * - Duplicate column headers (e.g. Ad_Targeting.csv has Company Names x3, Job Titles x3)
 * - Trailing empty headers (e.g. Learning.csv)
 */
function parseLinkedInCsv(rawText: string, filePath: string): { columns: string[]; rows: RowRecord[] } {
  const cleanedText = filePath.toLowerCase().endsWith('connections.csv')
    ? stripNotesPreamble(rawText)
    : rawText;

  const parsed = Papa.parse<string[]>(cleanedText, {
    header: false,
    skipEmptyLines: 'greedy',
  });

  if (!parsed.data || parsed.data.length === 0) {
    return { columns: [], rows: [] };
  }

  const rawHeaders = parsed.data[0];
  const seenCounts = new Map<string, number>();
  const columns: string[] = [];
  const validIndices: number[] = [];

  rawHeaders.forEach((header, idx) => {
    const trimmed = (header ?? '').trim();
    if (!trimmed) {
      // Skip trailing/empty column headers (e.g. Learning.csv)
      return;
    }
    const count = seenCounts.get(trimmed) ?? 0;
    seenCounts.set(trimmed, count + 1);
    const uniqueName = count === 0 ? trimmed : `${trimmed} (${count + 1})`;
    columns.push(uniqueName);
    validIndices.push(idx);
  });

  const rows: RowRecord[] = [];
  for (let r = 1; r < parsed.data.length; r++) {
    const rawRow = parsed.data[r];
    if (!rawRow || rawRow.every((cell) => !cell || !cell.trim())) continue;

    const obj: RowRecord = {};
    let hasValue = false;
    validIndices.forEach((colIdx, outIdx) => {
      const val = (rawRow[colIdx] ?? '').trim();
      if (val) hasValue = true;
      obj[columns[outIdx]] = val;
    });
    if (hasValue) {
      rows.push(obj);
    }
  }

  return { columns, rows };
}

function parseArticleHtml(html: string, fullName: string): ArticleRecord {
  const filename = fullName.split('/').pop() ?? fullName;
  const doc = new DOMParser().parseFromString(html, 'text/html');

  // Remove unsafe scripts/styles/iframes for safe inline reading
  doc.querySelectorAll('script, iframe, object, embed').forEach((el) => el.remove());

  const h1 = doc.querySelector('h1')?.textContent?.trim();
  const titleTag = doc.querySelector('title')?.textContent?.trim();
  const fallbackTitle = filename
    .replace(/\.html$/i, '')
    .replace(/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d+-?/, '')
    .replace(/-/g, ' ')
    .trim();

  const title = h1 || titleTag || fallbackTitle || filename;

  // Try extracting timestamp from filename prefix (e.g., 2026-10-08 00:16:23.0)
  const dateMatch = filename.match(/^(\d{4}-\d{2}-\d{2})/);
  const timeEl = doc.querySelector('time')?.textContent?.trim();
  const date = timeEl || (dateMatch ? dateMatch[1] : '');

  const textContent = (doc.body?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const htmlBody = doc.body?.innerHTML ?? '';

  return {
    filename,
    title,
    date,
    textContent,
    htmlBody,
  };
}

export async function parseLinkedInZip(
  file: File,
  onProgress?: (pct: number, status: string) => void
): Promise<LinkedInDataset> {
  onProgress?.(5, 'Reading archive...');
  const buffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(buffer);

  onProgress?.(20, 'Decompressing zip entries...');
  const entries = unzipSync(uint8);
  const entryNames = Object.keys(entries).filter((name) => !name.endsWith('/'));

  const tables: Record<string, RowRecord[]> = {};
  const tableInfos: TableInfo[] = [];
  const articles: ArticleRecord[] = [];
  let totalRows = 0;

  const totalEntries = Math.max(entryNames.length, 1);

  for (let i = 0; i < entryNames.length; i++) {
    const name = entryNames[i];
    const pct = 25 + Math.round(((i + 1) / totalEntries) * 70);

    if (name.toLowerCase().endsWith('.csv')) {
      onProgress?.(pct, `Parsing ${name.split('/').pop()}...`);
      const text = strFromU8(entries[name]);
      const { key, label } = canonicalizeFile(name);
      const { columns, rows } = parseLinkedInCsv(text, name);

      tables[key] = rows;
      totalRows += rows.length;
      tableInfos.push({
        key,
        label,
        sourceFile: name,
        rowCount: rows.length,
        columns,
      });
    } else if (name.toLowerCase().endsWith('.html')) {
      onProgress?.(pct, `Reading article ${name.split('/').pop()}...`);
      const html = strFromU8(entries[name]);
      articles.push(parseArticleHtml(html, name));
    }

    // Yield occasionally to keep UI animations smooth
    if (i % 6 === 0) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  tableInfos.sort((a, b) => b.rowCount - a.rowCount);
  articles.sort((a, b) => b.date.localeCompare(a.date));

  onProgress?.(100, 'Indexing complete!');

  return {
    meta: {
      fileName: file.name,
      importedAt: new Date().toISOString(),
      fileSizeBytes: file.size,
      tableCount: tableInfos.length,
      totalRows,
      tables: tableInfos,
    },
    tables,
    articles,
  };
}
