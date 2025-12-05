// pages/swift/[id]/index.js - REMOVE LOGOUT & FIX LOGO PATHS

import Head from "next/head";
import Link from "next/link";
import Airtable from "airtable";
import Image from "next/image"; 

// --- Data Fetching ---
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
        // Fetch fields for company, serial number, and next due dates
        fields: ["serial_number", "company", "annual_maintenance_due", "depth_maintenance_due"],
      })
      .firstPage();

    if (!records || records.length === 0) {
      return { redirect: { destination: '/', permanent: false } };
    }

    const record = records[0];
    const unitDetails = {
      serial_number: record.get("serial_number") || "N/A",
      company: record.get("company") || "Client Unit",
      // Format dates (Airtable returns ISO strings; this formats them to DD/MM/YYYY)
      annualDue: record.get("annual_maintenance_due") ? new Date(record.get("annual_maintenance_due")).toLocaleDateString('en-GB') : 'N/A',
      depthDue: record.get("depth_maintenance_due") ? new Date(record.get("depth_maintenance_due")).toLocaleDateString('en-GB') : 'N/A',
    };

    return {
      props: { unit: unitDetails, publicToken },
    };
  } catch (error) {
    console.error("Error fetching unit data for selection page:", error);
    return { redirect: { destination: '/', permanent: false } };
  }
}


// --- Component Definition ---

// Function to map company name to a logo path 
const getClientLogo = (companyName) => {
    // Check for 'Changi' based on the design screenshot
    if (companyName && companyName.includes('Changi')) {
        // Path starts with / because it's in the public folder
        return {
            src: '/client_logos/ChangiAirport_Logo(White).svg',
            alt: `${companyName} Logo`,
            width: 150,
            height: 40
        };
    }
    // Default fallback logo 
    return {
        src: '/zelim-logo.svg',
        alt: 'Zelim Logo',
        width: 100,
        height: 30
    };
};


export default function SwiftUnitSelectionPage({ unit, publicToken }) {
  const serialNumber = unit.serial_number;
  const companyName = unit.company;
  const logoProps = getClientLogo(companyName);

  return (
    <>
      <Head>
        <title>{companyName} SWIFT maintenance portal</title>
      </Head>

      <div className="swift-dashboard-container">

        {/* --- LEFT COLUMN / TOP SECTION (Unit Details) --- */}
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
            
            <h1 className="portal-title">{companyName} SWIFT maintenance portal</h1>
            
            <div className="maintenance-details">
                <p className="detail-label">Serial number</p>
                <p className="detail-value">{serialNumber}</p>

                <p className="detail-label">Annual maintenance due</p>
                <p className="detail-value due-date">{unit.annualDue}</p>
                
                <p className="detail-label">30-month depth maintenance due</p>
                <p className="detail-value due-date">{unit.depthDue}</p>
            </div>
            
            <div className="zelim-footer">
                <Image 
                    src="/zelim-logo.svg" 
                    alt="Zelim Logo" 
                    width={80} 
                    height={20} 
                />
            </div>
        </div>

        {/* --- RIGHT COLUMN / BOTTOM SECTION (Maintenance Links and Downloads) --- */}
        <div className="action-panel">
            
            {/* ANNUAL MAINTENANCE CARD */}
            <div className="maintenance-card">
                <h3>Annual maintenance</h3>
                <p className="description">To be completed in accordance with Section 7.1.2 – Annual Maintenance Process of the SWIFT Survivor Recovery System Maintenance Manual.</p>
                <Link href={`/swift/${publicToken}/annual`} className="start-btn primary-btn">
                    Start maintenance
                </Link>
            </div>
            
            {/* DEPTH MAINTENANCE CARD */}
            <div className="maintenance-card">
                <h3>30-month depth maintenance</h3>
                <p className="description">To be completed in accordance with Section 7.2.2 – 30-Month Depth Maintenance Process of the SWIFT Survivor Recovery System Maintenance Manual.</p>
                <Link href={`/swift/${publicToken}/depth`} className="start-btn primary-btn">
                    Start maintenance
                </Link>
            </div>

            {/* DOWNLOADS CARD */}
            <div className="downloads-card">
                <h3>Downloads</h3>
                <p className="description">To be used in accordance with both annual and 30-month depth maintenance.</p>
                
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

            {/* LOGOUT FOOTER REMOVED */}
            {/* Footer with logout link is now removed from this file. */}

        </div>
      </div>
    </>
  );
}