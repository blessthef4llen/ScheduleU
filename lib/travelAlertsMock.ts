import type { TravelAlert } from "@/lib/types/travelAlert";

export type { TravelCategory, TravelShuttleStatus, TravelPriority, TravelAlert, TravelFilterTab } from "@/lib/types/travelAlert";

export const TRAVEL_MOCK_ALERTS: TravelAlert[] = [
  {
    id: "1",
    category: "shuttle",
    title: "Beachside Shuttle delayed",
    message: "Beachside Shuttle is delayed by 4 mins due to traffic near Bellflower Blvd.",
    route: "Beachside Lot → Central Quad",
    location: "North route",
    shuttleStatus: "delayed",
    updatedLabel: "Updated 2 min ago",
    priority: "high",
    sortIndex: 0,
  },
  {
    id: "2",
    category: "shuttle",
    title: "North Campus line on schedule",
    message: "Shuttle arriving in 10 minutes; all stops operating normally.",
    route: "North Campus → South Campus",
    location: "Campus loop",
    shuttleStatus: "on-time",
    updatedLabel: "Updated 5 min ago",
    priority: "normal",
    sortIndex: 1,
  },
  {
    id: "3",
    category: "shuttle",
    title: "Library / Engineering loop",
    message: "Expect a longer wait at the Library stop; vehicle running behind one rotation.",
    route: "Library → Engineering Building",
    location: "East campus",
    shuttleStatus: "delayed",
    updatedLabel: "Updated 8 min ago",
    priority: "normal",
    sortIndex: 2,
  },
  {
    id: "4",
    category: "parking",
    title: "Lot G overflow parking",
    message: "When Lot G is full, use Lot E with free cross-campus shuttle.",
    route: undefined,
    location: "Lot E — Atherton entrance",
    shuttleStatus: undefined,
    updatedLabel: "Updated 1 hr ago",
    priority: "normal",
    sortIndex: 3,
  },
  {
    id: "5",
    category: "weather",
    title: "Light rain this afternoon",
    message: "Sidewalks near Brotman Hall may be slick. Allow extra walk time between classes.",
    route: undefined,
    location: "South campus core",
    shuttleStatus: undefined,
    updatedLabel: "Updated 25 min ago",
    priority: "normal",
    sortIndex: 4,
  },
  {
    id: "6",
    category: "advisory",
    title: "Horn Center access",
    message: "East entrance closed for maintenance through Friday. Use west doors only.",
    route: undefined,
    location: "Horn Center",
    shuttleStatus: undefined,
    updatedLabel: "Updated 3 hr ago",
    priority: "high",
    sortIndex: 5,
  },
];

export function pickFeaturedAlert(alerts: TravelAlert[]): TravelAlert | null {
  if (alerts.length === 0) return null;
  const delayedShuttle = alerts.find((a) => a.category === "shuttle" && a.shuttleStatus === "delayed");
  if (delayedShuttle) return delayedShuttle;
  const highNonShuttle = alerts.find((a) => a.category !== "shuttle" && a.priority === "high");
  if (highNonShuttle) return highNonShuttle;
  return alerts[0];
}

export function travelStats(alerts: TravelAlert[]) {
  const activeAlerts = alerts.length;
  const onTimeShuttles = alerts.filter((a) => a.category === "shuttle" && a.shuttleStatus === "on-time").length;
  const delayedRoutes = alerts.filter((a) => a.category === "shuttle" && a.shuttleStatus === "delayed").length;
  const campusAdvisories = alerts.filter((a) => a.category !== "shuttle").length;
  return { activeAlerts, onTimeShuttles, delayedRoutes, campusAdvisories };
}
