"use client";

import { useMemo, useState } from "react";
import {
  DEFAULT_LEAD_SEARCH_FILTERS,
  extractUniqueCities,
  extractUniqueOwners,
  extractUniqueSources,
  hasActiveFilters,
  type LeadSearchFilters,
} from "@/lib/leads/search";
import { PIPELINE_STAGES } from "@/lib/leads/constants";
import type { LeadWithOwner } from "@/lib/leads/types";

interface LeadSearchBarProps {
  leads: LeadWithOwner[];
  filters: LeadSearchFilters;
  onFiltersChange: (filters: LeadSearchFilters) => void;
  filteredCount: number;
  isManager: boolean;
}

const selectClass =
  "w-full h-9 rounded-md border border-field-line/30 bg-field-turf/10 px-2.5 py-1.5 text-xs text-field-cream focus:outline-none focus:ring-2 focus:ring-field-gold/40 cursor-pointer";

function FilterIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
    </svg>
  );
}

export function LeadSearchBar({
  leads,
  filters,
  onFiltersChange,
  filteredCount,
  isManager,
}: LeadSearchBarProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);

  const sources = useMemo(() => extractUniqueSources(leads), [leads]);
  const cities = useMemo(() => extractUniqueCities(leads), [leads]);
  const owners = useMemo(() => extractUniqueOwners(leads), [leads]);

  const active = hasActiveFilters(filters);
  const total = leads.length;

  function update<K extends keyof LeadSearchFilters>(
    key: K,
    value: LeadSearchFilters[K]
  ) {
    onFiltersChange({ ...filters, [key]: value });
  }

  function clearFilters() {
    onFiltersChange(DEFAULT_LEAD_SEARCH_FILTERS);
    setFiltersOpen(false);
  }

  const countLabel =
    filteredCount === total
      ? `${total} lead${total === 1 ? "" : "s"}`
      : `${filteredCount} of ${total}`;

  const filterFields = (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 pt-2">
      <div>
        <label
          htmlFor="lead-filter-stage"
          className="text-[10px] uppercase tracking-wide text-field-cream/40 mb-0.5 block"
        >
          Stage
        </label>
        <select
          id="lead-filter-stage"
          value={filters.stage}
          onChange={(e) => update("stage", e.target.value as LeadSearchFilters["stage"])}
          className={selectClass}
        >
          <option value="all">All stages</option>
          {PIPELINE_STAGES.map((stage) => (
            <option key={stage.key} value={stage.key}>
              {stage.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="lead-filter-ownership"
          className="text-[10px] uppercase tracking-wide text-field-cream/40 mb-0.5 block"
        >
          Ownership
        </label>
        <select
          id="lead-filter-ownership"
          value={filters.ownership}
          onChange={(e) => update("ownership", e.target.value)}
          className={selectClass}
        >
          <option value="all">All leads</option>
          <option value="mine">My leads</option>
          <option value="unclaimed">Unclaimed</option>
          {isManager &&
            owners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.name}
              </option>
            ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="lead-filter-source"
          className="text-[10px] uppercase tracking-wide text-field-cream/40 mb-0.5 block"
        >
          Source
        </label>
        <select
          id="lead-filter-source"
          value={filters.source}
          onChange={(e) => update("source", e.target.value)}
          className={selectClass}
        >
          <option value="all">All sources</option>
          {sources.map((source) => (
            <option key={source} value={source}>
              {source}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="lead-filter-city"
          className="text-[10px] uppercase tracking-wide text-field-cream/40 mb-0.5 block"
        >
          City
        </label>
        <select
          id="lead-filter-city"
          value={filters.city}
          onChange={(e) => update("city", e.target.value)}
          className={selectClass}
        >
          <option value="all">All cities</option>
          {cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  return (
    <div className="bg-field-dark/30 border-b border-field-line/20 px-4 py-2">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <label htmlFor="lead-search-query" className="sr-only">
              Search leads
            </label>
            <input
              id="lead-search-query"
              type="search"
              value={filters.query}
              onChange={(e) => update("query", e.target.value)}
              placeholder="Search leads…"
              className="w-full h-9 rounded-md border border-field-line/30 bg-field-turf/10 pl-8 pr-3 text-xs text-field-cream placeholder:text-field-cream/35 focus:outline-none focus:ring-2 focus:ring-field-gold/40"
            />
            <span
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-field-cream/35"
              aria-hidden
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </span>
          </div>

          <button
            type="button"
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
            aria-label={active ? "Filters active — toggle panel" : "Toggle filters"}
            className={`relative shrink-0 h-9 w-9 flex items-center justify-center rounded-md border transition ${
              filtersOpen || active
                ? "border-field-gold/50 bg-field-gold/10 text-field-gold"
                : "border-field-line/30 bg-field-turf/10 text-field-cream/60 hover:border-field-line/40 hover:text-field-cream/80"
            }`}
          >
            <FilterIcon />
            {active && !filtersOpen && (
              <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-field-gold" />
            )}
          </button>

          {active && (
            <button
              type="button"
              onClick={clearFilters}
              className="shrink-0 h-9 px-2.5 rounded-md text-xs text-field-cream/50 hover:text-field-cream transition"
            >
              Clear
            </button>
          )}

          <span className="hidden sm:inline text-[10px] text-field-cream/40 tabular-nums shrink-0">
            {countLabel}
          </span>
        </div>

        {filtersOpen && (
          <div className="border-t border-field-line/15 mt-2">
            {filterFields}
            {active && (
              <button
                type="button"
                onClick={clearFilters}
                className="sm:hidden mt-2 text-xs text-field-cream/50 hover:text-field-cream transition"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}

        <p className="sm:hidden text-[10px] text-field-cream/40 mt-1 tabular-nums">
          {countLabel}
        </p>
      </div>
    </div>
  );
}