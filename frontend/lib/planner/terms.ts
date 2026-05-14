"use client";
// Shared term helpers for Schedule Builder and Interactive Planner.

import { loadStoredJson, saveStoredJson } from "@/lib/browserStorage";

export type PlannerTermOption = {
  label: string;
  table: string;
  disabled?: boolean;
};

export const PLANNER_TERM_OPTIONS = [
  { label: "Spring 2026", table: "spring_2026" },
  { label: "Summer 2026", table: "summer_2026" },
  { label: "Fall 2026", table: "fall_2026", disabled: true },
  { label: "Winter 2027", table: "winter_2027", disabled: true },
] as const satisfies readonly PlannerTermOption[];

export const DEFAULT_PLANNER_TERM_TABLE = "spring_2026";
export const DEFAULT_PLANNER_TERM = "Spring 2026";
export const SELECTED_TERM_TABLE_KEY = "scheduleu.selectedTermTable";
export const TERM_SELECTION_EVENT = "scheduleu:term-selection";

const ENABLED_TERM_TABLES: Set<string> = new Set(
  PLANNER_TERM_OPTIONS.filter((option) => !("disabled" in option && option.disabled)).map((option) => option.table)
);

export function tableToTermLabel(table: string): string {
  const matched = PLANNER_TERM_OPTIONS.find((option) => option.table === table);
  if (matched) return matched.label;

  const normalized = table.trim().toLowerCase();
  const match = normalized.match(/^([a-z]+)_(\d{4})$/);
  if (!match) return table;

  const seasonMap: Record<string, string> = {
    spring: "Spring",
    summer: "Summer",
    fall: "Fall",
    winter: "Winter",
  };

  return `${seasonMap[match[1]] ?? match[1]} ${match[2]}`;
}

export function termTableForTerm(term: string): string {
  const normalized = term.trim().toLowerCase().replace(/\s+/g, " ");
  const directMatch = PLANNER_TERM_OPTIONS.find((option) => option.label.toLowerCase() === normalized);
  if (directMatch) return directMatch.table;

  const tableLike = normalized.replaceAll(" ", "_");
  const tableMatch = PLANNER_TERM_OPTIONS.find((option) => option.table === tableLike);
  return tableMatch?.table ?? DEFAULT_PLANNER_TERM_TABLE;
}

export function normalizeTermTable(termTableOrLabel?: string | null): string {
  if (!termTableOrLabel) return DEFAULT_PLANNER_TERM_TABLE;

  const table = termTableForTerm(termTableOrLabel);
  if (ENABLED_TERM_TABLES.has(table)) return table;

  return DEFAULT_PLANNER_TERM_TABLE;
}

export function readTermTableFromSearch(search: string): string | null {
  const params = new URLSearchParams(search);
  const rawTerm = params.get("term") ?? params.get("term_table");
  if (!rawTerm) return null;

  return normalizeTermTable(rawTerm);
}

export function loadSelectedTermTable(): string {
  return normalizeTermTable(loadStoredJson<string>(SELECTED_TERM_TABLE_KEY, DEFAULT_PLANNER_TERM_TABLE));
}

export function getInitialSelectedTermTable(): string {
  if (typeof window !== "undefined") {
    const urlTerm = readTermTableFromSearch(window.location.search);
    if (urlTerm) return urlTerm;
  }

  return loadSelectedTermTable();
}

export function saveSelectedTermTable(termTableOrLabel: string) {
  const termTable = normalizeTermTable(termTableOrLabel);
  saveStoredJson(SELECTED_TERM_TABLE_KEY, termTable);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(TERM_SELECTION_EVENT, {
        detail: {
          termTable,
          term: tableToTermLabel(termTable),
        },
      })
    );
  }
}

export function plannerHrefForTerm(termTableOrLabel: string) {
  return `/planner?term=${encodeURIComponent(normalizeTermTable(termTableOrLabel))}`;
}

export function builderHrefForTerm(termTableOrLabel: string) {
  return `/schedule-builder?term=${encodeURIComponent(normalizeTermTable(termTableOrLabel))}`;
}
