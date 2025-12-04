// pages/swift/[id]/depth.js - DEPTH CHECKLIST PAGE (FINAL)

import Head from "next/head";
import Link from "next/link";
import Airtable from "airtable";

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
        // Fetch serial_number and form ID
        fields: ["serial_number", "depth_form_id"], 
      })
      .firstPage();

    if (!records || records.length === 0) {
      return { redirect: { destination: '/', permanent: false } };
    }
    
    const record = records[0];
    const unitDetails = {
      serial_number: record.get("serial_number") || "N/A",
      // Pass the form ID to the component
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

  // 🚨 CORRECTED URL STRUCTURE for robust embedding and prefill
  const filloutUrl = formId 
    ? `https://forms.fillout.com/${formId}?unit_public_token=${publicToken}&embed=true`
    : null;

  return (
    <>
      <Head>
        {/* DYNAMIC BROWSER TAB TITLE: SWIFT Depth Checklist | Serial Number */}
        <title>SWIFT Depth Checklist | {serialNumber}</title>
      </Head>

      <div className="swift-checklist-container">
        
        {/* HEADER */}
        <header className="checklist-header">
          <h1 className="unit-title">SWIFT Unit: {serialNumber}</h1>
          <p className="checklist-type">Depth Maintenance Checklist</p>
          <p className="checklist-info">Public Token: {publicToken.toUpperCase()}</p>
        </header>

        {/* EMBED AREA - Now using iFrame */}
        <main className="form-embed-area">
          {formId ? (
            <iframe
              title="Depth Maintenance Form"
              src={filloutUrl}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                backgroundColor: 'white' 
              }}
              allowFullScreen
            />
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', color: '#bdc4c6' }}>
                <p>Form Not Available. Please ensure the form ID is configured in Airtable.</p>
            </div>
          )}
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