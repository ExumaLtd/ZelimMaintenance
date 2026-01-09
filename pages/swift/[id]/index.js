import Link from "next/link";
import Head from "next/head";

// --- LOGO LOGIC ---
const getClientLogo = (companyName, serialNumber) => {
  const sn = serialNumber || "";
  const cn = companyName || "";
  if (["SWI001", "SWI002"].includes(sn) || cn.includes("Changi")) {
    return { src: "/client_logos/changi_airport/ChangiAirport_Logo(White).svg", alt: "Changi Airport Group" };
  }
  if (sn === "SWI003" || cn.includes("Milford Haven")) {
    return { src: "/client_logos/port_of_milford_haven/PortOfMilfordHaven(White).svg", alt: "Port of Milford Haven" };
  }
  if (["SWI010", "SWI011"].includes(sn) || cn.includes("Hatloy")) {
    return { src: "/client_logos/Hatloy Maritime/HatloyMaritime_Logo(White).svg", alt: "Hatloy Maritime" };
  }
  return null;
};

export default function UnitDashboard({ unit }) {
  const logo = getClientLogo(unit?.company, unit?.serial_number);

  return (
    <div className="dashboard-scope">
      <Head>
        <title>{unit?.serial_number} | Dashboard</title>
        {/* EMBEDDED STYLES TO FORCE LAYOUT FIX */}
        <style>{`
          .dashboard-scope {
            font-family: 'Montserrat', sans-serif;
            color: #ffffff;
            width: 100%;
          }
          .dashboard-scope .swift-main-layout-wrapper {
            position: relative;
            width: 100%;
            padding: 0 40px;
          }
          .dashboard-scope .page-wrapper {
            max-width: 1280px;
            width: 100%;
            margin: 0 auto;
          }
          /* GRID LAYOUT - FORCES SIDE BY SIDE */
          .dashboard-scope .swift-dashboard-container {
            display: grid;
            grid-template-columns: 325px 1fr; /* Fixed Left, Fluid Right */
            gap: 40px;
            width: 100%;
            margin-top: 60px;
            margin-bottom: 40px;
          }

          /* LEFT PANEL */
          .dashboard-scope .detail-panel {
            grid-column: 1;
            text-align: left;
          }
          .dashboard-scope .logo-section {
            margin-bottom: 40px;
            display: block;
          }
          .dashboard-scope .logo-section img {
            max-width: 200px;
            height: auto;
            display: block;
          }
          .dashboard-scope .portal-title {
            color: #FFF;
            font-size: 30px;
            font-weight: 600;
            line-height: 38px;
            margin: 0 0 34px;
          }
          .dashboard-scope .portal-title .title-line {
            display: block; /* Forces line break */
            width: 100%;
          }
          .dashboard-scope .maintenance-details {
            display: flex;
            flex-direction: column;
            gap: 16px;
            margin-top: 20px;
            border-top: 1px solid rgba(160, 172, 175, 0.20);
            padding-top: 20px;
          }
          .dashboard-scope .detail-item {
            display: flex;
            flex-direction: column;
            gap: 4px;
            border-bottom: 1px solid rgba(160, 172, 175, 0.20);
            padding-bottom: 12px;
          }
          .dashboard-scope .detail-item:last-child {
            border-bottom: none;
          }
          .dashboard-scope .detail-label {
            color: #A0ACAF;
            font-size: 14px;
            font-weight: 500;
            margin: 0;
          }
          .dashboard-scope .detail-value {
            color: #F7F7F7;
            font-size: 20px;
            font-weight: 600;
            margin: 0;
          }

          /* RIGHT PANEL (GRID CARDS) */
          .dashboard-scope .action-panel {
            grid-column: 2;
            width: 100%;
          }
          .dashboard-scope .maintenance-group-wrapper {
            background: #152A31;
            width: 100%;
            border-radius: 20px;
            padding: 30px;
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
          }
          /* CARD STYLING */
          .dashboard-scope .maintenance-card {
            flex: 1 1 calc(50% - 20px); /* 2 per row approx, or flex */
            min-width: 280px;
            background: linear-gradient(39deg, rgba(74, 98, 104, 0.20) 12.44%, rgba(74, 98, 104, 0.00) 87.56%);
            border-radius: 10px;
            padding: 25px 30px 30px;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
          }
          .dashboard-scope .maintenance-card h3 {
            color: #f7f7f7;
            font-size: 20px;
            font-weight: 600;
            margin: 0 0 10px;
          }
          .dashboard-scope .description {
            color: #A0ACAF;
            font-size: 14px;
            line-height: 20px;
            margin: 0 0 24px;
            flex-grow: 1;
          }
          .dashboard-scope .start-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            background-color: #00FFF6;
            color: #0D3037;
            font-weight: 700;
            font-size: 14px;
            padding: 10px 20px;
            border-radius: 6px;
            text-decoration: none;
            width: fit-content;
            transition: opacity 0.2s;
          }
          .dashboard-scope .start-btn:hover {
            opacity: 0.9;
          }
          .dashboard-scope .start-btn i {
            font-size: 12px;
          }

          /* MOBILE RESPONSIVE */
          @media (max-width: 900px) {
            .dashboard-scope .swift-dashboard-container {
              grid-template-columns: 1fr;
              margin-top: 30px;
            }
            .dashboard-scope .swift-main-layout-wrapper {
              padding: 0 20px;
            }
            .dashboard-scope .detail-panel {
               text-align: center;
               margin-bottom: 30px;
            }
            .dashboard-scope .logo-section {
               margin: 0 auto 30px auto;
               display: flex;
               justify-content: center;
            }
            .dashboard-scope .maintenance-details {
              border-top: none;
              flex-direction: row;
              justify-content: center;
              gap: 30px;
            }
          }
          @media (max-width: 600px) {
            .dashboard-scope .maintenance-details {
               flex-direction: column;
               gap: 15px;
            }
            .dashboard-scope .maintenance-card {
               width: 100%;
               flex: 1 1 100%;
            }
          }
        `}</style>
      </Head>

      <div className="swift-main-layout-wrapper">
        <div className="page-wrapper">
          <div className="swift-dashboard-container">
            
            {/* LEFT PANEL: Details & Logo */}
            <div className="detail-panel">
              <div className="logo-section">
                {logo && <img src={logo.src} alt={logo.alt} />}
              </div>
              
              <h1 className="portal-title">
                <span className="title-line">{unit?.serial_number}</span>
                <span className="title-line">maintenance dashboard</span>
              </h1>

              <div className="maintenance-details">
                <div className="detail-item">
                  <p className="detail-label">Client</p>
                  <p className="detail-value">{unit?.company || "N/A"}</p>
                </div>
                <div className="detail-item">
                  <p className="detail-label">Status</p>
                  <p className="detail-value">Operational</p>
                </div>
              </div>
            </div>

            {/* RIGHT PANEL: 3 Maintenance Cards */}
            <div className="action-panel">
              <div className="maintenance-group-wrapper">
                
                {/* 1. Annual */}
                <div className="maintenance-card">
                  <h3>Annual Maintenance</h3>
                  <p className="description">Standard yearly inspection and certification check.</p>
                  <Link href={`/swift/${unit.public_token}/annual`} className="start-btn">
                    Start check <i className="fa-solid fa-chevron-right"></i>
                  </Link>
                </div>

                {/* 2. Unscheduled */}
                <div className="maintenance-card">
                  <h3>Unscheduled Maintenance</h3>
                  <p className="description">To be completed in accordance with the SWIFT Survivor Recovery System Maintenance Manual.</p>
                  <Link href={`/swift/${unit.public_token}/unscheduled`} className="start-btn">
                    Start report <i className="fa-solid fa-chevron-right"></i>
                  </Link>
                </div>

                {/* 3. Depth */}
                <div className="maintenance-card">
                  <h3>Depth Maintenance</h3>
                  <p className="description">Extended 3-year or 5-year heavy maintenance cycle.</p>
                  <Link href={`/swift/${unit.public_token}/depth`} className="start-btn">
                    Start check <i className="fa-solid fa-chevron-right"></i>
                  </Link>
                </div>

              </div>
            </div>

          </div>
        </div>
      </div>

      <div className="fixed-zelim-logo" style={{position:'fixed', bottom:'50px', left:'50%', transform:'translateX(-50%)'}}>
        <a href="https://www.zelim.ai" target="_blank" rel="noreferrer">
          <img src="/Zelim_Logo(White).svg" alt="Zelim Logo" style={{height:'30px'}} />
        </a>
      </div>
    </div>
  );
}

export async function getServerSideProps({ params }) {
  const token = params.id;
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const tableName = process.env.AIRTABLE_SWIFT_TABLE || "swift_units";

  try {
    const unitFormula = encodeURIComponent(`{public_token}='${token}'`);
    const res = await fetch(`https://api.airtable.com/v0/${baseId}/${tableName}?filterByFormula=${unitFormula}`, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    const data = await res.json();
    if (!data.records || data.records.length === 0) return { notFound: true };
    const record = data.records[0];

    return {
      props: {
        unit: {
          serial_number: record.fields.unit_name || record.fields.serial_number || "Unit",
          company: record.fields.company || "",
          public_token: record.fields.public_token || token
        }
      }
    };
  } catch (err) { 
    console.error("Dashboard Server Error:", err.message);
    return { notFound: true }; 
  }
}