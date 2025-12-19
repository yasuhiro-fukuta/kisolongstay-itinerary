// src/lib/csv.ts

/**
 * Minimal CSV parser:
 * - UTF-8 BOM removal
 * - CRLF/LF handling
 * - quoted fields with "" escape
 *
 * Returns rows as string[][]
 */
export function parseCsv(text: string): string[][] {
  const s = String(text ?? "").replace(/^\uFEFF/, "");
  const rows: string[][] = [];

  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };

  const pushRow = () => {
    // ignore completely empty rows
    if (row.length === 1 && row[0] === "") {
      row = [];
      return;
    }
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];

    if (inQuotes) {
      if (ch === '"') {
        const next = s[i + 1];
        if (next === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }

    if (ch === ",") {
      pushField();
      continue;
    }

    if (ch === "\n") {
      pushField();
      pushRow();
      continue;
    }

    if (ch === "\r") {
      if (s[i + 1] === "\n") i++;
      pushField();
      pushRow();
      continue;
    }

    field += ch;
  }

  // last
  pushField();
  if (row.length) pushRow();

  return rows;
}

function is2dArray(v: any): v is string[][] {
  return Array.isArray(v) && (v.length === 0 || Array.isArray(v[0]));
}

/**
 * Convert CSV rows to objects using first row as header.
 *
 * ✅ rowsOrText can be:
 * - string[][] (rows)
 * - string (raw CSV text)
 */
export function csvToObjects(rowsOrText: string[][] | string): Record<string, string>[] {
  const rows: string[][] = is2dArray(rowsOrText) ? rowsOrText : parseCsv(String(rowsOrText ?? ""));

  if (!rows.length) return [];

  // header
  const headerRow = Array.isArray(rows[0]) ? rows[0] : [];
  const header = headerRow.map((h) => String(h ?? "").trim());

  const out: Record<string, string>[] = [];

  for (const r of rows.slice(1)) {
    if (!Array.isArray(r)) continue;

    const obj: Record<string, string> = {};
    for (let i = 0; i < header.length; i++) {
      const key = header[i] || `col${i}`;
      obj[key] = String(r[i] ?? "");
    }
    out.push(obj);
  }

  return out;
}

/** 互換alias */
export const csvToRecords = csvToObjects;

/** 明示的に text を渡したい場合 */
export function csvToObjectsFromText(text: string): Record<string, string>[] {
  return csvToObjects(text);
}
