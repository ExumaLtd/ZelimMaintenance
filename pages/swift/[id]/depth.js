// pages/swift/[id]/depth.js - DEPTH CHECKLIST PAGE

import Head from "next/head";
import Link from "next/link";

// --- Data Fetching (Required for Dynamic Title) ---
export async function getServerSideProps(context) {
  const publicToken = context.params.id;

  try {
    // *** IMPORTANT: REPLACE THIS PLACEHOLDER WITH YOUR ACTUAL API CALL to Airtable ***
    // This call must use the publicToken to fetch the corresponding SWIFT unit's details.
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
  } catch (error) {
    console.error("Error fetching unit data for depth checklist:", error);
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    }
  }
}

// --- Component Definition ---

export default function DepthMaintenancePage({ unit }) {

  if (!unit) {
    return <p className="loading-state">Loading...</p>;
  }
  
  return (
    <>
      <Head>
        {/* DYNAMIC BROWSER TAB TITLE: SWIFT | Serial Number Depth Maintenance */}
        <title>SWIFT | {unit.swift_serial} Depth Maintenance</title>
      </Head>

      <div className="swift-checklist-container">
        
        <header className="checklist-header">
          <h1 className="unit-title">{unit.swift_serial}</h1>
          <h2 className="checklist-type">Depth Maintenance Checklist</h2>
        </header>

        <main className="form-embed-area">
            {/* The form embed will go here later */}
            <p>Depth Maintenance Content Placeholder.</p>
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