import { parseImportStage } from "@/lib/leads/profile";
import type { LeadStage } from "@/types/database";

export interface CsvLeadRow {
  firstName?: string;
  lastName?: string;
  companyName?: string;
  billingStreetAddress?: string;
  billingCity?: string;
  billingState?: string;
  billingZip?: string;
  serviceStreetAddress?: string;
  serviceCity?: string;
  serviceState?: string;
  serviceZip?: string;
  cellPhone?: string;
  secondaryPhone?: string;
  email?: string;
  stage?: LeadStage;
  notes?: string;
  source?: string;
  existingRoofType?: string;
  roofTypeRequested?: string;
  remodelOrNewConstruction?: string;
  homeownerOrContractor?: string;
}

export interface CsvParseResult {
  rows: CsvLeadRow[];
  errors: string[];
  warnings: string[];
}

const HEADER_ALIASES: Record<string, keyof CsvLeadRow> = {
  "first name": "firstName",
  firstname: "firstName",
  first: "firstName",
  "last name": "lastName",
  lastname: "lastName",
  last: "lastName",
  "company name": "companyName",
  company: "companyName",
  "billing address": "billingStreetAddress",
  "billing street": "billingStreetAddress",
  "billing street address": "billingStreetAddress",
  "billing city": "billingCity",
  "billing state": "billingState",
  "billing zip": "billingZip",
  "billing zip code": "billingZip",
  "service address": "serviceStreetAddress",
  "service street": "serviceStreetAddress",
  "service street address": "serviceStreetAddress",
  "service city": "serviceCity",
  "service state": "serviceState",
  "service zip": "serviceZip",
  "service zip code": "serviceZip",
  "cell phone": "cellPhone",
  cell: "cellPhone",
  mobile: "cellPhone",
  "secondary number": "secondaryPhone",
  "secondary phone": "secondaryPhone",
  alt_phone: "secondaryPhone",
  email: "email",
  "e-mail": "email",
  stage: "stage",
  pipeline_stage: "stage",
  notes: "notes",
  note: "notes",
  comments: "notes",
  source: "source",
  "lead source": "source",
  "existing roof type": "existingRoofType",
  existing_roof: "existingRoofType",
  "roof type requested": "roofTypeRequested",
  requested_roof: "roofTypeRequested",
  "remodel or new construction": "remodelOrNewConstruction",
  remodel_or_new: "remodelOrNewConstruction",
  "homeowner or contractor": "homeownerOrContractor",
  customer_type: "homeownerOrContractor",
  // Legacy single-field headers (still supported)
  name: "firstName",
  "full name": "firstName",
  "customer name": "firstName",
  phone: "cellPhone",
  "phone number": "cellPhone",
  street: "serviceStreetAddress",
  "street address": "serviceStreetAddress",
  address: "serviceStreetAddress",
  city: "serviceCity",
  state: "serviceState",
  zip: "serviceZip",
  "zip code": "serviceZip",
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

function splitLegacyName(full: string): { firstName: string; lastName: string } {
  const trimmed = full.trim();
  const space = trimmed.indexOf(" ");
  if (space === -1) return { firstName: trimmed, lastName: "" };
  return {
    firstName: trimmed.slice(0, space),
    lastName: trimmed.slice(space + 1).trim(),
  };
}

function hasIdentity(row: CsvLeadRow): boolean {
  return !!(
    row.firstName?.trim() ||
    row.lastName?.trim() ||
    row.companyName?.trim()
  );
}

function applyParsedValue(
  row: CsvLeadRow,
  key: keyof CsvLeadRow,
  value: string,
  rowNum: number,
  warnings: string[]
) {
  if (key === "stage") {
    const stage = parseImportStage(value);
    if (stage) {
      row.stage = stage;
    } else {
      warnings.push(
        `Row ${rowNum}: unrecognized stage "${value}" — defaulted to Lead Captured.`
      );
    }
    return;
  }
  row[key] = value;
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

  const hasIdentityColumn = columnMap.some(
    (k) => k === "firstName" || k === "lastName" || k === "companyName"
  );

  if (!hasIdentityColumn) {
    return {
      rows: [],
      errors: [
        "Spreadsheet needs First Name, Last Name, or Company Name (legacy Name column also works).",
      ],
      warnings: [],
    };
  }

  const unmappedCount = extraColumnLabels.filter(Boolean).length;
  if (unmappedCount > 0) {
    warnings.push(
      `${unmappedCount} unrecognized column${unmappedCount === 1 ? "" : "s"} will be appended to notes on each lead.`
    );
  }

  const rows: CsvLeadRow[] = [];

  for (let i = 1; i < normalizedRows.length; i++) {
    const cells = normalizedRows[i];
    if (cells.every((c) => !c)) continue;

    const row: CsvLeadRow = {};
    const extraParts: string[] = [];
    const rowNum = i + 1;

    columnMap.forEach((key, colIdx) => {
      const value = cells[colIdx]?.trim();
      if (!value) return;

      if (key) {
        applyParsedValue(row, key, value, rowNum, warnings);
      } else {
        const label = extraColumnLabels[colIdx] || `column ${colIdx + 1}`;
        extraParts.push(`${label}: ${value}`);
      }
    });

    if (row.firstName && !row.lastName && row.firstName.includes(" ")) {
      const split = splitLegacyName(row.firstName);
      row.firstName = split.firstName;
      row.lastName = row.lastName || split.lastName;
    }

    if (!hasIdentity(row)) {
      errors.push(`Row ${rowNum}: missing name or company — skipped.`);
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

export function csvRowToProfileInput(row: CsvLeadRow) {
  return {
    firstName: row.firstName,
    lastName: row.lastName,
    companyName: row.companyName,
    billing: {
      streetAddress: row.billingStreetAddress,
      city: row.billingCity,
      state: row.billingState,
      zip: row.billingZip,
    },
    service: {
      streetAddress: row.serviceStreetAddress,
      city: row.serviceCity,
      state: row.serviceState,
      zip: row.serviceZip,
    },
    cellPhone: row.cellPhone,
    secondaryPhone: row.secondaryPhone,
    email: row.email,
    stage: row.stage,
    source: row.source,
    existingRoofType: row.existingRoofType,
    roofTypeRequested: row.roofTypeRequested,
    remodelOrNewConstruction: row.remodelOrNewConstruction,
    homeownerOrContractor: row.homeownerOrContractor,
    notes: row.notes,
  };
}