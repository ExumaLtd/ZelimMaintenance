// pages/swift/[id]/index.js

import Head from "next/head";
import Link from "next/link";
import Airtable from "airtable";
import Image from "next/image";

// ===============================
// FETCH UNIT DETAILS
// ===============================
export async function getServerSideProps(context) {
  const publicToken = context.params.id;

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
      props: { unit: unitDetails, publicToken },
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
export default function SwiftUnitPage({ unit, publicToken }) {
  const serialNumber = unit.serial_number;
  const companyName = unit.company;
  const logoProps = getClientLogo(companyName);

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
              
              {/* === MAINTENANCE CARD GROUP === */}
              <div className="maintenance-card-group"> 
                {/* ANNUAL CARD */}
                <div className="maintenance-card">
                  <h3>Annual maintenance</h3>
                  <p className="description">
                    To be completed in accordance with Section 7.1.2 – Annual
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

                {/* DEPTH CARD */}
                <div className="maintenance-card">
                  <h3>30-month depth maintenance</h3>
                  <p className="description">
                    To be completed in accordance with Section 7.2.2 – 30-Month
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
              {/* === END MAINTENANCE CARD GROUP === */}


              {/* DOWNLOADS */}
              <div className="downloads-card">
                <h3>Downloads</h3>
                <p className="description">
                  To be used in accordance with both annual and 30-month depth
                  maintenance.
                </p>

                <div className="download-list">
                  <a
                    href="/swift-maintenance-manual.pdf"
                    target="_blank"
                    className="download-link"
                  >
                    <Image
                      src="/Icons/PDF_Icon.svg"
                      width={24}
                      height={24}
                      alt="PDF Icon"
                    />
                    <div>
                      <p>SWIFT Maintenance manual.pdf</p>
                      <span>1.2 MB</span>
                    </div>
                  </a>

                  <a
                    href="/swift-installation-guide.pdf"
                    target="_blank"
                    className="download-link"
                  >
                    <Image
                      src="/Icons/PDF_Icon.svg"
                      width={24}
                      height={24}
                      alt="PDF Icon"
                    />
                    <div>
                      <p>SWIFT installation guide.pdf</p>
                      <span>1.6 MB</span>
                    </div>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SPACER PREVENTS OVERLAP */}
        <div className="zelim-spacer"></div>

        {/* FIXED LOGO */}
        <div className="fixed-zelim-logo">
          <Image
            src="/logo/zelim-logo.svg"
            width={80}
            height={20}
            alt="Zelim Logo"
          />
        </div>
      </div>
    </>
  );
}