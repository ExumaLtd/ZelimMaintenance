// pages/swift/[id]/index.js

import Head from "next/head";
import Link from "next/link";
import Airtable from "airtable";
import Image from "next/image";

// -----------------------------------------------------
// FETCH UNIT DATA FROM AIRTABLE
// -----------------------------------------------------
export async function getServerSideProps(context) {
  const publicToken = context.params.id;

  try {
    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
      process.env.AIRTABLE_BASE_ID
    );

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
    console.error("Error fetching unit:", error);
    return { redirect: { destination: "/", permanent: false } };
  }
}

// -----------------------------------------------------
// CLIENT LOGO SWITCHING
// -----------------------------------------------------
const getClientLogo = (companyName) => {
  if (companyName && (companyName.includes("Changi") || companyName.includes("Company A"))) {
    return {
      src: "/client_logos/ChangiAirport_Logo(White).svg",
      alt: `${companyName} Logo`,
      width: 150,
      height: 40,
    };
  }

  // Fallback
  return {
    src: "/logo/zelim-logo.svg",
    alt: "Zelim Logo",
    width: 120,
    height: 30,
  };
};

// -----------------------------------------------------
// PAGE COMPONENT
// -----------------------------------------------------
export default function SwiftUnitSelectionPage({ unit, publicToken }) {
  const { serial_number, company, annualDue, depthDue } = unit;
  const logoProps = getClientLogo(company);

  return (
    <>
      <Head>
        <title>{company} | Maintenance Portal</title>
      </Head>

      <div className="swift-main-layout-wrapper">
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

            <h1 className="portal-title">{company} maintenance portal</h1>

            <div className="maintenance-details">
              <p className="detail-label">Serial number</p>
              <p className="detail-value">{serial_number}</p>

              <p className="detail-label">Annual maintenance due</p>
              <p className="detail-value">{annualDue}</p>

              <p className="detail-label">30-month depth maintenance due</p>
              <p className="detail-value">{depthDue}</p>
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div className="action-panel">

            {/* Annual Maintenance */}
            <div className="maintenance-card">
              <h3>Annual maintenance</h3>
              <p className="description">
                To be completed in accordance with Section 7.1.2 – Annual Maintenance
                Process of the SWIFT Survivor Recovery System Maintenance Manual.
              </p>
              <Link href={`/swift/${publicToken}/annual`} className="primary-btn">
                Start maintenance
              </Link>
            </div>

            {/* 30-Month Depth Maintenance */}
            <div className="maintenance-card">
              <h3>30-month depth maintenance</h3>
              <p className="description">
                To be completed in accordance with Section 7.2.2 – 30-Month Depth
                Maintenance Process of the SWIFT Survivor Recovery System Maintenance Manual.
              </p>
              <Link href={`/swift/${publicToken}/depth`} className="primary-btn">
                Start maintenance
              </Link>
            </div>

            {/* Downloads */}
            <div className="downloads-card">
              <h3>Downloads</h3>
              <p className="description">
                To be used in accordance with both annual and 30-month depth maintenance.
              </p>

              <div className="download-list">
                <a href="/swift-maintenance-manual.pdf" target="_blank" className="download-link">
                  <Image src="/Icons/PDF_Icon.svg" alt="PDF Icon" width={24} height={24} />
                  <div>
                    <p>SWIFT Maintenance manual.pdf</p>
                    <span>1.2 MB</span>
                  </div>
                </a>

                <a href="/swift-installation-guide.pdf" target="_blank" className="download-link">
                  <Image src="/Icons/PDF_Icon.svg" alt="PDF Icon" width={24} height={24} />
                  <div>
                    <p>SWIFT installation guide.pdf</p>
                    <span>1.6 MB</span>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER LOGO */}
        <div className="fixed-zelim-logo">
          <Image src="/logo/zelim-logo.svg" alt="Zelim Logo" width={80} height={20} />
        </div>
      </div>
    </>
  );
}
