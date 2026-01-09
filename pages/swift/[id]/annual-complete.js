import Head from "next/head";
import Image from "next/image";

export default function AnnualComplete() {
  return (
    <div className="dashboard-scope">
      <Head>
        <title>Maintenance Submitted | SWIFT</title>
      </Head>

      <div className="swift-main-layout-wrapper">
        <div className="page-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          
          <div className="swift-dashboard-container" style={{ display: 'block', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
            
            <h1 className="portal-title" style={{ marginBottom: '40px' }}>
              <span className="title-line">Annual maintenance</span>
              <span className="title-line" style={{ color: '#01FFF6' }}>submitted successfully</span>
            </h1>

            <div className="downloads-card" style={{ padding: '40px 30px', textAlign: 'center' }}>
              <div style={{ fontSize: "64px", color: "#01FFF6", marginBottom: "20px" }}>
                ✓
              </div>

              <p style={{ color: "#FFFFFF", marginBottom: "32px", fontSize: "18px", lineHeight: "26px" }}>
                Your maintenance record has been successfully uploaded and the system logs have been updated.
              </p>

              <button
                className="maintenance-card start-btn"
                style={{ margin: "0 auto", cursor: "pointer", border: "none" }}
                onClick={() => window.location.href = document.referrer || "/"}
              >
                Return to dashboard
              </button>
            </div>

          </div>
        </div>

        {/* FOOTER - ENFORCED LOGIC */}
        <footer className="footer-section">
          <a href="https://www.zelim.com" target="_blank" rel="noopener noreferrer">
            <Image 
              src="/logo/zelim-logo.svg" 
              width={120} 
              height={40} 
              alt="Zelim logo" 
              style={{ opacity: 1 }} /* Enforced 100% opacity */
            />
          </a>
        </footer>
      </div>
    </div>
  );
}