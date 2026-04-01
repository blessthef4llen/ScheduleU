"use client";

import type { Dispatch, SetStateAction } from "react";
import { InputField, SelectField } from "@/components/ui/Fields";
import type { TravelFilterTab } from "@/lib/travelAlertsMock";

const TABS: Array<{ key: TravelFilterTab; label: string }> = [
  { key: "all", label: "All" },
  { key: "shuttle", label: "Shuttles" },
  { key: "advisory", label: "Advisories" },
  { key: "delayed", label: "Delayed" },
];

type TravelFilterToolbarProps = {
  activeTab: TravelFilterTab;
  onTabChange: Dispatch<SetStateAction<TravelFilterTab>>;
  searchValue: string;
  onSearchChange: Dispatch<SetStateAction<string>>;
  sortBy: "recent" | "priority";
  onSortChange: Dispatch<SetStateAction<"recent" | "priority">>;
};

export default function TravelFilterToolbar({
  activeTab,
  onTabChange,
  searchValue,
  onSearchChange,
  sortBy,
  onSortChange,
}: TravelFilterToolbarProps) {
  return (
    <div className="travel-toolbar">
      <div className="travel-toolbar__pills controls-row">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`pill-tab${activeTab === tab.key ? " pill-tab--active" : ""}`}
            onClick={() => onTabChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="travel-toolbar__fields controls-row">
        <InputField
          className="field input-search travel-toolbar__search"
          placeholder="Search routes, locations, or alerts…"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search travel alerts"
        />
        <SelectField
          className="field travel-toolbar__sort"
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as "recent" | "priority")}
          aria-label="Sort alerts"
        >
          <option value="recent">Most recent</option>
          <option value="priority">Urgency</option>
        </SelectField>
      </div>
    </div>
  );
}
