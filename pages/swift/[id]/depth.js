import Head from "next/head";
import Link from "next/link";
import Airtable from "airtable";

export async function getServerSideProps({ params }) {
  const token = params.id;

  try {
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_API_KEY,
    }).base(process.env.AIRTABLE_BASE_ID);

    const records = await base(process.env.AIRTABLE_SWIFT_TABLE)
      .select({
        maxRecords: 1,
        filterByFormula: `{public_token} = "${token}"`,
        fields: ["serial_number", "depth_form_id"],
      })
      .firstPage();

    if (!records.length) return { notFound: true };

    const record = records[0];

    return {
      props: {
        publicToken: token,
        unit: {
          serial_number: record.get("serial_number"),
          formId: record.get("depth_form_id"),
        },
      },
    };
  } catch (err) {
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
              <iframe title="Depth Maintenance Form" src={formUrl} allowFullScreen />
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
