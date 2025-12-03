// pages/swift/[id]/index.js - WELCOME & SELECTION PAGE

import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";

// --- Component Definition ---

export default function UnitSelectionPage() {
  const router = useRouter();
  // The 'id' variable contains the unit's publicToken from the URL
  const { id } = router.query; 

  // Use a placeholder title until we fetch the actual unit name later
  const unitName = "SWIFT Unit"; 

  if (!id) {
    return (
      <div className="loading-state">
        <p>Loading Unit Data...</p>
      </div>
    );
  }

  // --- JSX Output ---
  return (
    <>
      <Head>
        <title>{unitName} - Select Checklist</title>
      </Head>

      <div className="swift-unit-container">
        
        {/* 1. HEADER / WELCOME MESSAGE */}
        <header className="unit-header">
          <h1 className="unit-title">Welcome to the Portal</h1>
          <p className="unit-subtitle">Unit ID: {id.toUpperCase()}</p>
          <p className="unit-instruction">Please select the type of maintenance you will be completing today.</p>
        </header>

        {/* 2. NAVIGATION / CHECKLISTS */}
        <main className="checklist-navigation">
          
          <div className="checklist-link-stack">
            
            {/* LINK 1: ANNUAL MAINTENANCE */}
            <Link href={`/swift/${id}/annual`} className="nav-card primary-card">
              <div className="card-content">
                <h3>Annual Maintenance</h3>
                <p>Full system inspection and recertification.</p>
              </div>
            </Link>

            {/* LINK 2: DEPTH MAINTENANCE */}
            <Link href={`/swift/${id}/depth`} className="nav-card secondary-card">
              <div className="card-content">
                <h3>Depth Maintenance</h3>
                <p>In-depth component servicing and calibration.</p>
              </div>
            </Link>

          </div>
        </main>

        {/* 3. LOGOUT / BACK LINK */}
        <footer className="unit-footer">
          <Link href="/" className="logout-link">
            Log Out / Change Unit
          </Link>
        </footer>
      </div>
    </>
  );
}