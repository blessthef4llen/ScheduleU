// Reusable Featuredtravelalert component for ScheduleU.
import type { TravelAlert } from "@/lib/travelAlertsMock";

type FeaturedTravelAlertProps = {
  alert: TravelAlert;
};

function categoryLabel(category: TravelAlert["category"]): string {
  switch (category) {
    case "shuttle":
      return "Shuttle";
    case "parking":
      return "Parking";
    case "weather":
      return "Weather";
    default:
      return "Advisory";
  }
}

function shuttleStatusLabel(alert: TravelAlert): string | null {
  if (alert.category !== "shuttle" || !alert.shuttleStatus) return null;
  return alert.shuttleStatus === "delayed" ? "Delayed" : "On time";
}

export default function FeaturedTravelAlert({ alert }: FeaturedTravelAlertProps) {
  const status = shuttleStatusLabel(alert);
  const isShuttle = alert.category === "shuttle";
  const delayed = alert.shuttleStatus === "delayed";

  return (
    <section className="travel-featured-card" aria-label="Featured alert">
      <div className="travel-featured-card__accent" aria-hidden />
      <div className="travel-featured-card__inner">
        <div className="travel-featured-card__eyebrow">
          <span className="travel-featured-card__spotlight">Featured</span>
          <span className="travel-category-pill travel-category-pill--quiet">{categoryLabel(alert.category)}</span>
          {isShuttle ? (
            <span
              className={`travel-featured-card__blinker shuttle-blinker ${delayed ? "shuttle-blinker--delayed" : "shuttle-blinker--ontime"}`}
              title={delayed ? "Delayed" : "On time"}
              aria-hidden
            />
          ) : null}
        </div>
        <h2 className="travel-featured-card__title">{alert.title}</h2>
        <p className="travel-featured-card__message">{alert.message}</p>
        {(alert.route || alert.location) && (
          <div className="travel-featured-card__route-row">
            {alert.route ? <span className="travel-route-pill">{alert.route}</span> : null}
            {alert.location ? <span className="travel-location-pill">{alert.location}</span> : null}
          </div>
        )}
        <div className="travel-featured-card__meta">
          {status ? (
            <span
              className={`travel-status-badge ${status === "Delayed" ? "travel-status-badge--delayed" : "travel-status-badge--ontime"}`}
            >
              {status}
            </span>
          ) : (
            <span className="travel-status-badge travel-status-badge--active">Active</span>
          )}
          <span className="travel-featured-card__time">{alert.updatedLabel}</span>
        </div>
      </div>
    </section>
  );
}
