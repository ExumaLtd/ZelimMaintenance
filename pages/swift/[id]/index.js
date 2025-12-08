// pages/swift/[id]/index.js

import Head from "next/head";
import Link from "next/link";
import Airtable from "airtable";
import Image from "next/image";
// --- IMPORTS FOR FILE SIZE ---
import fs from 'fs';
import path from 'path';
// -----------------------------

// ===============================
// FILE SIZE UTILITY
// ===============================
const getFileSize = (filePath) => {
  try {
    // filePath starts from the public directory, e.g., '/downloads/file.pdf'
    const fullPath = path.join(process.cwd(), 'public', filePath);
    const stats = fs.statSync(fullPath);
    const bytes = stats.size;

    // Convert bytes to a human-readable format (MB, KB)
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  } catch (error) {
    console.warn(`Could not get size for file: ${filePath}`, error.message);
    return 'Size N/A';
  }
};


// ===============================
// FETCH UNIT DETAILS & FILE SIZES (UPDATED FOR TWO UNIQUE FILES)
// ===============================
export async function getServerSideProps(context) {
  const publicToken = context.params.id;

  // --- UNIQUE FILE PATHS ---
  const maintenanceManualPath = '/downloads/SwiftSurvivorRecoverySystem_MaintenanceManual_v2point0(Draft).pdf';
  const installationGuidePath = '/downloads/SwiftSurvivorRecoverySystem_InstallationGuide_v2point0(Draft).pdf';

  // Calculate sizes for both unique files
  const fileSizes = {
    maintenanceManualSize: getFileSize(maintenanceManualPath),
    installationGuideSize: getFileSize(installationGuidePath),
  };
  // ----------------------

  try {
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_API_KEY,
    }).base(process.env.AIRTABLE_BASE_ID);

    const TABLE_NAME = process.env.AIRTABLE_SWIFT_TABLE;

    const records = await base(TABLE_NAME)
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
        ? new Date(record.get("annual_maintenance_due")).toLocaleDateString(
            "en-GB"
          )
        : "N/A",
      depthDue: record.get("depth_maintenance_due")
        ? new Date(record.get("depth_maintenance_due")).toLocaleDateString(
            "en-GB"
          )
        : "N/A",
    };

    return {
      props: { 
        unit: unitDetails, 
        publicToken,
        ...fileSizes, // Pass file sizes to props
      },
    };
  } catch (error) {
    console.error("Error fetching unit data:", error);
    return { redirect: { destination: "/", permanent: false } };
  }
}

// ===============================
// LOGO HANDLING
// ===============================
const getClientLogo = (companyName) => {
  if (
    companyName &&
    (companyName.includes("Changi") || companyName.includes("Company A"))
  ) {
    return {
      src: "/client_logos/ChangiAirport_Logo(White).svg",
      alt: `${companyName} Logo`,
      width: 150,
      height: 40,
    };
  }

  return {
    src: "/logo/zelim-logo.svg",
    alt: "Zelim Logo",
    width: 100,
    height: 30,
  };
};

