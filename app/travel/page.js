"use client";
import { useEffect, useState } from "react";

export default function TravelPage() {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    fetch("/api/travel-alerts")
      .then((res) => res.json())
      .then((data) => setAlerts(data));
  }, []);

  const getStatusColor = (status) => {
    if (status === "delayed") return "#f59e0b";
    if (status === "closed") return "#ef4444";
    return "#10b981";
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.title}>🚍 ScheduleU Travel Alerts</h1>

        {alerts.length === 0 && (
          <div style={styles.emptyBox}>
            No travel alerts right now 🎉
          </div>
        )}

        {alerts.map((alert) => (
          <div key={alert.id} style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.route}>
                {alert.from_name} → {alert.to_name}
              </h3>

              <span
                style={{
                  ...styles.badge,
                  backgroundColor: getStatusColor(alert.status),
                }}
              >
                {alert.status.toUpperCase()}
              </span>
            </div>

            <p style={styles.message}>{alert.message}</p>

            <small style={styles.time}>
              {new Date(alert.created_at).toLocaleString()}
            </small>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0f766e, #115e59)",
    padding: "40px 20px",
    display: "flex",
    justifyContent: "center",
  },
  container: {
    width: "100%",
    maxWidth: "700px",
  },
  title: {
    color: "white",
    marginBottom: "25px",
    fontSize: "28px",
    fontWeight: "600",
  },
  card: {
    background: "rgba(255,255,255,0.95)",
    padding: "20px",
    borderRadius: "14px",
    marginBottom: "15px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
    transition: "transform 0.2s ease",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px",
  },
  route: {
    margin: 0,
    fontSize: "18px",
    fontWeight: "600",
    color: "#0f172a",
  },
  message: {
    marginBottom: "10px",
    color: "#334155",
  },
  badge: {
    padding: "5px 10px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "600",
    color: "white",
  },
  time: {
    color: "#64748b",
    fontSize: "12px",
  },
  emptyBox: {
    background: "rgba(255,255,255,0.2)",
    padding: "20px",
    borderRadius: "12px",
    color: "white",
    textAlign: "center",
  },
};
