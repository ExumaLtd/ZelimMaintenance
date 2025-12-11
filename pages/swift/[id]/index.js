// pages/swift/[id]/index.js – FINAL FULL VERSION (PATCHED FOR VERCEL)

import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import fs from "fs";
import path from "path";

// ============================================================================
// FILE SIZE UTILITY
// ============================================================================
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
  } catch (error) {
    console.warn(`Could not get size for file: ${filePath}`, error.message);
    return "Size N/A";
  }
};

// ============================================================================
// FETCH UNIT DETAILS (SERVER SIDE)
// ============================================================================
export async function getServerSideProps({ params }) {
  const publicToken = params.id;

  const maintenanceManualPath =
    "/downloads/SwiftSurvivorRecoverySystem_MaintenanceManual_v2point0(Draft).pdf";
  const installationGuidePath =
    "/downloads/SwiftSurvivorRecoverySystem_InstallationGuide_v2point0(Draft).pdf";

  const fileSizes = {
    maintenanceManualSize: getFileSize(maintenanceManualPath),
    installationGuideSize: getFileSize(installationGuidePath),
  };

  try {
    // ----------------------------
    // FIXED: DIRECT AIRTABLE API CALL
    // ----------------------------
    const formula = `AND({public_token} = "${publicToken}")`;
    const url = `${process.env.AIRTABLE_API_URL}/${process.env.AIRTABLE_SWIFT_TABLE}?filterByFormula=${encodeURIComponent(formula)}`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
      },
    });

    const json = await res.json();

    if (!json.records || json.records.length === 0) {
      return {
        redirect: { destination: "/", permanent: false },
      };
    }

    const record = json.records[0].fields;

    const unitDetails = {
      serial_number: record.serial_number || "N/A",
      company: record.company || "Client Unit",
      annualDue: record.annual_maintenance_due
        ? new Date(record.annual_maintenance_due).toLocaleDateString("en-GB")
        : "N/A",
      depthDue: record.depth_maintenance_due
        ? new Date(record.depth_maintenance_due).toLocaleDateString("en-GB")
        : "N/A",
    };

    return {
      props: {
        unit: unitDetails,
        publicToken,
        ...fileSizes,
      },
    };
  } catch (error) {
    console.error("SSR Airtable Fetch Failed:", error);
    return {
      redirect: { destination: "/", permanent: false },
    };
  }
}

// ============================================================================
// CLIENT LOGO RESOLVER
// ============================================================================
const getClientLogo = (companyName, serialNumber) => {
  if (
    serialNumber === "SWI001" ||
    serialNumber === "SWI002" ||
    companyName.includes("Changi")
  ) {
    return {
      src: "/client_logos/changi_airport/ChangiAirport_Logo(White).svg",
      alt: `${companyName} Logo`,
    };
  }

  if (
    serialNumber === "SWI003" ||
    companyName.includes("Milford Haven")
  ) {
    return {
      src: "/client_logos/port_of_milford_haven/PortOfMilfordHaven(White).svg",
      alt: `${companyName} Logo`,
    };
  }

  if (
    serialNumber === "SWI010" ||
    serialNumber === "SWI011" ||
    companyName.includes("Hatloy")
  ) {
    return {
      src: "/client_logos/Hatloy Maritime/HatloyMaritime_Logo(White).svg",
      alt: `${companyName} Logo`,
    };
  }

  return null;
};

// ============================================================================
// PAGE COMPONENT
// ============================================================================
export default function SwiftUnitPage({
  unit,
  publicToken,
  maintenanceManualSize,
  installationGuideSize,
}) {
  const serialNumber = unit.serial_number;
  const companyName = unit.company;

  const logoProps = getClientLogo(companyName, serialNumber);

  const MAINTENANCE_PDF_PATH =
    "/downloads/SwiftSurvivorRecoverySystem_MaintenanceManual_v2point0(Draft).pdf";
  const INSTALLATION_PDF_PATH =
    "/downloads/SwiftSurvivorRecoverySystem_InstallationGuide_v2point0(Draft).pdf";

  return (
    <>
      <Head>
        <title>{companyName} maintenance portal</title>
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
                    className="client-logo"
                    fill
                    priority
                  />
                </div>
              )}

              <h1 className="portal-title">
                {companyName}
                <span className="break-point">maintenance portal</span>
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
                {/* ANNUAL */}
                <div className="maintenance-card">
                  <h3>
                    Annual
                    <br />
                    maintenance
                  </h3>

                  <p className="description">
                    To be completed in accordance with Section 7.1.2 –
                    Annual Maintenance Process of the SWIFT Survivor Recovery
                    System Maintenance Manual.
                  </p>

                  <Link
                    href={`/swift/${publicToken}/annual`}
                    className="start-btn primary-btn"
                  >
                    Start maintenance
                  </Link>
                </div>

                {/* DEPTH */}
                <div className="maintenance-card">
                  <h3>
                    30-month depth
                    <br />
                    maintenance
                  </h3>

                  <p className="description">
                    To be completed in accordance with Section 7.2.2 –
                    30-Month Depth Maintenance Process.
                  </p>

                  <Link
                    href={`/swift/${publicToken}/depth`}
                    className="start-btn primary-btn"
                  >
                    Start maintenance
                  </Link>
                </div>
              </div>

              {/* DOWNLOADS */}
              <div className="downloads-card">
                <h3>Downloads</h3>

                <p className="description">
                  To be used in accordance with both annual and 30-month depth maintenance.
                </p>

                <div className="download-list">
                  <a
                    href={MAINTENANCE_PDF_PATH}
                    target="_blank"
                    className="download-link"
                  >
                    <Image src="/Icons/PDF_Icon.svg" width={40} height={40} alt="PDF Icon" />
                    <div>
                      <p>SWIFT maintenance manual.pdf</p>
                      <span>{maintenanceManualSize}</span>
                    </div>
                  </a>

                  <a
                    href={INSTALLATION_PDF_PATH}
                    target="_blank"
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

        <div className="zelim-spacer"></div>

        <div className="fixed-zelim-logo">
          <a href="https://www.zelim.com" target="_blank" rel="noopener noreferrer">
            <Image src="/logo/zelim-logo.svg" width={80} height={20} alt="Zelim Logo" />
          </a>
        </div>
      </div>
    </>
  );
}
