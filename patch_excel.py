import re
import os

print("Patching inviteImport.ts...")
ts_path = r"C:\Users\user\Projects\eventjoy-test\src\utils\inviteImport.ts"
with open(ts_path, 'r', encoding='utf-8') as f:
    ts_content = f.read()

# Add import * as XLSX from 'xlsx';
if "import * as XLSX" not in ts_content:
    ts_content = "import * as XLSX from 'xlsx';\n" + ts_content

# Find parseInviteFile block and replace it
parse_invite_pattern = r'export async function parseInviteFile\(file: File\): Promise<InviteImportRow\[\]> \{.*?(?=\nexport function toInviteImportPayload)'
parse_new = """export async function parseInviteFile(file: File): Promise<InviteImportRow[]> {
  const buffer = await file.arrayBuffer();
  try {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return [];
    const sheet = workbook.Sheets[sheetName];
    // A2:A... contains the data. We want an array of arrays or array of objects.
    // sheet_to_json gives array of objects but headers might be messy, so array of arrays is safer for our mapGridToInvites function
    const grid = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' });
    // Convert all cells to strings
    const strGrid = grid.map(row => row.map(cell => String(cell ?? '').trim()));
    return mapGridToInvites(strGrid);
  } catch (err) {
    throw new Error('A fájl nem olvasható. Győződj meg róla, hogy valós .xlsx fájl.');
  }
}
"""
ts_content = re.sub(parse_invite_pattern, parse_new, ts_content, flags=re.DOTALL)

# Replace buildInviteTemplateXls with buildInviteTemplateXlsx returning a Blob or Uint8Array
build_xls_pattern = r'export function buildInviteTemplateXls\(.*?\n\}'
build_new = """export function buildInviteTemplateXlsx(hints: InviteTemplateHints, eventTitle = ''): Uint8Array {
  const wb = XLSX.utils.book_new();

  // Meghívottak sheet
  const mainData = [
    [...INVITE_TEMPLATE_HEADERS],
    exampleRow(hints)
  ];
  const wsMain = XLSX.utils.aoa_to_sheet(mainData);
  XLSX.utils.book_append_sheet(wb, wsMain, 'Meghívottak');

  // Szerepkörök sheet
  const roleRows = (hints.roles.length ? hints.roles : ['(nincs szerepkör)']).map(r => [r]);
  roleRows.unshift(['Szerepkör']);
  if (eventTitle) roleRows.push([`Esemény: ${eventTitle}`]);
  const wsRoles = XLSX.utils.aoa_to_sheet(roleRows);
  XLSX.utils.book_append_sheet(wb, wsRoles, 'Szerepkörök');

  // Jegyek sheet
  const ticketRows = (hints.tickets.length ? hints.tickets : ['(nincs jegy)']).map(t => [t]);
  ticketRows.unshift(['Jegy']);
  const wsTickets = XLSX.utils.aoa_to_sheet(ticketRows);
  XLSX.utils.book_append_sheet(wb, wsTickets, 'Jegyek');

  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
}"""
ts_content = re.sub(build_xls_pattern, build_new, ts_content, flags=re.DOTALL)

# Add a function to download binary files
if "downloadBinaryFile" not in ts_content:
    ts_content += """
export function downloadBinaryFile(filename: string, contents: Uint8Array, mime: string) {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
"""

with open(ts_path, 'w', encoding='utf-8') as f:
    f.write(ts_content)

print("Patching InviteExcelImport.vue...")
vue_path = r"C:\Users\user\Projects\eventjoy-test\src\components\event\InviteExcelImport.vue"
with open(vue_path, 'r', encoding='utf-8') as f:
    vue_content = f.read()

# Remove the CSV button
vue_content = re.sub(r'<button[^>]*@click="downloadCsv"[^>]*>.*?<\/button>', '', vue_content, flags=re.DOTALL)

# Update XLS button to XLSX
vue_content = vue_content.replace('@click="downloadXls"', '@click="downloadXlsx"')
vue_content = vue_content.replace('XLS\n        </button>', 'Sablon (.xlsx)\n        </button>')
vue_content = vue_content.replace('Fájl\n        </button>', 'Feltöltés\n        </button>')
vue_content = vue_content.replace('Fjl\n        </button>', 'Feltöltés\n        </button>')

# File input accept
vue_content = vue_content.replace('accept=".xls,.csv,.xml,.xlsx"', 'accept=".xlsx"')

# Imports in setup
vue_content = vue_content.replace('buildInviteTemplateCsv,', '')
vue_content = vue_content.replace('buildInviteTemplateXls,', 'buildInviteTemplateXlsx,\n  downloadBinaryFile,')

# Functions
vue_content = re.sub(r'function downloadCsv\(\) \{.*?\}', '', vue_content, flags=re.DOTALL)

download_xls_pattern = r'function downloadXls\(\) \{.*?\}'
download_xlsx = """function downloadXlsx() {
  const data = buildInviteTemplateXlsx(hints.value, props.eventName);
  downloadBinaryFile(`${safeFileBase()}.xlsx`, data, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}"""
vue_content = re.sub(download_xls_pattern, download_xlsx, vue_content, flags=re.DOTALL)

with open(vue_path, 'w', encoding='utf-8') as f:
    f.write(vue_content)

print("Done!")
