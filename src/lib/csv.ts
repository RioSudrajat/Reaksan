export type CsvColumn = { key: string; label: string };

export type CsvRow = Record<string, string | number | null | undefined>;

function escapeCell(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

// UTF-8 BOM + CRLF keeps Excel happy on Windows without extra dependencies.
export function toCsv(rows: CsvRow[], columns: CsvColumn[]) {
  const lines = [
    columns.map((column) => escapeCell(column.label)).join(","),
    ...rows.map((row) =>
      columns.map((column) => escapeCell(row[column.key])).join(","),
    ),
  ];
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}
