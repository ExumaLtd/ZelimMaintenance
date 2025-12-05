// pages/swift/[id]/index.js - SIMPLIFIED STATIC DATA VERSION

import Head from "next/head";
import Link from "next/link";
import Image from "next/image"; 

// --- Data Fetching (SIMPLIFIED - NO AIRTABLE CONNECTION) ---
export async function getServerSideProps(context) {
    const publicToken = context.params.id;

    // Static data to test the new design without Airtable errors
    const unitDetails = {
        serial_number: "SWI001",
        company: "Changi Airport",
        annualDue: "05 / 12 / 2025", // Dummy Date 1
        depthDue: "05 / 06 / 2027", // Dummy Date 2
    };

    return {
        props: { unit: unitDetails, publicToken },
    };
}


// --- Component Definition ---

// Function to map company name to a logo path 
const getClientLogo = (companyName) => {
    // Check for 'Changi' based on the design screenshot
    if (companyName && companyName.includes('Changi')) {
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

            <footer className="logout-footer">
                <Link href="/" className="logout-link">
                    Log Out / Change Unit &larr;
                </Link>
            </footer>

        </div>
      </div>
    </>
  );
}