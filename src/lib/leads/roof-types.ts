/** Standard roof material options — supports multi-select for mixed roofs. */
export const ROOF_TYPE_OPTIONS = [
  { value: "asphalt_shingle", label: "Asphalt Shingle" },
  { value: "metal_standing_seam", label: "Metal — Standing Seam" },
  { value: "metal_exposed_fastener", label: "Metal — Exposed Fastener" },
  { value: "rubber_epdm", label: "Rubber / EPDM" },
  { value: "tpo_membrane", label: "TPO / Membrane" },
  { value: "slate", label: "Slate" },
  { value: "tile", label: "Tile" },
  { value: "wood_shake", label: "Wood Shake" },
  { value: "flat_built_up", label: "Built-Up / Tar & Gravel" },
] as const;

export type RoofTypeValue = (typeof ROOF_TYPE_OPTIONS)[number]["value"];

const VALUE_TO_LABEL = Object.fromEntries(
  ROOF_TYPE_OPTIONS.map((o) => [o.value, o.label])
) as Record<string, string>;

/** Stored in DB as comma-separated value keys, e.g. "asphalt_shingle,rubber_epdm" */
export function parseRoofTypes(stored: string | null | undefined): RoofTypeValue[] {
  if (!stored?.trim()) return [];
  return stored
    .split(",")
    .map((s) => s.trim())
    .filter((v): v is RoofTypeValue => v in VALUE_TO_LABEL);
}

export function serializeRoofTypes(types: RoofTypeValue[]): string | null {
  const unique = Array.from(
    new Set(types.filter((t) => t in VALUE_TO_LABEL))
  );
  return unique.length > 0 ? unique.join(",") : null;
}

/** True when the field has a dropdown selection or legacy free-text value. */
export function hasRoofTypeValue(stored: string | null | undefined): boolean {
  if (!stored?.trim()) return false;
  return parseRoofTypes(stored).length > 0 || Boolean(stored.trim());
}

export function formatRoofTypes(stored: string | null | undefined): string | null {
  const types = parseRoofTypes(stored);
  if (types.length === 0) {
    const legacy = stored?.trim();
    return legacy || null;
  }
  return types.map((t) => VALUE_TO_LABEL[t] ?? t).join(" + ");
}

export function roofTypeLabel(value: string): string {
  return VALUE_TO_LABEL[value] ?? value;
}