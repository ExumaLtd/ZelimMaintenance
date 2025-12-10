// pages/swift/[id]/depth.js - FINAL STRUCTURE

import Head from "next/head";
import Link from "next/link";
import Airtable from "airtable";

// --- Data Fetching (Keep this as is) ---
export async function getServerSideProps(context) {
  // ... data fetching logic ... (KEEP THIS THE SAME)
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
        fields: ["serial_number", "depth_form_id"], 
      })
      .firstPage();

    if (!records || records.length === 0) {
      return { redirect: { destination: '/', permanent: false } };
    }
    
    const record = records[0];
    const unitDetails = {
      serial_number: record.get("serial_number") || "N/A",
      formId: record.get("depth_form_id") || null,
    };

    return {
      props: { unit: unitDetails, publicToken },
    };
  } catch (error) {
    console.error("Error fetching unit data for depth page:", error);
    return { redirect: { destination: '/', permanent: false } };
  }
}


// --- Component Definition ---

export default function DepthMaintenancePage({ unit, publicToken }) {
  const serialNumber = unit.serial_number;
  const formId = unit.formId;

  const filloutUrl = formId 
    ? `https://forms.fillout.com/${formId}?unit_public_token=${publicToken}&embed=true`
    : null;

  return (
    // WRAPPED IN GLOBAL LAYOUTS
    <div className="swift-main-layout-wrapper">
      <div className="page-wrapper">
        <Head>
          <title>SWIFT Depth Checklist | {serialNumber}</title>
        </Head>

        {/* Use the central container for styling */}
        <div className="swift-checklist-container">
          
          {/* HEADER (Styled by checklist.css) */}
          <header className="checklist-header">
            <h1 className="unit-title">SWIFT Unit: {serialNumber}</h1>
            <p className="checklist-type">Depth Maintenance Checklist</p>
            <p className="checklist-info">Token: {publicToken.toUpperCase()}</p>
          </header>

          {/* EMBED AREA (Styled by checklist.css) */}
          <main className="form-embed-area">
            {formId ? (
              <iframe
                title="Depth Maintenance Form"
                src={filloutUrl}
                /* REMOVED INLINE STYLES - Now handled by checklist.css */
                allowFullScreen
              />
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: '#bdc4c6' }}>
                  <p>Form Not Available. Please ensure the form ID is configured in Airtable.</p>
              </div>
            )}
          </main>

          {/* FOOTER (Styled by checklist.css) */}
          <footer className="checklist-footer">
            <Link href={`/swift/${publicToken}`} className="back-link">
              &larr; Back to Unit Selection
            </Link>
          </footer>
        </div>
      </div>
    </div>
  );
}