import * as XLSX from 'xlsx';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export function excelFileBase(eventName: string, label: string): string {
  const base = `${eventName || 'esemeny'}-${label}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return base || label;
}

export function downloadExcelSheet(
  filename: string,
  sheetName: string,
  rows: Array<Record<string, string | number>>
): void {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  const bytes = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as Uint8Array;
  const blob = new Blob([bytes], { type: XLSX_MIME });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
