// pages/swift/[id]/annual.js - ANNUAL CHECKLIST PAGE

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
        // Fetch serial_number for the title
        fields: ["serial_number"], 
      })
      .firstPage();

    if (!records || records.length === 0) {
      return { redirect: { destination: '/', permanent: false } };
    }
    
    const record = records[0];
    const unitDetails = {
      serial_number: record.get("serial_number") || "N/A",
    };

    return {
      props: { unit: unitDetails, publicToken },
    };
  } catch (error) {
    console.error("Error fetching unit data for annual page:", error);
    return { redirect: { destination: '/', permanent: false } };
  }
}


// --- Component Definition ---

export default function AnnualMaintenancePage({ unit, publicToken }) {
  const serialNumber = unit.serial_number;

  // Placeholder content for now - will be replaced with Fillout iFrame later
  return (
    <>
      <Head>
        {/* DYNAMIC BROWSER TAB TITLE: SWIFT Annual Checklist | Serial Number */}
        <title>SWIFT Annual Checklist | {serialNumber}</title>
      </Head>

      <div className="swift-checklist-container">
        
        {/* HEADER */}
        <header className="checklist-header">
          <h1 className="unit-title">SWIFT Unit: {serialNumber}</h1>
          <p className="checklist-type">Annual Maintenance Checklist</p>
          <p className="checklist-info">Public Token: {publicToken.toUpperCase()}</p>
        </header>

        {/* EMBED AREA (Currently Placeholder) */}
        <main className="form-embed-area">
            <div style={{ padding: '20px', textAlign: 'center' }}>
                <p>--- Placeholder for Annual Fillout Form iFrame ---</p>
                <p>The form will appear here soon.</p>
            </div>
        </main>

        {/* FOOTER */}
        <footer className="checklist-footer">
          <Link href={`/swift/${publicToken}`} className="back-link">
            &larr; Back to Unit Selection
          </Link>
        </footer>
      </div>
    </>
  );
}