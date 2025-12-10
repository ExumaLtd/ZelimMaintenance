// pages/swift/[id]/annual.js - FINAL CODE WITH STANDARD FILLOUT EMBED

import Head from "next/head";
import Link from "next/link";
import Airtable from "airtable";
import Script from "next/script"; // <-- REQUIRED for reliable script loading

// --- Data Fetching (runs on server before page load) ---
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
        fields: ["serial_number", "annual_form_id"], 
      })
      .firstPage();

    if (!records || records.length === 0) {
      return { redirect: { destination: '/', permanent: false } };
    }
    
    const record = records[0];
    const unitDetails = {
      serial_number: record.get("serial_number") || "N/A",
      // Use the actual Form ID from your Airtable record, or hardcode the one you provided if it's the same for all annual checks
      formId: record.get("annual_form_id") || "m5vA7bq5tcus", 
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
  const formId = unit.formId;

  // Fillout requires parameters to be passed in the 'data-fillout-id' attribute, 
  // appended to the base form ID.
  const dataFilloutId = formId 
    ? `${formId}?public_token=${publicToken}&swift_serial=${serialNumber}` 
    : null;

  return (
    <div className="swift-main-layout-wrapper">
      <div className="page-wrapper">
        <Head>
          <title>SWIFT Annual Checklist | {serialNumber}</title>
        </Head>

        <div className="swift-checklist-container">
          
          <header className="checklist-header">
            <h1 className="unit-title">SWIFT Unit: {serialNumber}</h1>
            <p className="checklist-type">Annual Maintenance Checklist</p>
            <p className="checklist-info">Token: {publicToken.toUpperCase()}</p>
          </header>

          <main className="form-embed-area">
            {formId ? (
              <>
                {/* 1. The Fillout container DIV (Standard Embed) */}
                <div 
                  style={{ width: '100%', minHeight: '800px' }} 
                  data-fillout-id={dataFilloutId}
                  data-fillout-embed-type="standard"
                  data-fillout-inherit-parameters
                  data-fillout-dynamic-resize
                >
                  {/* Fallback content while script loads */}
                  <p style={{ textAlign: 'center', color: '#A0ACAF', padding: '50px 0' }}>Loading form...</p>
                </div>

                {/* 2. The Next.js Script Loader (Crucial for resolving the 404 cache issue) */}
                <Script src="https://server.fillout.com/embed/v1/" strategy="afterInteractive" />
              </>
            ) : (
              // Fallback if formId is missing
              <div style={{ padding: '20px', textAlign: 'center', color: '#bdc4c6' }}>
                  <p>Form Not Available. Please ensure the form ID is configured in Airtable.</p>
              </div>
            )}
          </main>

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