// ===============================
// PAGE COMPONENT
// ===============================
export default function SwiftUnitPage({ 
  unit, 
  publicToken, 
  maintenanceManualSize,
  installationGuideSize
}) {
  const serialNumber = unit.serial_number;
  const companyName = unit.company;
  const logoProps = getClientLogo(companyName);

  // --- UNIQUE DOWNLOAD CONSTANTS ---
  const MAINTENANCE_PDF_PATH = "/downloads/SwiftSurvivorRecoverySystem_MaintenanceManual_v2point0(Draft).pdf";
  const INSTALLATION_PDF_PATH = "/downloads/SwiftSurvivorRecoverySystem_InstallationGuide_v2point0(Draft).pdf";

  const MAINTENANCE_TITLE = "SWIFT maintenance manual.pdf";
  const INSTALLATION_TITLE = "SWIFT installation guide.pdf";
  // ---------------------------------

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
              <div className="logo-section">
                <Image
                  src={logoProps.src}
                  alt={logoProps.alt}
                  width={logoProps.width}
                  height={logoProps.height}
                  className="client-logo"
                  priority
                />
              </div>

              <h1 className="portal-title">{companyName} maintenance portal</h1>

              <div className="maintenance-details">
                {/* SERIAL NUMBER ITEM */}
                <div className="detail-item">
                  <p className="detail-label">Serial number</p>
                  <p className="detail-value">{serialNumber}</p>
                </div>

                {/* ANNUAL DUE ITEM */}
                <div className="detail-item">
                  <p className="detail-label">Annual maintenance due</p>
                  <p className="detail-value">{unit.annualDue}</p>
                </div>

                {/* DEPTH DUE ITEM */}
                <div className="detail-item">
                  <p className="detail-label">30-month depth maintenance due</p>
                  <p className="detail-value">{unit.depthDue}</p>
                </div>
              </div>
            </div>

            {/* RIGHT PANEL */}
            <div className="action-panel">
              
              {/* === ONE LARGE RECTANGLE (MAINTENANCE GROUP WRAPPER) === */}
              <div className="maintenance-group-wrapper"> 
                
                {/* ANNUAL CARD (INNER SECTION 1) */}
                <div className="maintenance-card">
                  <h3>Annual<br />maintenance</h3>
                  <p className="description">
                    To be completed in accordance with Section 7.1.2 - Annual
                    Maintenance Process of the SWIFT Survivor Recovery System
                    Maintenance Manual.
                  </p>
                  <Link
                    href={`/swift/${publicToken}/annual`}
                    className="start-btn primary-btn"
                  >
                    Start maintenance
                  </Link>
                </div>

                {/* DEPTH CARD (INNER SECTION 2) */}
                <div className="maintenance-card">
                  <h3>30-month depth maintenance</h3>
                  <p className="description">
                    To be completed in accordance with Section 7.2.2 - 30-Month
                    Depth Maintenance Process of the SWIFT Survivor Recovery System
                    Maintenance Manual.
                  </p>
                  <Link
                    href={`/swift/${publicToken}/depth`}
                    className="start-btn primary-btn"
                  >
                    Start maintenance
                  </Link>
                </div>
              </div> 
              {/* === END MAINTENANCE GROUP WRAPPER === */}


              {/* DOWNLOADS (Remains separate) */}
              <div className="downloads-card">
                <h3>Downloads</h3>
                <p className="description">
                  To be used in accordance with both annual and 30-month depth
                  maintenance.
                </p>

                <div className="download-list">
                  <a
                    href={MAINTENANCE_PDF_PATH} // <-- CORRECT PATH
                    target="_blank"
                    className="download-link"
                  >
                    <Image
                      src="/Icons/PDF_Icon.svg"
                      width={40} 
                      height={40}
                      alt="PDF Icon"
                    />
                    <div>
                      <p>{MAINTENANCE_TITLE}</p> 
                      <span>{maintenanceManualSize}</span> {/* <-- UNIQUE DYNAMIC SIZE */}
                    </div>
                  </a>

                  <a
                    href={INSTALLATION_PDF_PATH} // <-- CORRECT PATH
                    target="_blank"
                    className="download-link"
                  >
                    <Image
                      src="/Icons/PDF_Icon.svg"
                      width={40}
                      height={40}
                      alt="PDF Icon"
                    />
                    <div>
                      <p>{INSTALLATION_TITLE}</p>
                      <span>{installationGuideSize}</span> {/* <-- UNIQUE DYNAMIC SIZE */}
                    </div>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SPACER PREVENTS OVERLAP */}
        <div className="zelim-spacer"></div>

        {/* FIXED LOGO - UPDATED WITH LINK */}
        <div className="fixed-zelim-logo">
          <a href="https://www.zelim.com" target="_blank" rel="noopener noreferrer">
            <Image
              src="/logo/zelim-logo.svg"
              width={80}
              height={20}
              alt="Zelim Logo"
            />
          </a>
        </div>
      </div>
    </>
  );
}