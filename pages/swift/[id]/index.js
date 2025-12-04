// pages/swift/[id]/index.js - WELCOME & SELECTION PAGE

import Head from "next/head";
import Link from "next/link";
import Airtable from "airtable";

// --- Data Fetching (Required for Dynamic Title) ---
export async function getServerSideProps(context) {
  const publicToken = context.params.id;

  try {
    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
      process.env.AIRTABLE_BASE_ID
    );
    const TABLE_NAME = process.env.AIRTABLE_SWIFT_TABLE;
    
    // Fetch data based on the publicToken
    const records = await base(TABLE_NAME)
      .select({
        maxRecords: 1,
        filterByFormula: `{public_token} = "${publicToken}"`, 
        // Fetch company name for the title
        fields: ["public_token", "company", "serial_number", "annual_form_id", "depth_form_id"], 
      })
      .firstPage();

    if (!records || records.length === 0) {
      return { redirect: { destination: '/', permanent: false } };
    }
    
    const record = records[0];
    const unitDetails = {
      public_token: record.get("public_token"),
      company: record.get("company") || "N/A", 
      serial_number: record.get("serial_number") || "N/A",
      annual_form_id: record.get("annual_form_id"),
      depth_form_id: record.get("depth_form_id"),
    };

    return {
      props: { unit: unitDetails },
    };
  } catch (error) {
    console.error("Error fetching unit data for selection page:", error);
    return { redirect: { destination: '/', permanent: false } };
  }
}


// --- Component Definition ---

export default function UnitSelectionPage({ unit }) {
  // If unit data is missing (should be caught by getServerSideProps, but for safety)
  if (!unit || !unit.public_token) {
    return (
      <div className="loading-state">
        <p>Redirecting...</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        {/* DYNAMIC BROWSER TAB TITLE: SWIFT | Company Name Maintenance Portal */}
        <title>SWIFT | {unit.company} Maintenance Portal</title>
      </Head>

      <div className="swift-unit-container">
        
        {/* HEADER / WELCOME MESSAGE */}
        <header className="unit-header">
          <h1 className="unit-title">Welcome to the Portal</h1>
          <p className="unit-subtitle">Unit ID: {unit.public_token.toUpperCase()}</p> 
          <p className="unit-instruction">Please select the type of maintenance you will be completing today.</p>
        </header>

        {/* NAVIGATION / CHECKLISTS */}
        <main className="checklist-navigation">
          
          <div className="checklist-link-stack">
            
            {/* LINK 1: ANNUAL MAINTENANCE */}
            <Link href={`/swift/${unit.public_token}/annual`} className="nav-card primary-card">
              <div className="card-content">
                <h3>Annual Maintenance</h3>
                <p>Full system inspection and recertification.</p>
              </div>
            </Link>

            {/* LINK 2: DEPTH MAINTENANCE */}
            <Link href={`/swift/${unit.public_token}/depth`} className="nav-card secondary-card">
              <div className="card-content">
                <h3>Depth Maintenance</h3>
                <p>In-depth component servicing and calibration.</p>
              </div>
            </Link>

          </div>
        </main>

        {/* LOGOUT / BACK LINK */}
        <footer className="unit-footer">
          <Link href="/" className="logout-link">
            Log Out / Change Unit
          </Link>
        </footer>
      </div>
    </>
  );
}