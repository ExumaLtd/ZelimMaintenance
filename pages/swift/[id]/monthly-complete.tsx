import Head from "next/head";
import Image from "next/image";
import { useEffect, useState } from "react";
import { ThumbsUp } from "lucide-react";

export default function MonthlyComplete() {
  const [unitSN, setUnitSN] = useState("");
  const [maintenanceType, setMaintenanceType] = useState("Monthly");

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
        <title>{unitSN ? `${unitSN} | ${maintenanceType} maintenance submitted` : `${maintenanceType} maintenance submitted`}</title>
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
              <span className="left">Return to dashboard</span>
              <span className="right">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M10.1458 7.5L0 7.5L0 5.83333L10.1458 5.83333L5.47917 1.16667L6.66667 0L13.3333 6.66667L6.66667 13.3333L5.47917 12.1667L10.1458 7.5Z" fill="#172F36"/>
                </svg>
              </span>
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