"use client";

import { useMemo, useState } from "react";
import EmptyState from "@/components/ui/EmptyState";
import SectionCard from "@/components/ui/SectionCard";
import StatBadge from "@/components/ui/StatBadge";
import type { TravelAlert, TravelFilterTab } from "@/frontend/lib/travelAlertsMock";
import { pickFeaturedAlert, travelStats } from "@/frontend/lib/travelAlertsMock";
import FeaturedTravelAlert from "./FeaturedTravelAlert";
import TravelAlertCard from "./TravelAlertCard";
import TravelFilterToolbar from "./TravelFilterToolbar";

function sortAlerts(list: TravelAlert[], sortBy: "recent" | "priority"): TravelAlert[] {
  const copy = [...list];
  if (sortBy === "recent") {
    copy.sort((a, b) => a.sortIndex - b.sortIndex);
    return copy;
  }
  copy.sort((a, b) => {
    const score = (x: TravelAlert) => {
      if (x.category === "shuttle" && x.shuttleStatus === "delayed") return 0;
      if (x.priority === "high") return 1;
      return 2;
    };
    const d = score(a) - score(b);
    if (d !== 0) return d;
    return a.sortIndex - b.sortIndex;
  });
  return copy;
}

function filterAlerts(alerts: TravelAlert[], tab: TravelFilterTab, search: string): TravelAlert[] {
  const q = search.trim().toLowerCase();
  return alerts.filter((a) => {
    if (tab === "shuttle" && a.category !== "shuttle") return false;
    if (tab === "advisory" && a.category === "shuttle") return false;
    if (tab === "delayed" && !(a.category === "shuttle" && a.shuttleStatus === "delayed")) return false;
    if (!q) return true;
    const hay = `${a.title} ${a.message} ${a.route ?? ""} ${a.location ?? ""}`.toLowerCase();
    return hay.includes(q);
  });
}

type TravelAlertsClientProps = {
  initialAlerts: TravelAlert[];
};

export default function TravelAlertsClient({ initialAlerts }: TravelAlertsClientProps) {
  const [activeTab, setActiveTab] = useState<TravelFilterTab>("all");
  const [searchValue, setSearchValue] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "priority">("recent");

  const stats = useMemo(() => travelStats(initialAlerts), [initialAlerts]);

  const featured = useMemo(() => pickFeaturedAlert(initialAlerts), [initialAlerts]);

  const filteredList = useMemo(
    () => filterAlerts(initialAlerts, activeTab, searchValue),
    [initialAlerts, activeTab, searchValue]
  );

  const listAlerts = useMemo(() => {
    const withoutFeatured = featured ? filteredList.filter((a) => a.id !== featured.id) : filteredList;
    return sortAlerts(withoutFeatured, sortBy);
  }, [filteredList, featured, sortBy]);

  const isEmpty = listAlerts.length === 0;
  const hasNoData = initialAlerts.length === 0;

  return (
    <div className="travel-dashboard">
      <TravelFilterToolbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      {featured && !hasNoData ? <FeaturedTravelAlert alert={featured} /> : null}

      <SectionCard hover className="travel-section-card">
        <p className="page-label travel-section-eyebrow">Snapshot</p>
        <div className="stats-grid travel-stats-grid">
          <StatBadge label="Active Alerts" value={stats.activeAlerts} />
          <StatBadge label="On-Time Shuttles" value={stats.onTimeShuttles} />
          <StatBadge label="Delayed Routes" value={stats.delayedRoutes} />
          <StatBadge label="Campus Advisories" value={stats.campusAdvisories} />
        </div>
      </SectionCard>

      <section className="travel-list-section" aria-labelledby="travel-list-heading">
        <div className="travel-list-section__head">
          <p className="page-label travel-section-eyebrow">All alerts</p>
          <h2 id="travel-list-heading" className="travel-list-section__title">
            Shuttle & campus updates
          </h2>
        </div>

        {hasNoData ? (
          <SectionCard>
            <EmptyState
              icon="◆"
              title="No travel alerts right now"
              text="When shuttles or campus mobility updates are available, they will appear here."
            />
          </SectionCard>
        ) : isEmpty ? (
          <SectionCard>
            <EmptyState
              icon="◆"
              title="No alerts match your filters"
              text="Try another category, clear search, or view All to see every active alert."
            />
          </SectionCard>
        ) : (
          <div className="travel-alert-list">
            {listAlerts.map((alert) => (
              <TravelAlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
