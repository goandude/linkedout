import type { FilterCondition, RowRecord } from '../types/linkedin';

/**
 * Escapes special RegExp characters except our wildcard tokens (*, %, ?).
 */
function escapeRegexExceptWildcards(str: string): string {
  return str.replace(/[.+^${}()|[\]\\]/g, '\\$&');
}

/**
 * Converts a wildcard pattern (*, %, ?) into a RegExp.
 * If the pattern has no wildcards, it performs a substring match (unless exact=true).
 */
export function compileWildcardPattern(
  rawPattern: string,
  options: { caseSensitive?: boolean; exact?: boolean } = {}
): RegExp | null {
  const trimmed = rawPattern.trim();
  if (!trimmed) return null;

  const flags = options.caseSensitive ? '' : 'i';

  // Explicit /regex/ syntax
  if (trimmed.startsWith('/') && trimmed.lastIndexOf('/') > 0) {
    const lastSlash = trimmed.lastIndexOf('/');
    const body = trimmed.slice(1, lastSlash);
    const userFlags = trimmed.slice(lastSlash + 1) || (options.caseSensitive ? '' : 'i');
    try {
      return new RegExp(body, userFlags);
    } catch {
      return null;
    }
  }

  const hasWildcard = /[*%?]/.test(trimmed);
  const escaped = escapeRegexExceptWildcards(trimmed)
    .replace(/[*%]/g, '.*')
    .replace(/\?/g, '.');

  try {
    if (hasWildcard || options.exact) {
      return new RegExp(`^${escaped}$`, flags);
    }
    return new RegExp(escaped, flags);
  } catch {
    return null;
  }
}

/**
 * Evaluates a rich search query supporting:
 * - Wildcards: * (or %), ?
 * - Quoted exact phrases: "Product Manager"
 * - Exclusions: -Intern, -*@gmail.com
 * - Regex: /pattern/i
 */
export function createPatternMatcher(
  query: string,
  options: { caseSensitive?: boolean } = {}
): (value: string | undefined | null) => boolean {
  const trimmed = query.trim();
  if (!trimmed) return () => true;

  // Direct /regex/ mode
  if (trimmed.startsWith('/') && trimmed.lastIndexOf('/') > 0) {
    const rx = compileWildcardPattern(trimmed, options);
    if (rx) {
      return (val) => rx.test(val ?? '');
    }
  }

  // Tokenize respecting quotes
  const tokens: string[] = [];
  const tokenRegex = /-?"[^"]+"|[^\s]+/g;
  let match: RegExpExecArray | null;
  while ((match = tokenRegex.exec(trimmed)) !== null) {
    tokens.push(match[0]);
  }

  const positives: RegExp[] = [];
  const negatives: RegExp[] = [];

  for (const tok of tokens) {
    const isNeg = tok.startsWith('-') && tok.length > 1;
    let body = isNeg ? tok.slice(1) : tok;
    const isQuoted = body.startsWith('"') && body.endsWith('"') && body.length >= 2;
    if (isQuoted) {
      body = body.slice(1, -1);
    }

    const rx = compileWildcardPattern(body, {
      caseSensitive: options.caseSensitive,
      exact: false,
    });
    if (rx) {
      if (isNeg) negatives.push(rx);
      else positives.push(rx);
    }
  }

  return (val) => {
    const text = val ?? '';
    for (const neg of negatives) {
      if (neg.test(text)) return false;
    }
    for (const pos of positives) {
      if (!pos.test(text)) return false;
    }
    return true;
  };
}

/**
 * Evaluates a single structured FilterCondition against a row.
 */
export function matchesCondition(row: RowRecord, cond: FilterCondition): boolean {
  const rawVal = (row[cond.field] ?? '').trim();
  const target = cond.value.trim();

  switch (cond.operator) {
    case 'is_empty':
      return rawVal.length === 0;
    case 'is_not_empty':
      return rawVal.length > 0;
    case 'equals':
      return rawVal.toLowerCase() === target.toLowerCase();
    case 'not_equals':
      return rawVal.toLowerCase() !== target.toLowerCase();
    case 'contains':
      return !target || rawVal.toLowerCase().includes(target.toLowerCase());
    case 'starts_with':
      return !target || rawVal.toLowerCase().startsWith(target.toLowerCase());
    case 'ends_with':
      return !target || rawVal.toLowerCase().endsWith(target.toLowerCase());
    case 'regex': {
      if (!target) return true;
      try {
        const rx = new RegExp(target, 'i');
        return rx.test(rawVal);
      } catch {
        return false;
      }
    }
    case 'wildcard':
    default: {
      if (!target) return true;
      const matcher = createPatternMatcher(target);
      return matcher(rawVal);
    }
  }
}

export function filterRows(
  rows: RowRecord[],
  conditions: FilterCondition[],
  combinator: 'AND' | 'OR' = 'AND'
): RowRecord[] {
  if (conditions.length === 0) return rows;
  return rows.filter((row) => {
    if (combinator === 'AND') {
      return conditions.every((c) => matchesCondition(row, c));
    }
    return conditions.some((c) => matchesCondition(row, c));
  });
}

export function exportRowsToCsv(rows: RowRecord[], filename: string): void {
  if (rows.length === 0) return;
  const headers = Array.from(
    rows.reduce((set, r) => {
      Object.keys(r).forEach((k) => set.add(k));
      return set;
    }, new Set<string>())
  );

  const escapeCell = (v: string) => {
    const s = v ?? '';
    if (/[",\n\r]/.test(s)) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const lines = [
    headers.map(escapeCell).join(','),
    ...rows.map((r) => headers.map((h) => escapeCell(r[h] ?? '')).join(',')),
  ];

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, filename);
}

export function exportRowsToJson(rows: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(rows, null, 2)], {
    type: 'application/json;charset=utf-8;',
  });
  triggerDownload(blob, filename);
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
