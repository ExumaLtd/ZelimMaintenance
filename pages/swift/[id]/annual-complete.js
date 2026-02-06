import Head from "next/head";
import Image from "next/image";
import { useEffect, useState } from "react";
import { ThumbsUp } from "lucide-react";

export default function AnnualComplete() {
  const [unitSN, setUnitSN] = useState("");
  const [maintenanceType, setMaintenanceType] = useState("Annual");

  useEffect(() => {
    const savedSN = localStorage.getItem("last_submitted_sn");
    const savedType = localStorage.getItem("last_maintenance_type");
    
    if (savedSN) {
      setUnitSN(savedSN);
      localStorage.removeItem("last_submitted_sn");
    }
    
    if (savedType) {
      setMaintenanceType(savedType);
      localStorage.removeItem("last_maintenance_type");
    }
  }, []);

  return (
    <div className="form-scope">
      <Head>
        <title>{maintenanceType} maintenance submitted | Zelim</title>
      </Head>

      <div className="swift-main-layout-wrapper">
        <div className="complete-page-wrapper">
          <div className="complete-card">
            <div className="complete-icon-circle">
              <ThumbsUp size={32} strokeWidth={1.5} />
            </div>

            <h1 className="complete-title">
              <span className="complete-title-main">{maintenanceType} maintenance</span>
              <span className="complete-title-sub">submitted for {unitSN || "unit"}</span>
            </h1>

            <p className="complete-text">
              Your {maintenanceType.toLowerCase()} maintenance has successfully been recorded. You will receive email confirmation shortly.
            </p>

            <a href="/portal/swift" className="return-dashboard-btn">
              Return to dashboard
            </a>
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