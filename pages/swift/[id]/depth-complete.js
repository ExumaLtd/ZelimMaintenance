// pages/swift/[id]/depth-complete.js

import Head from "next/head";
import Link from "next/link";

export default function DepthComplete({ unit }) {
  return (
    <>
      <Head>
        <title>Depth Maintenance Complete</title>
      </Head>

      <div className="swift-checklist-container complete-page">
        <div className="checklist-logo">
          <img src="/logo/zelim-logo.svg" alt="Zelim Logo" />
        </div>

        <h1 className="checklist-hero-title">
          {unit.model} {unit.serial_number}
          <span className="break-point">30-Month Depth Maintenance</span>
        </h1>

        <p className="completion-message">
          The depth maintenance checklist has been successfully submitted.
        </p>

        <div className="complete-actions">
          <Link
            href={`/swift/${unit.public_token}`}
            className="primary-btn complete-btn"
          >
            Return to portal
          </Link>
        </div>
      </div>
    </>
  );
}

// === SSR to fetch unit details ===
export async function getServerSideProps({ params }) {
  const token = params.id;

  const req = await fetch(
    `${process.env.AIRTABLE_API_URL}/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_SWIFT_TABLE}?filterByFormula={public_token}='${token}'`,
    {
      headers: {
        Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
      },
    }
  );

  const json = await req.json();
  if (!json.records.length) return { notFound: true };

  const rec = json.records[0];

  return {
    props: {
      unit: {
        serial_number: rec.fields.serial_number,
        model: rec.fields.model,
        public_token: rec.fields.public_token,
      },
    },
  };
}
