import { parseLeadRowsFromGrid, parseLeadsCsv, type CsvParseResult } from "./csv";

const SPREADSHEET_EXTENSIONS = [".xlsx", ".xlsm", ".xls", ".numbers", ".ods"];

type TabularFn = (
  file: File,
  options?: Record<string, unknown>
) => Promise<{
  worksheets: Array<{ worksheetName?: string; data: unknown[][] }>;
}>;

let tabularjsPromise: Promise<TabularFn> | null = null;

async function loadTabularjs(): Promise<TabularFn> {
  if (!tabularjsPromise) {
    tabularjsPromise = import("tabularjs").then((mod) => {
      const fn =
        (mod as { default?: TabularFn }).default ??
        (mod as unknown as TabularFn);
      if (typeof fn !== "function") {
        throw new Error("Spreadsheet parser failed to load.");
      }
      return fn;
    });
  }
  return tabularjsPromise;
}

export type LeadImportFileKind = "csv" | "spreadsheet" | "unsupported";

export function getLeadImportFileKind(file: File): LeadImportFileKind {
  const name = file.name.toLowerCase();

  if (name.endsWith(".csv")) return "csv";
  if (SPREADSHEET_EXTENSIONS.some((ext) => name.endsWith(ext))) {
    return "spreadsheet";
  }

  const mime = file.type.toLowerCase();
  if (mime.includes("csv") || mime === "text/plain") return "csv";
  if (
    mime.includes("spreadsheet") ||
    mime.includes("excel") ||
    mime.includes("numbers") ||
    mime.includes("opendocument")
  ) {
    return "spreadsheet";
  }

  return "unsupported";
}

export async function parseLeadsFile(file: File): Promise<CsvParseResult> {
  const kind = getLeadImportFileKind(file);

  if (kind === "csv") {
    const text = await file.text();
    return parseLeadsCsv(text);
  }

  if (kind === "spreadsheet") {
    try {
      const tabularjs = await loadTabularjs();
      const result = await tabularjs(file);
      const sheet = result.worksheets[0];

      if (!sheet?.data?.length) {
        return {
          rows: [],
          errors: ["Could not read any data from the spreadsheet."],
          warnings: [],
        };
      }

      const parsed = parseLeadRowsFromGrid(sheet.data);

      if (result.worksheets.length > 1) {
        const sheetName = sheet.worksheetName ?? "Sheet 1";
        parsed.warnings.unshift(
          `Using "${sheetName}" (first sheet). Other sheets were ignored.`
        );
      }

      return parsed;
    } catch {
      return {
        rows: [],
        errors: [
          "Could not read that file. Try exporting from Numbers or Excel as .xlsx or .csv.",
        ],
        warnings: [],
      };
    }
  }

  return {
    rows: [],
    errors: [
      "Unsupported file type. Upload CSV, Excel (.xlsx), or Apple Numbers (.numbers).",
    ],
    warnings: [],
  };
}