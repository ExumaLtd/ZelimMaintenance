// pages/swift/[id]/index.js – FINAL FULL VERSION
import Head from "next/head";
import Link from "next/link";
import Airtable from "airtable";
import Image from "next/image";
import fs from "fs";
import path from "path";

// -----------------------------
// FILE SIZE UTILITY
// -----------------------------
const getFileSize = (filePath) => {
  try {
    const fullPath = path.join(process.cwd(), "public", filePath);
    const stats = fs.statSync(fullPath);
    const bytes = stats.size;
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  } catch {
    return "Size N/A";
  }
};

// -----------------------------
// SERVER SIDE PROPS
// -----------------------------
export async function getServerSideProps(context) {
  const publicToken = context.params.id;

  const maintenanceManualPath =
    "/downloads/SwiftSurvivorRecoverySystem_MaintenanceManual_v2point0(Draft).pdf";
  const installationGuidePath =
    "/downloads/SwiftSurvivorRecoverySystem_InstallationGuide_v2point0(Draft).pdf";

  const fileSizes = {
    maintenanceManualSize: getFileSize(maintenanceManualPath),
    installationGuideSize: getFileSize(installationGuidePath),
  };

  try {
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_API_KEY,
    }).base(process.env.AIRTABLE_BASE_ID);

    const records = await base(process.env.AIRTABLE_SWIFT_TABLE)
      .select({
        maxRecords: 1,
        filterByFormula: `{public_token} = "${publicToken}"`,
        fields: [
          "serial_number",
          "company",
          "annual_maintenance_due",
          "depth_maintenance_due",
        ],
      })
      .firstPage();

    if (!records || records.length === 0) {
      return { redirect: { destination: "/", permanent: false } };
    }

    const record = records[0];

    const unitDetails = {
      serial_number: record.get("serial_number") || "N/A",
      company: record.get("company") || "Client Unit",
      annualDue: record.get("annual_maintenance_due")
        ? new Date(record.get("annual_maintenance_due")).toLocaleDateString("en-GB")
        : "N/A",
      depthDue: record.get("depth_maintenance_due")
        ? new Date(record.get("depth_maintenance_due")).toLocaleDateString("en-GB")
        : "N/A",
    };

    return {
      props: {
        unit: unitDetails,
        publicToken,
        ...fileSizes,
      },
    };
  } catch (err) {
    console.error("Error fetching unit data:", err);
    return { redirect: { destination: "/", permanent: false } };
  }
}

// -----------------------------
// CLIENT LOGO RESOLVER
// -----------------------------
const getClientLogo = (companyName, serialNumber) => {
  if (["SWI001", "SWI002"].includes(serialNumber) || companyName?.includes("Changi")) {
    return {
      src: "/client_logos/changi_airport/ChangiAirport_Logo(White).svg",
      alt: `${companyName} Logo`,
    };
  }

  if (serialNumber === "SWI003" || companyName?.includes("Milford Haven")) {
    return {
      src: "/client_logos/port_of_milford_haven/PortOfMilfordHaven(White).svg",
      alt: `${companyName} Logo`,
    };
  }

  if (["SWI010", "SWI011"].includes(serialNumber) || companyName?.includes("Hatloy")) {
    return {
      src: "/client_logos/Hatloy Maritime/HatloyMaritime_Logo(White).svg",
      alt: `${companyName} Logo`,
    };
  }

  return null;
};

