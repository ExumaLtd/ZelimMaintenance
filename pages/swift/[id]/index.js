// pages/swift/[id]/index.js

import Head from "next/head";
import Link from "next/link";
import Airtable from "airtable";
import Image from "next/image";
import fs from "fs";
import path from "path";

// FILE SIZE UTILITY
const getFileSize = (filePath) => {
  try {
    const fullPath = path.join(process.cwd(), "public", filePath);
    const stats = fs.statSync(fullPath);
    const bytes = stats.size;
    if (!bytes) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  } catch {
    return "Size N/A";
  }
};

// SERVER-SIDE LOADER
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
    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
      process.env.AIRTABLE_BASE_ID
    );

    const TABLE = process.env.AIRTABLE_SWIFT_TABLE; // MUST BE "swift_units"

    const records = await base(TABLE)
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

    if (!records.length)
      return { redirect: { destination: "/", permanent: false } };

    const rec = records[0];

    return {
      props: {
        unit: {
          serial_number: rec.get("serial_number") || "N/A",
          company: rec.get("company") || "Client Unit",
          annualDue: rec.get("annual_maintenance_due")
            ? new Date(rec.get("annual_maintenance_due")).toLocaleDateString(
                "en-GB"
              )
            : "N/A",
          depthDue: rec.get("depth_maintenance_due")
            ? new Date(rec.get("depth_maintenance_due")).toLocaleDateString(
                "en-GB"
              )
            : "N/A",
        },
        publicToken,
        ...fileSizes,
      },
    };
  } catch (err) {
    console.error("UNIT PAGE ERROR:", err);
    return { redirect: { destination: "/", permanent: false } };
  }
}

// CLIENT LOGO RESOLVER
const getClientLogo = (companyName, serialNumber) => {
  if (
    ["SWI001", "SWI002"].includes(serialNumber) ||
    companyName.includes("Changi")
  )
    return {
      src: "/client_logos/changi_airport/ChangiAirport_Logo(White).svg",
      alt: `${companyName} Logo`,
    };

  if (serialNumber === "SWI003" || companyName.includes("Milford"))
    return {
      src: "/client_logos/port_of_milford_haven/PortOfMilfordHaven(White).svg",
      alt: `${companyName} Logo`,
    };

  if (
    ["SWI010", "SWI011"].includes(serialNumber) ||
    companyName.includes("Hatloy")
  )
    return {
      src: "/client_logos/Hatloy Maritime/HatloyMaritime_Logo(White).svg",
      alt: `${companyName} Logo`,
    };

  return null;
};

// PAGE COMPONENT
export default function SwiftUnitPage({
  unit,
  publicToken,
  maintenanceManualSize,
  installationGuideSize,
}) {
  const logoProps = getClientLogo(unit.company, unit.serial_number);

  return (
    <>
      <Head>
        <title>{unit.company} maintenance portal</title>
      </Head>

      <div className="swift-main-layout-wrapper">
        <div className="page-wrapper">
          <div className="swift-dashboard-container">
            {/* LEFT */}
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
                {unit.company}
                <span className="break-point">maintenance portal</span>
              </h1>

              <div className="maintenance-details">
                <div className="detail-item">
                  <p className="detail-label">Serial number</p>
                  <p className="detail-value">{unit.serial_number}</p>
                </div>

                <div className="detail-item">
                  <p className="detail-label">Annual maintenance due</p>
                  <p className="detail-value">{unit.annualDue}</p>
                </div>

                <div className="detail-item">
                  <p className="detail-label">30-month depth maintenance</p>
                  <p className="detail-value">{unit.depthDue}</p>
                </div>
              </div>
            </div>

            {/* RIGHT */}
            <div className="action-panel">
              <div className="maintenance-group-wrapper">
                <div className="maintenance-card">
                  <h3>Annual<br />maintenance</h3>
                  <p className="description">
                    To be completed in accordance with Section 7.1.2 of the Maintenance Manual.
                  </p>
                  <Link
                    href={`/swift/${publicToken}/annual`}
                    className="start-btn primary-btn"
                  >
                    Start maintenance
                  </Link>
                </div>

                <div className="maintenance-card">
                  <h3>30-month depth<br />maintenance</h3>
                  <p className="description">
                    As outlined in Section 7.2.2 – Depth Maintenance Procedure.
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
                  Required for annual and 30-month maintenance work.
                </p>

                <div className="download-list">
                  <a
                    href="/downloads/SwiftSurvivorRecoverySystem_MaintenanceManual_v2point0(Draft).pdf"
                    target="_blank"
                    className="download-link"
                  >
                    <Image src="/Icons/PDF_Icon.svg" width={40} height={40} />
                    <div>
                      <p>SWIFT maintenance manual.pdf</p>
                      <span>{maintenanceManualSize}</span>
                    </div>
                  </a>

                  <a
                    href="/downloads/SwiftSurvivorRecoverySystem_InstallationGuide_v2point0(Draft).pdf"
                    target="_blank"
                    className="download-link"
                  >
                    <Image src="/Icons/PDF_Icon.svg" width={40} height={40} />
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

        {/* Fixed logo */}
        <div className="fixed-zelim-logo">
          <a href="https://www.zelim.com" target="_blank">
            <Image src="/logo/zelim-logo.svg" width={80} height={20} />
          </a>
        </div>
      </div>
    </>
  );
}
