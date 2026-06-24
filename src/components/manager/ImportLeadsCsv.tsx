"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { importLeadsFromCsv } from "@/lib/leads/actions";
import { downloadCsvTemplate } from "@/lib/leads/csv-template";
import { parseLeadsFile } from "@/lib/leads/spreadsheet";

export function ImportLeadsCsv() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [result, setResult] = useState<{
    imported: number;
    skipped: number;
    errors: string[];
  } | null>(null);

  function openUpload() {
    setGuideOpen(true);
    setError(null);
    setResult(null);
    setWarnings([]);
    fileRef.current?.click();
  }

  async function handleFile(file: File) {
    setError(null);
    setResult(null);
    setWarnings([]);
    setLoading(true);

    const parsed = await parseLeadsFile(file);

    if (parsed.warnings.length > 0) {
      setWarnings(parsed.warnings);
    }

    if (parsed.rows.length === 0) {
      setError(parsed.errors.join(" ") || "Could not parse spreadsheet.");
      setLoading(false);
      return;
    }

    const importResult = await importLeadsFromCsv(parsed.rows);

    if (!importResult.success) {
      setError(importResult.error);
      setLoading(false);
      return;
    }

    setResult({
      ...importResult.result,
      errors: [...parsed.errors, ...importResult.result.errors],
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <section className="rounded-xl border border-field-line/20 bg-field-dark/40 p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-field-gold mb-1">
        Import Backlog
      </h2>
      <p className="text-xs text-field-cream/45 mb-4 leading-relaxed">
        Manager only. Upload CSV, Excel (.xlsx), or Apple Numbers (.numbers) —
        leads land{" "}
        <span className="font-medium text-field-cream/70">unclaimed</span> in
        the Lead Box for reps to claim.
      </p>

      <button
        type="button"
        onClick={() => setGuideOpen((o) => !o)}
        className="text-xs font-medium text-field-gold hover:text-field-cream transition mb-3"
      >
        {guideOpen ? "Hide formatting guide ▲" : "How to set up your spreadsheet ▼"}
      </button>

      {guideOpen && (
        <div className="rounded-lg border border-field-gold/25 bg-field-turf/10 p-4 mb-4 space-y-4 text-xs text-field-cream/70 leading-relaxed">
          <div>
            <p className="font-semibold text-field-cream text-sm mb-2">
              Step 1 — Prepare your file
            </p>
            <p className="mb-2">
              Upload the file directly — no need to export first if you already
              have Excel or Numbers:
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li>
                <span className="font-medium text-field-cream/90">Excel</span> —
                .xlsx (recommended) or legacy .xls
              </li>
              <li>
                <span className="font-medium text-field-cream/90">
                  Apple Numbers
                </span>{" "}
                — .numbers
              </li>
              <li>
                <span className="font-medium text-field-cream/90">
                  Google Sheets / CSV
                </span>{" "}
                — File → Download → CSV
              </li>
            </ul>
            <p className="mt-2">
              Row 1 must be column headers; each row after that is one lead. If
              your workbook has multiple sheets, only the{" "}
              <span className="text-field-cream/90">first sheet</span> is
              imported.
            </p>
          </div>

          <div>
            <p className="font-semibold text-field-cream text-sm mb-2">
              Step 2 — Required column
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li>
                <span className="font-mono text-field-gold/90">name</span> —
                customer name (required on every row)
              </li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-field-cream text-sm mb-2">
              Step 3 — Optional columns
            </p>
            <ul className="list-disc pl-4 space-y-1 font-mono text-[11px] text-field-cream/60">
              <li>phone, email</li>
              <li>street, city, state, zip</li>
              <li>
                source — Phone Call, Facebook, Referral, etc. (blank defaults
                to Phone Call)
              </li>
              <li>
                notes — anything that does not fit above (roof type, timeline,
                who referred them, old CRM comments)
              </li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-field-cream text-sm mb-2">
              Step 4 — Extra columns become notes
            </p>
            <p>
              If your sheet has columns we do not recognize (e.g.{" "}
              <span className="font-mono">roof_type</span>,{" "}
              <span className="font-mono">estimator</span>), those values are
              automatically appended to the lead&apos;s notes so nothing is lost.
            </p>
          </div>

          <div>
            <p className="font-semibold text-field-cream text-sm mb-2">
              Example header row
            </p>
            <pre className="rounded bg-field-dark/50 border border-field-line/15 p-2 font-mono text-[10px] text-field-cream/55 overflow-x-auto whitespace-pre">
              name,phone,email,street,city,state,zip,source,notes
            </pre>
          </div>

          <button
            type="button"
            onClick={downloadCsvTemplate}
            className="text-xs font-medium text-field-gold hover:underline"
          >
            Download blank template CSV →
          </button>
        </div>
      )}

      {warnings.length > 0 && !result && (
        <div className="rounded-lg bg-field-gold/10 border border-field-gold/25 px-3 py-2 text-xs text-field-cream/70 mb-3">
          {warnings.map((w) => (
            <p key={w}>{w}</p>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-950/50 border border-red-800/50 px-3 py-2 text-sm text-red-300 mb-3">
          {error}
        </div>
      )}

      {result && (
        <div className="rounded-lg bg-field-gold/10 border border-field-gold/30 px-3 py-2 text-sm text-field-cream mb-3 space-y-1">
          <p>
            Imported <span className="font-semibold">{result.imported}</span>{" "}
            lead{result.imported === 1 ? "" : "s"} to the pool.
            {result.skipped > 0 && ` ${result.skipped} skipped.`}
          </p>
          {result.errors.length > 0 && (
            <ul className="text-xs text-field-cream/60 list-disc pl-4 max-h-32 overflow-y-auto">
              {result.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept=".csv,.xlsx,.xls,.xlsm,.numbers,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />

      <button
        type="button"
        disabled={loading}
        onClick={openUpload}
        className="rounded-lg bg-field-gold px-4 py-2.5 text-sm font-semibold text-field-dark hover:bg-field-gold/90 transition disabled:opacity-50"
      >
        {loading ? "Importing…" : "Choose Spreadsheet"}
      </button>
      <p className="text-[10px] text-field-cream/35 mt-2">
        CSV, Excel, or Numbers. Opens the guide and file picker. Notes and extra
        columns are saved on each lead.
      </p>
    </section>
  );
}