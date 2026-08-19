/**
 * Minimal RFC 4180 CSV writer. Spreadsheet exports are the one place a
 * stray quote or newline in user-entered data turns into a corrupted file,
 * so quoting is unconditional rather than clever.
 */

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  const text = String(value);
  // A leading =, +, - or @ makes Excel and Sheets treat the cell as a
  // formula. Prefixing a single quote keeps it text (CSV injection, §12).
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function toCsv(
  rows: Record<string, unknown>[],
  columns: string[],
): string {
  const lines = [columns.map(escapeCell).join(",")];
  for (const row of rows) {
    lines.push(columns.map((c) => escapeCell(row[c])).join(","));
  }
  // CRLF and a UTF-8 BOM: without the BOM, Excel opens ₱ and é as mojibake.
  return `﻿${lines.join("\r\n")}\r\n`;
}
