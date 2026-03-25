export default function TravelAlertsPage() {
  return (

    <div className="pageContainer">
      <h1 style={{color:"white"}}>
        Travel Alerts
      </h1>

      <div className="card">

        <h3>North Campus → South Campus</h3>
        <p>Shuttle arriving in 10 minutes</p>

        <span
          style={{
            background:"#22c55e",
            color:"white",
            padding:"5px 12px",
            borderRadius:"20px",
            fontSize:"12px"
          }}
        >
          ON TIME
        </span>

      </div>

      <div className="card">

        <h3>Library → Engineering Building</h3>
        <p>Shuttle delayed</p>

        <span
          style={{
            background:"#f97316",
            color:"white",
            padding:"5px 12px",
            borderRadius:"20px",
            fontSize:"12px"
          }}
        >
          DELAYED
        </span>

      </div>

    </div>

  )
}
