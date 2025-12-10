import Head from "next/head";
import Script from "next/script";
import Link from "next/link";
import Airtable from "airtable";

/* -------------------------------------------------------
   CLIENT LOGO DETECTION — same logic as maintenance page
------------------------------------------------------- */
const getClientLogo = (companyName, serialNumber) => {
  if (
    serialNumber === "SWI001" ||
    serialNumber === "SWI002" ||
    (companyName && companyName.includes("Changi"))
  ) {
    return "/client_logos/changi_airport/ChangiAirport_Logo(White).svg";
  }

  if (
    serialNumber === "SWI003" ||
    (companyName && companyName.includes("Milford Haven"))
  ) {
    return "/client_logos/port_of_milford_haven/PortOfMilfordHaven(White).svg";
  }

  if (
    serialNumber === "SWI010" ||
    serialNumber === "SWI011" ||
    (companyName && companyName.includes("Hatloy Maritime"))
  ) {
    return "/client_logos/Hatloy Maritime/HatloyMaritime_Logo(White).svg";
  }

  return null;
};

/* -------------------------------------------------------
   SERVER-SIDE DATA FETCH (Airtable)
------------------------------------------------------- */
export async function getServerSideProps(context) {
  const publicToken = context.params.id;

  try {
    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
      process.env.AIRTABLE_BASE_ID
    );

    const TABLE_NAME = process.env.AIRTABLE_SWIFT_TABLE;

    const records = await base(TABLE_NAME)
      .select({
        maxRecords: 1,
        filterByFormula: `{public_token} = "${publicToken}"`,
        fields: ["serial_number", "company", "annual_form_id"],
      })
      .firstPage();

    if (!records || records.length === 0) {
      return { redirect: { destination: "/", permanent: false } };
    }

    const record = records[0];

    return {
      props: {
        unit: {
          serial_number: record.get("serial_number") || "N/A",
          company: record.get("company") || "",
          formId: record.get("annual_form_id") || "m5vA7bq5tcus",
        },
        publicToken,
      },
    };
  } catch (err) {
    return { redirect: { destination: "/", permanent: false } };
  }
}

/* -------------------------------------------------------
   PAGE COMPONENT — ANNUAL MAINTENANCE CHECKLIST
------------------------------------------------------- */
export default function AnnualMaintenancePage({ unit, publicToken }) {
  const serialNumber = unit.serial_number;
  const companyLogo = getClientLogo(unit.company, serialNumber);

  // Build Fillout embed URL
  const dataFilloutId = `${unit.formId}?public_token=${publicToken}&swift_serial=${serialNumber}`;

  return (
    <div className="swift-main-layout-wrapper">
      <div className="page-wrapper">

        {/* ---------------------------
            HEAD TAGS
        --------------------------- */}
        <Head>
          <title>SWIFT {serialNumber} annual maintenance</title>
          <meta
            name="description"
            content={`Annual maintenance checklist for SWIFT ${serialNumber}`}
          />
        </Head>

        <div className="swift-checklist-container">

          {/* ---------------------------
              HERO HEADER
          --------------------------- */}
          <header className="checklist-hero">

            {companyLogo && (
              <div className="checklist-logo">
                <img src={companyLogo} alt={`${unit.company} logo`} />
              </div>
            )}

            <h1 className="checklist-hero-title">
              SWIFT {serialNumber}
              <span className="break-point"></span>
              annual maintenance
            </h1>
          </header>

          {/* ---------------------------
              FORM EMBED AREA
          --------------------------- */}
          <main className="form-embed-area">
            <div
              data-fillout-id={dataFilloutId}
              data-fillout-embed-type="standard"
              data-fillout-inherit-parameters
              data-fillout-dynamic-resize
              style={{ width: "100%", minHeight: "900px" }}
            />
            <Script
              src="https://server.fillout.com/embed/v1/"
              strategy="afterInteractive"
            />
          </main>

          {/* ---------------------------
              FOOTER
          --------------------------- */}
          <footer className="checklist-footer">
            <Link href={`/swift/${publicToken}`} className="back-link">
              ← Back to unit overview
            </Link>
          </footer>
        </div>
      </div>
    </div>
  );
}
