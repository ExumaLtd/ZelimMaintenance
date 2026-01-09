export default function UnscheduledComplete() {
  return (
    <div className="swift-checklist-container">

      <div className="checklist-logo">
        <img src="/logos/zelim-logo.png" />
      </div>

      <h1 className="checklist-hero-title">
        Unscheduled maintenance<br />
        <span className="break-point">submitted successfully</span>
      </h1>

      <div className="checklist-form-card" style={{ textAlign: "center" }}>

        <div style={{ fontSize: "48px", color: "#01FFF6", marginBottom: "20px" }}>
          ✓
        </div>

        <p style={{ color: "#FFFFFF", marginBottom: "24px", fontSize: "16px" }}>
          Your maintenance record has been uploaded.
        </p>

        <button
          className="checklist-submit"
          onClick={() => window.location.href = document.referrer || "/"}
        >
          Go back
        </button>
      </div>

    </div>
  );
}