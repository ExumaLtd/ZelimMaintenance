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
          <div className="swift-checklist-container">
            {logo && <div className="checklist-logo"><img src={logo.src} alt={logo.alt} /></div>}

            <h1 className="checklist-hero-title">
              {unit?.serial_number}
              <span className="break-point">maintenance dashboard</span>
            </h1>

            <div className="dashboard-grid">
              {/* Annual Maintenance Card */}
              <Link href={`/swift/${unit.public_token}/annual`} className="maintenance-card">
                <div className="card-content">
                  <div className="card-icon">
                    <i className="fa-solid fa-calendar-check"></i>
                  </div>
                  <div className="card-text">
                    <h3>Annual Maintenance</h3>
                    <p>Standard yearly inspection and certification check.</p>
                  </div>
                </div>
                <i className="fa-solid fa-chevron-right arrow-icon"></i>
              </Link>

              {/* Unscheduled Maintenance Card - UPDATED WITH GENERIC TEXT */}
              <Link href={`/swift/${unit.public_token}/unscheduled`} className="maintenance-card">
                <div className="card-content">
                  <div className="card-icon">
                    <i className="fa-solid fa-screwdriver-wrench"></i>
                  </div>
                  <div className="card-text">
                    <h3>Unscheduled Maintenance</h3>
                    <p>To be completed in accordance with the SWIFT Survivor Recovery System Maintenance Manual.</p>
                  </div>
                </div>
                <i className="fa-solid fa-chevron-right arrow-icon"></i>
              </Link>

              {/* Depth Maintenance Card */}
              <Link href={`/swift/${unit.public_token}/depth`} className="maintenance-card">
                <div className="card-content">
                  <div className="card-icon">
                    <i className="fa-solid fa-gears"></i>
                  </div>
                  <div className="card-text">
                    <h3>Depth Maintenance</h3>
                    <p>Extended 3-year or 5-year heavy maintenance cycle.</p>
                  </div>
                </div>
                <i className="fa-solid fa-chevron-right arrow-icon"></i>
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
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const tableName = process.env.AIRTABLE_SWIFT_TABLE || "swift_units";

  if (!apiKey || !baseId) throw new Error("Missing Airtable Env");

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