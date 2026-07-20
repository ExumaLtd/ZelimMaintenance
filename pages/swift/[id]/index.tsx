import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import Airtable from "airtable";
import { useRouter } from "next/router";
import { getSession } from "../../../lib/session";
import { esc } from "../../../utils/api-utils";
import { requireEnv } from "../../../lib/env";

const AIRTABLE_PAT = requireEnv('AIRTABLE_PAT');
const AIRTABLE_BASE_ID = requireEnv('AIRTABLE_BASE_ID');
const AIRTABLE_SWIFT_TABLE = requireEnv('AIRTABLE_SWIFT_TABLE');

// Client logo resolver - KEEP THIS
const getClientLogo = (companyName, serialNumber) => {
  const logoMap = {
    changi: {
      serials: ["SWI001", "SWI002"],
      nameMatch: "Changi",
      src: "/client_logos/changi_airport/ChangiAirport_Logo(White).svg",
    },
    milford: {
      serials: ["SWI003"],
      nameMatch: "Port of Milford Haven",
      src: "/client_logos/port_of_milford_haven/PortOfMilfordHaven_Logo(White).svg",
    },
    hatloy: {
      serials: ["SWI010", "SWI011"],
      nameMatch: "Hatloy",
      src: "/client_logos/hatloy_maritime/HatloyMaritime_Logo(White).svg",
    },
  };

  for (const client of Object.values(logoMap)) {
    if (client.serials.includes(serialNumber) || companyName?.includes(client.nameMatch)) {
      return { src: client.src, alt: `${companyName} Logo` };
    }
  }

  return null;
};

// Fetch unit data from Airtable
export async function getServerSideProps(context) {
  // MOVE getFileSize function HERE (inside getServerSideProps)
  const getFileSize = (filePath) => {
    try {
      const fs = require('fs');
      const path = require('path');
      const fullPath = path.join(process.cwd(), "public", filePath);
      const stats = fs.statSync(fullPath);
      const bytes = stats.size;
      
      if (bytes === 0) return "0 Bytes";

      const k = 1024;
      const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
    } catch {
      return "Size N/A";
    }
  };

  const publicToken = context.params.id;
  
  // Get session to extract PIN
  const session = getSession(context.req);

  // If no valid session, or the URL token does not match the session, redirect to login
  if (!session || !session.pin || publicToken !== session.token) {
    return { redirect: { destination: "/", permanent: false } };
  }

  const accessPin = session.pin; // e.g., "SWI005" or "CREW005"
  const accessType = session.access; // "maintenance" or "operator"

  const maintenanceManualPath = "/downloads/Zelim_SwiftSurvivorRecoverySystem_MaintenanceManual_v2point0.pdf";
  const installationGuidePath = "/downloads/SwiftSurvivorRecoverySystem_InstallationGuide_v2point0(Draft).pdf";
  const operatorsManualPath = "/downloads/Zelim_SwiftSurvivorRecoverySystem_OperatorsMaintenanceManual_v1point0.pdf";

  const fileSizes = {
    maintenanceManualSize: getFileSize(maintenanceManualPath),
    installationGuideSize: getFileSize(installationGuidePath),
    operatorsManualSize: getFileSize(operatorsManualPath),
  };

  try {
    const base = new Airtable({
      apiKey: AIRTABLE_PAT,
    }).base(AIRTABLE_BASE_ID);

    const records = await base(AIRTABLE_SWIFT_TABLE)
      .select({
        maxRecords: 1,
        filterByFormula: `{public_token} = '${esc(publicToken)}'`,
        fields: ["serial_number", "operating_company", "annual_maintenance_due", "depth_maintenance_due"],
      })
      .firstPage();

    if (!records || records.length === 0) {
      return { redirect: { destination: "/", permanent: false } };
    }

    const record = records[0];
    const unitRecordId = record.id;

    // operating_company is now a linked record field — resolve the name
    let companyName = "Client Unit";
    const operatingCompanyIds = record.get("operating_company") as string[] | undefined;
    if (operatingCompanyIds && operatingCompanyIds.length > 0) {
      try {
        const companyRecord = await base('operating_companies').find(operatingCompanyIds[0]);
        companyName = (companyRecord.get('company_name') as string) || "Client Unit";
      } catch (e: any) {
        console.warn('Could not resolve operating company name:', e.message);
      }
    }

    const unitDetails = {
      record_id: unitRecordId,
      serial_number: (record.get("serial_number") as string) || "N/A",
      company: companyName,
      annualDue: record.get("annual_maintenance_due")
        ? new Date(record.get("annual_maintenance_due") as string).toLocaleDateString("en-GB")
        : "N/A",
      depthDue: record.get("depth_maintenance_due")
        ? new Date(record.get("depth_maintenance_due") as string).toLocaleDateString("en-GB")
        : "N/A",
    };

    // Check for active drafts - FILTERED BY ACCESS PIN
    let activeDrafts = [];
    try {
      const allDrafts = await base('maintenance_drafts')
        .select({
          filterByFormula: `AND(
            {completed} = 0,
            {access_pin_used} = '${accessPin}'
          )`,
          fields: ['unit_id', 'maintenance_type', 'last_updated', 'engineer_email', 'access_pin_used'],
        })
        .all();

      const matchingDrafts = allDrafts.filter(d => {
        const linkedRecords = d.get('unit_id') as string[] | undefined;
        return linkedRecords && linkedRecords.includes(unitRecordId);
      });

      activeDrafts = matchingDrafts.map(d => ({
        type: d.get('maintenance_type'),
        lastUpdated: d.get('last_updated'),
        engineerEmail: d.get('engineer_email'),
      }));
    } catch (draftError) {
      console.error('Error fetching drafts:', draftError);
      // Continue without drafts if table doesn't exist yet
    }

    return {
      props: {
        unit: unitDetails,
        publicToken,
        activeDrafts,
        accessType,
        ...fileSizes,
      },
    };
  } catch (err) {
    console.error("Error fetching unit data:", err);
    return { redirect: { destination: "/", permanent: false } };
  }
}

