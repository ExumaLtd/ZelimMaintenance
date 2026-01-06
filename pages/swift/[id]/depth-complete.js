// pages/swift/[id]/depth-complete.js
import Head from "next/head";
import Link from "next/link";

export default function DepthComplete({ unit }) {
  return (
    <div className="form-scope">
      <Head>
        <title>Depth Maintenance Complete</title>
      </Head>

      <div className="swift-main-layout-wrapper">
        <div className="page-wrapper">
          <div className="swift-checklist-container complete-page">
            <div className="checklist-logo">
              <img src="/logo/zelim-logo.svg" alt="Zelim Logo" />
            </div>

            <h1 className="checklist-hero-title">
              {unit.serial_number}
              <span className="break-point">30-Month Depth Maintenance</span>
            </h1>

            <div className="checklist-form-card" style={{ textAlign: 'center' }}>
              <p className="completion-message" style={{ color: 'white', fontSize: '18px', marginBottom: '30px' }}>
                The depth maintenance checklist has been successfully submitted.
              </p>

              <Link href={`/swift/${unit.public_token}`} className="checklist-submit" style={{ margin: '0 auto', textDecoration: 'none' }}>
                Return to portal
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export async function getServerSideProps({ params }) {
  const token = params.id;
  const req = await fetch(`${process.env.AIRTABLE_API_URL}/${process.env.AIRTABLE_SWIFT_TABLE}?filterByFormula={public_token}='${token}'`, {
    headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}` },
  });
  const json = await req.json();
  if (!json.records?.length) return { notFound: true };
  const rec = json.records[0];
  return {
    props: {
      unit: {
        serial_number: rec.fields.serial_number,
        public_token: rec.fields.public_token,
      },
    },
  };
}