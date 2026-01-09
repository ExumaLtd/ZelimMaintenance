import Link from "next/link";
import Head from "next/head";

const getClientLogo = (companyName, serialNumber) => {
  const sn = serialNumber || "";
  const cn = companyName || "";
  if (["SWI001", "SWI002"].includes(sn) || cn.includes("Changi")) {
    return { src: "/client_logos/changi_airport/ChangiAirport_Logo(White).svg", alt: "Logo" };
  }
  if (sn === "SWI003" || cn.includes("Milford Haven")) {
    return { src: "/client_logos/port_of_milford_haven/PortOfMilfordHaven(White).svg", alt: "Logo" };
  }
  if (["SWI010", "SWI011"].includes(sn) || cn.includes("Hatloy")) {
    return { src: "/client_logos/Hatloy Maritime/HatloyMaritime_Logo(White).svg", alt: "Logo" };
  }
  return null;
};

export default function UnitDashboard({ unit }) {
  const logo = getClientLogo(unit?.company, unit?.serial_number);

  return (
    <div className="dashboard-scope">
      <Head>
        <title>{unit?.serial_number} | Dashboard</title>
      </Head>

      <div className="swift-main-layout-wrapper">
        <div className="page-wrapper">
          <div className="swift-dashboard-container">
            
            {/* DETAIL PANEL (Left) */}
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

            {/* ACTION PANEL (Right) */}
            <div className="action-panel">
              <div className="maintenance-group-wrapper">
                
                {/* Annual Maintenance */}
                <div className="maintenance-card">
                  <h3>Annual Maintenance</h3>
                  <p className="description">Standard yearly inspection and certification check.</p>
                  <Link href={`/swift/${unit.public_token}/annual`} className="start-btn">
                    Start check <i className="fa-solid fa-chevron-right"></i>
                  </Link>
                </div>

                {/* Unscheduled Maintenance */}
                <div className="maintenance-card">
                  <h3>Unscheduled Maintenance</h3>
                  <p className="description">To be completed in accordance with the SWIFT Survivor Recovery System Maintenance Manual.</p>
                  <Link href={`/swift/${unit.public_token}/unscheduled`} className="start-btn">
                    Start report <i className="fa-solid fa-chevron-right"></i>
                  </Link>
                </div>

                {/* Depth Maintenance */}
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

      <div className="fixed-zelim-logo">
        <a href="https://www.zelim.ai" target="_blank" rel="noreferrer">
          <img src="/Zelim_Logo(White).svg" alt="Zelim Logo" />
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