// Main component
export default function SwiftUnitPage({
  unit,
  publicToken,
  activeDrafts = [],
  accessType = "maintenance",
  maintenanceManualSize,
  installationGuideSize,
  operatorsManualSize,
}) {
  const router = useRouter();

  const { serial_number: serialNumber, company: companyName } = unit;
  const logoProps = getClientLogo(companyName, serialNumber);

  const allMaintenanceTypes = [
    {
      title: "Monthly\nmaintenance",
      description: "To be completed in accordance with the Swift Rescue Conveyor Operators Maintenance Manual.",
      href: `/portal/swift/monthly`,
      type: "Monthly",
    },
    {
      title: "Annual\nmaintenance",
      description: "To be completed in accordance with Section 6.1 – Annual maintenance of the Swift Rescue Conveyor Maintenance Manual.",
      href: `/portal/swift/annual`,
      type: "Annual",
    },
    {
      title: "30-month depth\nmaintenance",
      description: "To be completed in accordance with Section 6.2 – 30-month depth maintenance of the Swift Rescue Conveyor Maintenance Manual.",
      href: `/portal/swift/depth`,
      type: "30-month depth",
    },
    {
      title: "Unscheduled\nmaintenance",
      description: accessType === "operator"
        ? "To be completed in accordance with Section 5.2 – Unscheduled maintenance of the Swift Rescue Conveyor Operators Maintenance Manual."
        : "To be completed in accordance with Section 6.3 – Unscheduled maintenance of the Swift Rescue Conveyor Maintenance Manual.",
      href: `/portal/swift/unscheduled`,
      type: "Unscheduled",
    },
    {
      title: "Report a fault",
      description: "Complete this form to report a fault with the Swift system. Your report will be sent to the maintenance facility for review and follow-up.",
      href: `/portal/swift/fault-reporting`,
      type: "Fault report",
    },
  ];

  // Add draft information to maintenance types
  const maintenanceTypesWithDrafts = allMaintenanceTypes.map(maintenance => {
    const draft = activeDrafts.find(d => d.type === maintenance.type);
    return {
      ...maintenance,
      hasDraft: !!draft,
      draftInfo: draft,
    };
  });

  const maintenanceTypes = accessType === "operator"
    ? maintenanceTypesWithDrafts.filter(type =>
        type.title.includes("Monthly") || type.title.includes("Unscheduled") || type.title.includes("Report a fault")
      )
    : maintenanceTypesWithDrafts.filter(type =>
        !type.title.includes("Monthly") && !type.title.includes("Report a fault")
      );

  const downloads = accessType === "operator"
    ? [
        {
          href: "/downloads/Zelim_SwiftSurvivorRecoverySystem_OperatorsMaintenanceManual_v1point0.pdf#page=1",
          name: "Swift operators maintenance manual.pdf",
          size: operatorsManualSize,
        },
      ]
    : [
        {
          href: "/downloads/Zelim_SwiftSurvivorRecoverySystem_MaintenanceManual_v2point0.pdf#page=1",
          name: "Swift maintenance manual.pdf",
          size: maintenanceManualSize,
        },
        {
          href: "/downloads/SwiftSurvivorRecoverySystem_InstallationGuide_v2point0(Draft).pdf#page=1",
          name: "Swift installation guide.pdf",
          size: installationGuideSize,
        },
      ];

  return (
    <div className="dashboard-scope">
      <Head>
        <title>{companyName} Maintenance Portal</title>
      </Head>

      <div className="swift-main-layout-wrapper">
        <div className="page-wrapper">
          <div className="swift-dashboard-container">
            
            {/* Left Panel - Unit Details */}
            <div className="detail-panel">
              {logoProps && (
                <div className="logo-section">
                  <Image
                    src={logoProps.src}
                    alt={logoProps.alt}
                    fill
                    priority
                    sizes="250px"
                  />
                </div>
              )}

              <h1 className="portal-title">
                <span className="title-line">{companyName}</span>
                <span className="title-line">maintenance portal</span>
              </h1>

              <div className="maintenance-details">
                <div className="detail-item">
                  <p className="detail-label">Serial number</p>
                  <p className="detail-value">{serialNumber}</p>
                </div>

                <div className="detail-item">
                  <p className="detail-label">Annual maintenance due</p>
                  <p className="detail-value">{unit.annualDue}</p>
                </div>

                <div className="detail-item">
                  <p className="detail-label">30-month depth maintenance due</p>
                  <p className="detail-value">{unit.depthDue}</p>
                </div>
              </div>
            </div>

            {/* Right Panel - Actions */}
            <div className="action-panel">
              
              {/* Maintenance Cards */}
              <div className="maintenance-group-wrapper">
                {maintenanceTypes.map((maintenance, index) => (
                  <div key={index} className="maintenance-card">
                    <h3>
                      {maintenance.title.split('\n').map((line, i) => (
                        <span key={i}>
                          {line}
                          {i === 0 && <br />}
                        </span>
                      ))}
                    </h3>
                    <p className="description">{maintenance.description}</p>
                    <Link
                      href={
                        maintenance.hasDraft
                          ? `${maintenance.href}?draft=true`
                          : maintenance.href
                      }
                      className="start-btn"
                    >
                      <span className="left">
                        {maintenance.hasDraft
                          ? (maintenance.title.includes("Report a fault") ? 'Continue fault reporting' : 'Continue')
                          : (maintenance.title.includes("Report a fault") ? 'Report a fault' : 'Start maintenance')
                        }
                      </span>
                      <span className="right">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M10.1458 7.5L0 7.5L0 5.83333L10.1458 5.83333L5.47917 1.16667L6.66667 0L13.3333 6.66667L6.66667 13.3333L5.47917 12.1667L10.1458 7.5Z" fill="#172F36"/>
                        </svg>
                      </span>
                    </Link>
                  </div>
                ))}
              </div>

              {/* Downloads */}
              <div className="downloads-card">
                <h3>Downloads</h3>
                <p className="description">
                  {accessType === "operator"
                    ? "Operator maintenance documents for the Swift Rescue Conveyor."
                    : "Maintenance and installation documents for the Swift Rescue Conveyor."
                  }
                </p>

                <div className="download-list">
                  {downloads.map((download, index) => (
                    <a                   
                      key={index}
                      href={download.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="download-link"
                    >
                      <Image 
                        src="/Icons/PDF_Icon.svg" 
                        width={40} 
                        height={40} 
                        alt="PDF Icon" 
                      />
                      <div>
                        <p>{download.name}</p>
                        <span>{download.size}</span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="footer-section">
          <a href="https://www.zelim.com" target="_blank" rel="noopener noreferrer">
            <Image 
              src="/logo/zelim-logo.svg" 
              width={120} 
              height={40} 
              alt="Zelim logo"
            />
          </a>
        </footer>
      </div>
    </div>
  );
}