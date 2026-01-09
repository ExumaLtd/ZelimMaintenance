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

  if (serialNumber === "SWI003" || companyName?.includes("Port of Milford Haven")) {
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
      </Head>

      <div className="swift-main-layout-wrapper">
        <div className="page-wrapper">
          <div className="swift-dashboard-container">
            
            {/* LEFT PANEL */}
            <div className="detail-panel">
              {logoProps && (
                <div className="logo-section">
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

              {/* MAINTENANCE SECTION */}
              <div className="maintenance-group-wrapper">
                <div className="maintenance-card">
                  <h3>Annual<br/>maintenance</h3>
                  <p className="description">
                    To be completed in accordance with Section 7.1.2 –
                    Annual Maintenance Process of the SWIFT Survivor Recovery System Maintenance Manual.
                  </p>
                  <Link href={`/swift/${publicToken}/annual`} className="start-btn">
                    Start maintenance
                  </Link>
                </div>

                <div className="maintenance-card">
                  <h3>30-month depth<br/>maintenance</h3>
                  <p className="description">
                    To be completed in accordance with Section 7.2.2 –
                    30-Month Depth Maintenance Process of the SWIFT Survivor Recovery System Maintenance Manual.
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

                <div 
                  className="maintenance-card" 
                  style={{ visibility: 'hidden', border: 'none', background: 'none', padding: 0 }}
                ></div>
              </div>

              {/* DOWNLOADS */}
              <div className="downloads-card">
                <h3>Downloads</h3>
                <p className="description">
                  To be used in accordance with both annual and 30-month depth maintenance.
                </p>

                <div className="download-list">
                  <a
                    href="/downloads/SwiftSurvivorRecoverySystem_MaintenanceManual_v2point0(Draft).pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="download-link"
                  >
                    <Image src="/Icons/PDF_Icon.svg" width={40} height={40} alt="PDF Icon" />
                    <div>
                      <p>SWIFT maintenance manual.pdf</p>
                      <span>{maintenanceManualSize}</span>
                    </div>
                  </a>

                  <a
                    href="/downloads/SwiftSurvivorRecoverySystem_InstallationGuide_v2point0(Draft).pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="download-link"
                  >
                    <Image src="/Icons/PDF_Icon.svg" width={40} height={40} alt="PDF Icon" />
                    <div>
                      <p>SWIFT installation guide.pdf</p>
                      <span>{installationGuideSize}</span>
                    </div>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER - INTEGRATED IN FLEXBOX WRAPPER */}
        <footer className="footer-section">
          <a href="https://www.zelim.com" target="_blank" rel="noopener noreferrer">
            <Image 
              src="/logo/zelim-logo.svg" 
              width={120} 
              height={40} 
              alt="Zelim logo" 
              style={{ opacity: 0.9 }}
            />
          </a>
        </footer>
      </div>
    </div>
  );
}