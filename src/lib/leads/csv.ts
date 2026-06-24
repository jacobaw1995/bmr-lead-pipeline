export interface CsvLeadRow {
  name: string;
  phone?: string;
  email?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  zip?: string;
  source?: string;
  notes?: string;
}

export interface CsvParseResult {
  rows: CsvLeadRow[];
  errors: string[];
  warnings: string[];
}

const HEADER_ALIASES: Record<string, keyof CsvLeadRow> = {
  name: "name",
  "full name": "name",
  "customer name": "name",
  "client name": "name",
  phone: "phone",
  "phone number": "phone",
  mobile: "phone",
  cell: "phone",
  email: "email",
  "e-mail": "email",
  street: "streetAddress",
  "street address": "streetAddress",
  address: "streetAddress",
  city: "city",
  state: "state",
  st: "state",
  zip: "zip",
  "zip code": "zip",
  zipcode: "zip",
  postal: "zip",
  source: "source",
  "lead source": "source",
  notes: "notes",
  note: "notes",
  comments: "notes",
  comment: "notes",
  "additional info": "notes",
  "additional information": "notes",
  details: "notes",
  description: "notes",
  memo: "notes",
};

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

function appendNote(row: CsvLeadRow, extra: string) {
  const trimmed = extra.trim();
  if (!trimmed) return;
  row.notes = row.notes ? `${row.notes}\n\n${trimmed}` : trimmed;
}

function cellToString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value instanceof Date) {
    return value.toLocaleDateString("en-US");
  }
  return String(value).trim();
}

export function parseLeadRowsFromGrid(grid: unknown[][]): CsvParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const normalizedRows = grid
    .map((row) => (Array.isArray(row) ? row.map(cellToString) : []))
    .filter((row) => row.some((cell) => cell));

  if (normalizedRows.length < 2) {
    return {
      rows: [],
      errors: ["Spreadsheet needs a header row and at least one lead."],
      warnings: [],
    };
  }

  const headerCells = normalizedRows[0].map((h) => h.toLowerCase());
  const columnMap: (keyof CsvLeadRow | null)[] = headerCells.map((h) => {
    return HEADER_ALIASES[h] ?? null;
  });

  const extraColumnLabels: string[] = headerCells.map((h, i) =>
    columnMap[i] === null ? h : ""
  );

  const unmappedCount = extraColumnLabels.filter(Boolean).length;
  if (unmappedCount > 0) {
    warnings.push(
      `${unmappedCount} extra column${unmappedCount === 1 ? "" : "s"} will be saved as notes on each lead.`
    );
  }

  if (!columnMap.includes("name")) {
    return {
      rows: [],
      errors: ['Spreadsheet must include a "name" column.'],
      warnings,
    };
  }

  const rows: CsvLeadRow[] = [];

  for (let i = 1; i < normalizedRows.length; i++) {
    const cells = normalizedRows[i];
    if (cells.every((c) => !c)) continue;

    const row: CsvLeadRow = { name: "" };
    const extraParts: string[] = [];

    columnMap.forEach((key, colIdx) => {
      const value = cells[colIdx]?.trim();
      if (!value) return;

      if (key) {
        row[key] = value;
      } else {
        const label = extraColumnLabels[colIdx] || `column ${colIdx + 1}`;
        extraParts.push(`${label}: ${value}`);
      }
    });

    if (!row.name) {
      errors.push(`Row ${i + 1}: missing name — skipped.`);
      continue;
    }

    if (extraParts.length > 0) {
      appendNote(row, extraParts.join("\n"));
    }

    rows.push(row);
  }

  if (rows.length === 0 && errors.length === 0) {
    errors.push("No valid lead rows found.");
  }

  return { rows, errors, warnings };
}

export function parseLeadsCsv(text: string): CsvParseResult {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return {
      rows: [],
      errors: ["CSV needs a header row and at least one lead."],
      warnings: [],
    };
  }

  const grid = lines.map(parseCsvLine);
  return parseLeadRowsFromGrid(grid);
}