// pages/swift/[id]/annual.js - ANNUAL CHECKLIST PAGE

import Head from "next/head";
import Link from "next/link";

// --- Data Fetching (Required for Dynamic Title) ---
export async function getServerSideProps(context) {
  const publicToken = context.params.id;

  // *** IMPORTANT: REPLACE THIS PLACEHOLDER WITH YOUR ACTUAL API CALL to Airtable ***
  const unitDetails = {
    swift_serial: "SWI001", // <<< MUST BE FETCHED
    public_token: publicToken,
  };

  if (!unitDetails.swift_serial) {
    return { notFound: true };
  }

  return {
    props: { unit: unitDetails },
  };
}

// --- Component Definition ---

export default function AnnualMaintenancePage({ unit }) {

  if (!unit) {
    return <p className="loading-state">Loading...</p>;
  }
  
  return (
    <>
      <Head>
        {/* DYNAMIC BROWSER TAB TITLE: SWIFT | Serial Number Annual Maintenance */}
        <title>SWIFT | {unit.swift_serial} Annual Maintenance</title>
      </Head>

      <div className="swift-checklist-container">
        
        <header className="checklist-header">
          <h1 className="unit-title">{unit.swift_serial}</h1>
          <h2 className="checklist-type">Annual Maintenance Checklist</h2>
        </header>

        <main className="form-embed-area">
            {/* The form embed will go here later */}
            <p>Annual Maintenance Content Placeholder.</p>
        </main>

        <footer className="checklist-footer">
          <Link href={`/swift/${unit.public_token}`} className="back-link">
            &larr; Back to Checklist Selection
          </Link>
        </footer>
      </div>
    </>
  );
}