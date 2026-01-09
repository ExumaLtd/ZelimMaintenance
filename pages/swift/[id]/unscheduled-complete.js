import Head from "next/head";
import Image from "next/image";
import Link from "next/link";

export default function UnscheduledComplete({ unit }) {
  return (
    <div className="form-scope">
      <Head>
        <title>Submission Successful | SWIFT</title>
      </Head>

      <div className="swift-main-layout-wrapper">
        <div className="page-wrapper">
          <div className="swift-checklist-container complete-page">
            
            <div className="checklist-logo">
              <img src="/logo/zelim-logo.svg" alt="Zelim Logo" />
            </div>

            <h1 className="checklist-hero-title">
              {unit?.serial_number}
              <span className="break-point" style={{ color: '#01FFF6' }}>Unscheduled maintenance submitted</span>
            </h1>

            <div className="checklist-form-card" style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: "64px", color: "#01FFF6", marginBottom: "20px" }}>
                ✓
              </div>

              <p style={{ color: "#FFFFFF", marginBottom: "32px", fontSize: "18px", lineHeight: "26px" }}>
                Your maintenance record has been successfully uploaded and the system logs have been updated.
              </p>

              <Link 
                href={`/swift/${unit?.public_token}`} 
                className="checklist-submit" 
                style={{ margin: "0 auto", textDecoration: "none", display: "inline-block" }}
              >
                Return to portal
              </Link>
            </div>
          </div>
        </div>

        <footer className="footer-section">
          <a href="https://www.zelim.com" target="_blank" rel="noopener noreferrer">
            <Image 
              src="/logo/zelim-logo.svg" 
              width={120} 
              height={40} 
              alt="Zelim logo" 
              style={{ opacity: 1 }} 
            />
          </a>
        </footer>
      </div>
    </div>
  );
}

export async function getServerSideProps({ params }) {
  const token = params.id;
  try {
    const apiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;
    const tableName = process.env.AIRTABLE_SWIFT_TABLE || "swift_units"; 
    
    if (!apiKey || !baseId) throw new Error("Missing Airtable Env");

    const formula = encodeURIComponent(`{public_token}='${token}'`);
    const url = `https://api.airtable.com/v0/${baseId}/${tableName}?filterByFormula=${formula}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    
    const data = await res.json();

    if (!data.records || data.records.length === 0) {
      return { notFound: true };
    }

    const rec = data.records[0];
    return {
      props: {
        unit: {
          serial_number: rec.fields.unit_name || rec.fields.serial_number || "Unit",
          public_token: rec.fields.public_token || token,
        },
      },
    };
  } catch (err) {
    console.error("Success Page Error:", err.message);
    return { notFound: true };
  }
}