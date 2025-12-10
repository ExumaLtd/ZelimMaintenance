import Head from "next/head";
import Link from "next/link";
import Airtable from "airtable";
import Script from "next/script";

// ==========================================================
// SERVER-SIDE DATA FETCH — CLEAN PRODUCTION VERSION
// ==========================================================

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
      return { redirect: { destination: "/", permanent: false } };
    }

    const record = records[0];

    const unitDetails = {
      serial_number: record.get("serial_number") || "N/A",
      formId: record.get("annual_form_id") || "m5vA7bq5tcus",
    };

    return {
      props: { unit: unitDetails, publicToken },
    };
  } catch (error) {
    // Production-safe fallback
    return { redirect: { destination: "/", permanent: false } };
  }
}

// ==========================================================
// PAGE COMPONENT
// ==========================================================

export default function AnnualMaintenancePage({ unit, publicToken }) {
  const serialNumber = unit.serial_number;
  const formId = unit.formId;

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

                <Script
                  src="https://server.fillout.com/embed/v1/"
                  strategy="afterInteractive"
                />
              </>
            ) : (
              <div style={{ padding: "20px", textAlign: "center", color: "#bdc4c6" }}>
                <p>Form Not Available. Please check Airtable configuration.</p>
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
