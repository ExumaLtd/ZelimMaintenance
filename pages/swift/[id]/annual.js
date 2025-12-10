// pages/swift/[id]/annual.js - FULL FILE WITH DEBUGGING & STANDARD FILLOUT EMBED

import Head from "next/head";
import Link from "next/link";
import Airtable from "airtable";
import Script from "next/script";

// ==========================================================
// 🔍 SERVER-SIDE DATA FETCH (Debug Version)
// ==========================================================

export async function getServerSideProps(context) {
  const publicToken = context.params.id;

  console.log("======= DEBUG: /annual getServerSideProps =======");
  console.log("URL publicToken:", publicToken);

  try {
    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
      process.env.AIRTABLE_BASE_ID
    );

    const TABLE_NAME = process.env.AIRTABLE_SWIFT_TABLE;

    console.log("Using Airtable table:", TABLE_NAME);
    console.log("Using Base ID:", process.env.AIRTABLE_BASE_ID);
    console.log("API KEY present:", !!process.env.AIRTABLE_API_KEY);

    const formula = `{public_token} = "${publicToken}"`;
    console.log("Filter formula:", formula);

    const records = await base(TABLE_NAME)
      .select({
        maxRecords: 1,
        filterByFormula: formula,
        fields: ["serial_number", "annual_form_id"],
      })
      .firstPage();

    console.log("Records returned:", records.length);

    if (!records || records.length === 0) {
      console.log("❌ No Airtable match found — redirecting to /");
      return { redirect: { destination: "/", permanent: false } };
    }

    const record = records[0];

    console.log("Record fields:");
    console.log("serial_number:", record.get("serial_number"));
    console.log("annual_form_id:", record.get("annual_form_id"));

    const unitDetails = {
      serial_number: record.get("serial_number") || "N/A",
      formId: record.get("annual_form_id") || "m5vA7bq5tcus",
    };

    console.log("Returning props:", unitDetails);

    return {
      props: { unit: unitDetails, publicToken },
    };
  } catch (error) {
    console.log("❌ ERROR in /annual getServerSideProps:", error);
    return { redirect: { destination: "/", permanent: false } };
  }
}

// ==========================================================
// 🔧 PAGE COMPONENT
// ==========================================================

export default function AnnualMaintenancePage({ unit, publicToken }) {
  const serialNumber = unit.serial_number;
  const formId = unit.formId;

  // Fillout expects the form ID + query parameters
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

          {/* HEADER */}
          <header className="checklist-header">
            <h1 className="unit-title">SWIFT Unit: {serialNumber}</h1>
            <p className="checklist-type">Annual Maintenance Checklist</p>
            <p className="checklist-info">Token: {publicToken.toUpperCase()}</p>
          </header>

          {/* FORM EMBED */}
          <main className="form-embed-area">
            {formId ? (
              <>
                <div
                  style={{ width: "100%", minHeight: "800px" }}
                  data-fillout-id={dataFilloutId}
                  data-fillout-embed-type="standard"
                  data-fillout-inherit-parameters
                  data-fillout-dynamic-resize
                >
                  <p
                    style={{
                      textAlign: "center",
                      color: "#A0ACAF",
                      padding: "50px 0",
                    }}
                  >
                    Loading form...
                  </p>
                </div>

                {/* Fillout Script Loader */}
                <Script
                  src="https://server.fillout.com/embed/v1/"
                  strategy="afterInteractive"
                />
              </>
            ) : (
              <div
                style={{
                  padding: "20px",
                  textAlign: "center",
                  color: "#bdc4c6",
                }}
              >
                <p>Form Not Available. Please check Airtable config.</p>
              </div>
            )}
          </main>

          {/* FOOTER */}
          <footer className="checklist-footer">
            <Link href={`/swift/${publicToken}`} className="back-link">
              &larr; Back to Unit Overview
            </Link>
          </footer>
        </div>
      </div>
    </div>
  );
}
