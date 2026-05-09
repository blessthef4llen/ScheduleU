import type { TravelAlert } from "@/frontend/lib/travelAlertsMock";

type TravelAlertCardProps = {
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

export default function TravelAlertCard({ alert }: TravelAlertCardProps) {
  const isShuttle = alert.category === "shuttle";
  const delayed = alert.shuttleStatus === "delayed";
  const onTime = alert.shuttleStatus === "on-time";

  return (
    <article
      className="travel-alert-card notification-item notif-accent--travel"
      aria-label={`${alert.title}. ${alert.message}`}
    >
      <div className="travel-alert-card__head">
        <div className="travel-alert-card__title-row">
          {isShuttle ? (
            <span
              className={`shuttle-blinker ${delayed ? "shuttle-blinker--delayed" : "shuttle-blinker--ontime"}`}
              title={delayed ? "Delayed" : "On time"}
              aria-hidden
            />
          ) : (
            <span className="travel-alert-card__icon" aria-hidden>
              {alert.category === "parking" ? "P" : alert.category === "weather" ? "W" : "i"}
            </span>
          )}
          <h3 className="travel-alert-card__title">{alert.title}</h3>
        </div>
        <div className="travel-alert-card__badges">
          <span className="travel-category-pill">{categoryLabel(alert.category)}</span>
          {isShuttle && onTime ? (
            <span className="travel-status-badge travel-status-badge--ontime">On time</span>
          ) : null}
          {isShuttle && delayed ? (
            <span className="travel-status-badge travel-status-badge--delayed">Delayed</span>
          ) : null}
          {!isShuttle ? <span className="travel-status-badge travel-status-badge--active">Active</span> : null}
        </div>
      </div>

      <p className="travel-alert-card__message">{alert.message}</p>

      <div className="travel-alert-card__meta">
        <div className="travel-alert-card__tags">
          {alert.route ? <span className="travel-route-pill">{alert.route}</span> : null}
          {alert.location ? <span className="travel-location-pill">{alert.location}</span> : null}
        </div>
        <span className="travel-alert-card__time">{alert.updatedLabel}</span>
      </div>

      <div className="travel-alert-card__actions">
        <button type="button" className="btn btn-secondary travel-alert-card__btn">
          Details
        </button>
      </div>
    </article>
  );
}
