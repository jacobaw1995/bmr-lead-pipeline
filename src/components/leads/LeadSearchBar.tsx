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
  "w-full min-h-[48px] rounded-lg border border-field-line/30 bg-field-turf/10 px-3 py-2 text-sm text-field-cream focus:outline-none focus:ring-2 focus:ring-field-gold/40 cursor-pointer";

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
  }

  const filterFields = (
    <>
      <div>
        <label
          htmlFor="lead-filter-stage"
          className="text-[10px] uppercase tracking-wide text-field-cream/40 mb-1 block"
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
          className="text-[10px] uppercase tracking-wide text-field-cream/40 mb-1 block"
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
          className="text-[10px] uppercase tracking-wide text-field-cream/40 mb-1 block"
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
          className="text-[10px] uppercase tracking-wide text-field-cream/40 mb-1 block"
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
    </>
  );

  return (
    <div className="bg-field-dark/30 border-b border-field-line/20 px-4 py-3">
      <div className="max-w-7xl mx-auto space-y-3">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="relative flex-1">
            <label htmlFor="lead-search-query" className="sr-only">
              Search leads
            </label>
            <input
              id="lead-search-query"
              type="search"
              value={filters.query}
              onChange={(e) => update("query", e.target.value)}
              placeholder="Search name, phone, email, address, source…"
              className="w-full min-h-[48px] rounded-lg border border-field-line/30 bg-field-turf/10 pl-10 pr-3 py-2 text-sm text-field-cream placeholder:text-field-cream/35 focus:outline-none focus:ring-2 focus:ring-field-gold/40"
            />
            <span
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-field-cream/35"
              aria-hidden
            >
              <svg
                width="18"
                height="18"
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
            className="sm:hidden min-h-[48px] rounded-lg border border-field-line/30 bg-field-turf/10 px-4 text-sm font-medium text-field-cream/80 hover:border-field-gold/40 transition"
            aria-expanded={filtersOpen}
          >
            Filters{active ? " · On" : ""}
          </button>

          {active && (
            <button
              type="button"
              onClick={clearFilters}
              className="min-h-[48px] rounded-lg border border-field-line/25 px-4 text-sm text-field-cream/60 hover:text-field-cream hover:border-field-line/40 transition shrink-0"
            >
              Clear
            </button>
          )}
        </div>

        <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {filterFields}
        </div>

        {filtersOpen && (
          <div className="sm:hidden grid grid-cols-1 gap-3 pb-1">{filterFields}</div>
        )}

        <p className="text-xs text-field-cream/45">
          {filteredCount === total
            ? `${total} lead${total === 1 ? "" : "s"} on the field`
            : `${filteredCount} of ${total} lead${total === 1 ? "" : "s"}`}
        </p>
      </div>
    </div>
  );
}