// -----------------------------
// PAGE COMPONENT
// -----------------------------
export default function SwiftUnitPage({
  unit,
  publicToken,
  maintenanceManualSize,
  installationGuideSize,
}) {
  const serialNumber = unit.serial_number;
  const companyName = unit.company;

  const logoProps = getClientLogo(companyName, serialNumber);

  return (
    <div className="dashboard-scope">
      <Head>
        <title>{companyName} Maintenance Portal</title>
        <style>{`
          .dashboard-scope { background-color: #0f1c21; min-height: 100vh; color: white; padding: 40px; }
          .swift-dashboard-container { display: grid; grid-template-columns: 350px 1fr; gap: 60px; max-width: 1400px; margin: 60px auto; }
          .maintenance-group-wrapper { display: flex; flex-wrap: wrap; gap: 20px; }
          .maintenance-card { 
             background: rgba(26, 47, 54, 0.8); 
             padding: 30px; 
             border-radius: 16px; 
             width: 48%; /* Forces 2 per row */
             display: flex; 
             flex-direction: column; 
             justify-content: space-between; 
          }
          .detail-panel { text-align: left; }
          .logo-section { height: 60px; width: 200px; margin-bottom: 40px; }
          .portal-title { font-size: 32px; font-weight: 700; margin-bottom: 40px; text-transform: lowercase; }
          .detail-item { margin-bottom: 25px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 15px; }
          .detail-label { color: #8c9ea3; font-size: 14px; }
          .detail-value { font-size: 20px; font-weight: 600; }
          .start-btn { background: #00fff6; color: #0f1c21; padding: 12px 24px; border-radius: 8px; font-weight: 700; text-decoration: none; width: fit-content; margin-top: 20px; }
          .fixed-zelim-logo { width: 100%; display: flex; justify-content: center; padding: 40px 0; }
        `}</style>
      </Head>

      <div className="swift-main-layout-wrapper">
        <div className="page-wrapper">
          <div className="swift-dashboard-container">
            
            {/* LEFT PANEL */}
            <div className="detail-panel">
              {logoProps && (
                <div className="logo-section" style={{ position: 'relative' }}>
                  <Image
                    src={logoProps.src}
                    alt={logoProps.alt}
                    fill
                    priority
                    style={{ objectFit: 'contain', objectPosition: 'left' }}
                  />
                </div>
              )}

              <h1 className="portal-title">
                <span className="title-line">{companyName}</span>
                <span className="title-line">maintenance portal</span>
              </h1>

              <div className="maintenance-details">
                <div className="detail-item">
                  <p className="detail-label">Serial number</p>
                  <p className="detail-value">{serialNumber}</p>
                </div>

                <div className="detail-item">
                  <p className="detail-label">Annual maintenance due</p>
                  <p className="detail-value">{unit.annualDue}</p>
                </div>

                <div className="detail-item">
                  <p className="detail-label">30-month depth maintenance due</p>
                  <p className="detail-value">{unit.depthDue}</p>
                </div>
              </div>
            </div>

            {/* RIGHT PANEL */}
            <div className="action-panel">

              <div className="maintenance-group-wrapper">
                <div className="maintenance-card">
                  <h3>Annual<br/>maintenance</h3>
                  <p className="description">
                    To be completed in accordance with Section 7.1.2 –
                    Annual Maintenance Process of the SWIFT Maintenance Manual.
                  </p>
                  <Link href={`/swift/${publicToken}/annual`} className="start-btn">
                    Start maintenance
                  </Link>
                </div>

                <div className="maintenance-card">
                  <h3>30-month depth<br/>maintenance</h3>
                  <p className="description">
                    To be completed in accordance with Section 7.2.2 –
                    30-Month Depth Maintenance Process of the SWIFT Maintenance Manual.
                  </p>
                  <Link href={`/swift/${publicToken}/depth`} className="start-btn">
                    Start maintenance
                  </Link>
                </div>

                <div className="maintenance-card">
                  <h3>Unscheduled<br/>maintenance</h3>
                  <p className="description">
                    To be completed in accordance with the SWIFT Survivor Recovery System Maintenance Manual.
                  </p>
                  <Link href={`/swift/${publicToken}/unscheduled`} className="start-btn">
                    Start maintenance
                  </Link>
                </div>
              </div>

              {/* DOWNLOADS */}
              <div className="downloads-card" style={{ marginTop: '40px', background: 'rgba(21, 42, 49, 0.5)', padding: '30px', borderRadius: '16px' }}>
                <h3>Downloads</h3>
                <div className="download-list" style={{ display: 'flex', gap: '30px', marginTop: '20px' }}>
                  <a href={maintenanceManualPath} target="_blank" className="download-link" style={{ display: 'flex', alignItems: 'center', gap: '15px', textDecoration: 'none', color: 'white' }}>
                    <Image src="/Icons/PDF_Icon.svg" width={40} height={40} alt="PDF" />
                    <div><p style={{ margin: 0 }}>Maintenance manual</p><span>{maintenanceManualSize}</span></div>
                  </a>
                  <a href={installationGuidePath} target="_blank" className="download-link" style={{ display: 'flex', alignItems: 'center', gap: '15px', textDecoration: 'none', color: 'white' }}>
                    <Image src="/Icons/PDF_Icon.svg" width={40} height={40} alt="PDF" />
                    <div><p style={{ margin: 0 }}>Installation guide</p><span>{installationGuideSize}</span></div>
                  </a>
                </div>
              </div>

            </div>
          </div>
        </div>

        <div className="fixed-zelim-logo">
          <a href="https://www.zelim.com" target="_blank" rel="noopener noreferrer">
            <Image src="/Zelim_Logo(White).svg" width={100} height={30} alt="Zelim logo" />
          </a>
        </div>
      </div>
    </div>
  );
}