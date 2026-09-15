import type { AuditDictionary, FieldDiff } from './types';

function parseJson(raw: string): Record<string, unknown> {
  if (!raw.trim()) return {};
  try {
    const value = JSON.parse(raw);
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return { _value: value };
  } catch {
    return { _raw: raw };
  }
}

function stringifyValue(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function tableKey(name: string): string {
  return name.replace(/^\[|\]$/g, '').toLowerCase();
}

export function tableDisplayName(tableName: string, dictionary: AuditDictionary | null): string {
  if (!tableName) return 'Ismeretlen tábla';
  const key = tableKey(tableName);
  const match = dictionary?.tables.find((item) => tableKey(item.tableName) === key);
  if (match) return match.displayName;
  const short = dictionary?.tables.find((item) => tableKey(item.tableName).endsWith(`.${key}`) || key.endsWith(`.${tableKey(item.tableName)}`));
  return short?.displayName || tableName;
}

export function fieldDisplayName(
  tableName: string,
  columnName: string,
  dictionary: AuditDictionary | null
): string {
  const table = tableKey(tableName);
  const column = columnName.toLowerCase();
  const match = dictionary?.fields.find(
    (item) =>
      item.columnName.toLowerCase() === column &&
      (tableKey(item.tableName) === table ||
        tableKey(item.tableName).endsWith(`.${table}`) ||
        table.endsWith(`.${tableKey(item.tableName)}`))
  );
  return match?.displayName || columnName;
}

const SKIP_DIFF_COLUMNS = new Set([
  'lastupdateduserid',
  'createdat',
  'updatedat',
]);

export function diffChangedFields(
  oldDataJson: string,
  newDataJson: string,
  tableName: string,
  dictionary: AuditDictionary | null
): FieldDiff[] {
  const oldData = parseJson(oldDataJson);
  const newData = parseJson(newDataJson);
  const keys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
  const diffs: FieldDiff[] = [];
  for (const key of keys) {
    if (SKIP_DIFF_COLUMNS.has(key.replace(/[_-]/g, '').toLowerCase())) continue;
    const oldValue = stringifyValue(oldData[key]);
    const newValue = stringifyValue(newData[key]);
    if (oldValue === newValue) continue;
    diffs.push({
      columnName: key,
      label: fieldDisplayName(tableName, key, dictionary),
      oldValue,
      newValue,
    });
  }
  return diffs;
}
