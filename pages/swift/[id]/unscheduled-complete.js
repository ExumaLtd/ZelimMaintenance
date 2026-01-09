// pages/swift/[id]/unscheduled-complete.js
import Head from "next/head";
import Image from "next/image";

export default function UnscheduledComplete() {
  return (
    <div className="form-scope">
      <Head>
        <title>Submission Successful | SWIFT</title>
      </Head>

      <div className="swift-main-layout-wrapper">
        <div className="page-wrapper">
          <div className="swift-checklist-container">
            
            <div className="checklist-logo">
              {/* Using SVG to match dashboard branding */}
              <img src="/logo/zelim-logo.svg" alt="Zelim Logo" style={{ width: '120px' }} />
            </div>

            <h1 className="checklist-hero-title">
              Unscheduled maintenance<br />
              <span className="break-point">submitted successfully</span>
            </h1>

            <div className="checklist-form-card" style={{ textAlign: "center", padding: "60px 40px" }}>
              
              <div style={{ fontSize: "64px", color: "#01FFF6", marginBottom: "20px" }}>
                ✓
              </div>

              <p style={{ color: "#FFFFFF", marginBottom: "32px", fontSize: "18px", lineHeight: "1.6" }}>
                Your maintenance record has been uploaded<br />to the unit history.
              </p>

              <button
                className="checklist-submit"
                style={{ maxWidth: "300px", margin: "0 auto" }}
                onClick={() => {
                  // Redirects back to the dashboard
                  const pathParts = window.location.pathname.split('/');
                  const publicToken = pathParts[2];
                  window.location.href = `/swift/${publicToken}`;
                }}
              >
                Return to dashboard
              </button>
            </div>
          </div>
        </div>

        {/* Fixed Zelim footer logo to match dashboard */}
        <div className="zelim-spacer"></div>
        <div className="fixed-zelim-logo">
          <a href="https://www.zelim.com" target="_blank" rel="noopener noreferrer">
            <Image src="/logo/zelim-logo.svg" width={80} height={20} alt="Zelim logo" />
          </a>
        </div>
      </div>
    </div>
  );
}