import type { Dispatch, SetStateAction } from "react";
import { InputField, SelectField } from "@/components/ui/Fields";
import type { NotificationFilter } from "./types";

type NotificationFiltersProps = {
  activeFilter: NotificationFilter;
  onFilterChange: Dispatch<SetStateAction<NotificationFilter>>;
  searchValue: string;
  onSearchChange: Dispatch<SetStateAction<string>>;
  sortBy: "newest" | "priority" | "unread";
  onSortChange: Dispatch<SetStateAction<"newest" | "priority" | "unread">>;
};

const filters: Array<{ key: NotificationFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "seats", label: "Seats" },
  { key: "registration", label: "Registration" },
  { key: "travel", label: "Travel" },
  { key: "planning", label: "AI / Planning alerts" },
];

export default function NotificationFilters({
  activeFilter,
  onFilterChange,
  searchValue,
  onSearchChange,
  sortBy,
  onSortChange,
}: NotificationFiltersProps) {
  return (
    <div className="controls-row">
      {filters.map((filter) => (
        <button
          type="button"
          key={filter.key}
          className={`pill-tab${activeFilter === filter.key ? " pill-tab--active" : ""}`}
          onClick={() => onFilterChange(filter.key)}
        >
          {filter.label}
        </button>
      ))}
      <InputField
        className="input-search"
        placeholder="Search notifications..."
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <SelectField value={sortBy} onChange={(e) => onSortChange(e.target.value as "newest" | "priority" | "unread")}>
        <option value="newest">Newest</option>
        <option value="priority">Priority</option>
        <option value="unread">Unread First</option>
      </SelectField>
    </div>
  );
}
