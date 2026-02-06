import Head from "next/head";
import Image from "next/image";
import { useEffect, useState } from "react";
import { ThumbsUp } from "lucide-react";

export default function FaultReportingComplete() {
  const [unitSN, setUnitSN] = useState("");
  const [publicToken, setPublicToken] = useState("");

  useEffect(() => {
    const savedSN = localStorage.getItem("last_submitted_sn");
    const savedToken = localStorage.getItem("last_public_token");
    
    if (savedSN) {
      setUnitSN(savedSN);
      localStorage.removeItem("last_submitted_sn");
    }
    
    if (savedToken) {
      setPublicToken(savedToken);
    }
    
    localStorage.removeItem("last_maintenance_type");
  }, []);

  return (
    <div className="form-scope">
      <Head>
        <title>Fault report submitted | Zelim</title>
      </Head>

      <div className="swift-main-layout-wrapper">
        <div className="complete-page-wrapper">
          <div className="complete-card">
            <div className="complete-icon-circle">
              <ThumbsUp size={32} strokeWidth={1.5} />
            </div>

            <h1 className="complete-title">
              <span className="complete-title-main">Fault report</span>
              <span className="complete-title-sub">submitted for {unitSN || "unit"}</span>
            </h1>

            <p className="complete-text">
              Your fault report has been successfully submitted and sent to the maintenance facility for review and follow-up. You will receive email confirmation shortly.
            </p>

            {publicToken ? (
              <a href="/portal/swift" className="return-dashboard-btn">
                Return to dashboard
              </a>
            ) : (
              <a href="/" className="return-dashboard-btn">
                Return to home
              </a>
            )}
          </div>
        </div>

        <footer className="footer-section">
          <a href="https://www.zelim.com" target="_blank" rel="noopener noreferrer">
            <Image src="/logo/zelim-logo.svg" width={120} height={40} alt="Zelim logo" />
          </a>
        </footer>
      </div>
    </div>
  );
}