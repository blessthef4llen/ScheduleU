export default function TravelAlerts() {
  return (
    <div className="page-container">
      <h1 className="page-title">Travel Alerts</h1>

      <p className="page-subtitle">
        Transportation and commute updates near CSULB.
      </p>

      <button className="primary-btn">
        Refresh Alerts
      </button>

      <div className="card">
        🚧 Traffic delay near campus entrance
      </div>

      <div className="card">
        🚌 Shuttle running 10 minutes late
      </div>
    </div>
  );
}