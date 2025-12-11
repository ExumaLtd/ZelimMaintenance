// pages/swift/[id]/depth.js

import Head from "next/head";
import Link from "next/link";

export async function getServerSideProps({ params }) {
  const token = params.id;

  const formula = `AND({public_token} = "${token}")`;
  const url = `${process.env.AIRTABLE_API_URL}/${process.env.AIRTABLE_SWIFT_TABLE}?filterByFormula=${encodeURIComponent(
    formula
  )}`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}` },
    });

    const json = await res.json();
    if (!json.records.length) return { notFound: true };

    const record = json.records[0].fields;

    return {
      props: {
        publicToken: token,
        unit: {
          serial_number: record.serial_number,
          formId: record.depth_form_id,
        },
      },
    };
  } catch (err) {
    console.error("Depth SSR error:", err);
    return { notFound: true };
  }
}

export default function DepthMaintenancePage({ unit, publicToken }) {
  const formUrl = unit.formId
    ? `https://forms.fillout.com/${unit.formId}?unit_public_token=${publicToken}&embed=true`
    : null;

  return (
    <div className="swift-main-layout-wrapper">
      <div className="page-wrapper">
        <Head>
          <title>SWIFT Depth Checklist | {unit.serial_number}</title>
        </Head>

        <div className="swift-checklist-container">
          <header className="checklist-header">
            <h1 className="unit-title">SWIFT Unit: {unit.serial_number}</h1>
            <p className="checklist-type">Depth Maintenance Checklist</p>
            <p className="checklist-info">Token: {publicToken}</p>
          </header>

          <main className="form-embed-area">
            {formUrl ? (
              <iframe
                title="Depth Maintenance Form"
                src={formUrl}
                allowFullScreen
              />
            ) : (
              <p style={{ textAlign: "center" }}>Form not found.</p>
            )}
          </main>

          <footer className="checklist-footer">
            <Link href={`/swift/${publicToken}`} className="back-link">
              ← Back to Unit Home
            </Link>
          </footer>
        </div>
      </div>
    </div>
  );
}
