export type RowRecord = Record<string, string>;

export interface ArticleRecord {
  filename: string;
  title: string;
  date: string;
  textContent: string;
  htmlBody: string;
}

export interface TableInfo {
  key: string;
  label: string;
  sourceFile: string;
  rowCount: number;
  columns: string[];
}

export interface DatasetMeta {
  fileName: string;
  importedAt: string;
  fileSizeBytes: number;
  tableCount: number;
  totalRows: number;
  tables: TableInfo[];
}

export interface LinkedInDataset {
  meta: DatasetMeta;
  /** Normalized tables keyed by canonical table name (e.g. 'connections', 'messages') */
  tables: Record<string, RowRecord[]>;
  articles: ArticleRecord[];
}

export type FilterOperator =
  | 'wildcard'
  | 'contains'
  | 'equals'
  | 'not_equals'
  | 'starts_with'
  | 'ends_with'
  | 'is_empty'
  | 'is_not_empty'
  | 'regex';

export interface FilterCondition {
  id: string;
  field: string;
  operator: FilterOperator;
  value: string;
}

export interface SavedQuery {
  id: string;
  name: string;
  table: string;
  combinator: 'AND' | 'OR';
  conditions: FilterCondition[];
  createdAt: string;
}
