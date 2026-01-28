import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import Airtable from "airtable";
import fs from "fs";
import path from "path";
import { useRouter } from "next/router";

// File size utility
const getFileSize = (filePath) => {
  try {
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

// Client logo resolver
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
      src: "/client_logos/port_of_milford_haven/PortOfMilfordHaven(White).svg",
    },
    hatloy: {
      serials: ["SWI010", "SWI011"],
      nameMatch: "Hatloy",
      src: "/client_logos/Hatloy Maritime/HatloyMaritime_Logo(White).svg",
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
  const publicToken = context.params.id;
  
  console.log('=== DASHBOARD DEBUG ===');
  console.log('publicToken:', publicToken);
  console.log('params:', context.params);

  const maintenanceManualPath = "/downloads/SwiftSurvivorRecoverySystem_MaintenanceManual_v2point0(Draft).pdf";
  const installationGuidePath = "/downloads/SwiftSurvivorRecoverySystem_InstallationGuide_v2point0(Draft).pdf";

  const fileSizes = {
    maintenanceManualSize: getFileSize(maintenanceManualPath),
    installationGuideSize: getFileSize(installationGuidePath),
  };

  try {
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_API_KEY,
    }).base(process.env.AIRTABLE_BASE_ID);

    const records = await base(process.env.AIRTABLE_SWIFT_TABLE)
      .select({
        maxRecords: 1,
        filterByFormula: `{public_token} = "${publicToken}"`,
        fields: ["serial_number", "company", "annual_maintenance_due", "depth_maintenance_due"],
      })
      .firstPage();

    if (!records || records.length === 0) {
      return { redirect: { destination: "/", permanent: false } };
    }

    const record = records[0];
    const unitRecordId = record.id;
    
    console.log('unitRecordId:', unitRecordId);

    const unitDetails = {
      record_id: unitRecordId,
      serial_number: record.get("serial_number") || "N/A",
      company: record.get("company") || "Client Unit",
      annualDue: record.get("annual_maintenance_due")
        ? new Date(record.get("annual_maintenance_due")).toLocaleDateString("en-GB")
        : "N/A",
      depthDue: record.get("depth_maintenance_due")
        ? new Date(record.get("depth_maintenance_due")).toLocaleDateString("en-GB")
        : "N/A",
    };

    // OPTIMIZED: Check for active drafts with server-side filtering
    let activeDrafts = [];
    try {
      console.log('Fetching drafts for this unit only...');
      
      // Filter by unit_id on the server side using FIND()
      const matchingDrafts = await base('maintenance_drafts')
        .select({
          filterByFormula: `AND(
            NOT({completed}),
            FIND('${unitRecordId}', ARRAYJOIN({unit_id}, ','))
          )`,
          fields: ['unit_id', 'maintenance_type', 'last_updated', 'engineer_email'],
          maxRecords: 10, // Limit to 10 drafts max (should be plenty)
        })
        .firstPage();
      
      console.log(`Matching drafts for ${unitRecordId}: ${matchingDrafts.length}`);

      activeDrafts = matchingDrafts.map(d => ({
        type: d.get('maintenance_type'),
        lastUpdated: d.get('last_updated'),
        engineerEmail: d.get('engineer_email'),
      }));
      
      console.log('Found drafts:', activeDrafts);
    } catch (draftError) {
      console.error('Error fetching drafts:', draftError);
      // Continue without drafts if table doesn't exist yet
    }

    return {
      props: {
        unit: unitDetails,
        publicToken,
        activeDrafts,
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
  maintenanceManualSize,
  installationGuideSize,
}) {
  const router = useRouter();
  const { access } = router.query;
  const accessType = access || "maintenance";

  const { serial_number: serialNumber, company: companyName } = unit;
  const logoProps = getClientLogo(companyName, serialNumber);

  const allMaintenanceTypes = [
    {
      title: "Monthly\nmaintenance",
      description: "To be completed in accordance with the SWIFT Survivor Recovery System Maintenance Manual.",
      href: `/portal/swift/monthly`,
      type: "Monthly",
    },
    {
      title: "Annual\nmaintenance",
      description: "To be completed in accordance with Section 7.1.2 – Annual Maintenance Process of the SWIFT Survivor Recovery System Maintenance Manual.",
      href: `/portal/swift/annual`,
      type: "Annual",
    },
    {
      title: "30-month depth\nmaintenance",
      description: "To be completed in accordance with Section 7.2.2 – 30-Month Depth Maintenance Process of the SWIFT Survivor Recovery System Maintenance Manual.",
      href: `/portal/swift/depth`,
      type: "30-month depth",
    },
    {
      title: "Unscheduled\nmaintenance",
      description: "To be completed in accordance with the SWIFT Survivor Recovery System Maintenance Manual.",
      href: `/portal/swift/unscheduled`,
      type: "Unscheduled",
    },
    {
      title: "Report a fault",
      description: "Complete this form to report a fault with the SWIFT system. Your report will be sent to the maintenance facility for review and follow-up.",
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

  const maintenanceTypes = accessType === "crew"
    ? maintenanceTypesWithDrafts.filter(type => 
        type.title.includes("Monthly") || type.title.includes("Unscheduled") || type.title.includes("Report a fault")
      )
    : maintenanceTypesWithDrafts.filter(type => 
        !type.title.includes("Report a fault")
      );

  const downloads = [
    {
      href: "/downloads/SwiftSurvivorRecoverySystem_MaintenanceManual_v2point0(Draft).pdf",
      name: "SWIFT maintenance manual.pdf",
      size: maintenanceManualSize,
    },
    {
      href: "/downloads/SwiftSurvivorRecoverySystem_InstallationGuide_v2point0(Draft).pdf",
      name: "SWIFT installation guide.pdf",
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
                      {maintenance.hasDraft 
                        ? (maintenance.title.includes("Report a fault") ? 'Continue fault reporting' : 'Continue maintenance')
                        : (maintenance.title.includes("Report a fault") ? 'Report a fault' : 'Start maintenance')
                      }
                    </Link>
                  </div>
                ))}
              </div>

              {/* Downloads */}
              <div className="downloads-card">
                <h3>Downloads</h3>
                <p className="description">
                  To be used in accordance with both annual and 30-month depth maintenance.
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