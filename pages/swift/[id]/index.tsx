import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import Airtable from "airtable";
import clsx from "clsx";
import { getSession } from "../../../lib/session";
import { esc } from "../../../lib/api-utils";
import { requireEnv } from "../../../lib/env";
import { errorMessage } from "../../../utils/errors";
import { ArrowIcon, arrowLinkClasses } from "@/components/ui/arrow-button";
import OfflineQueueBanner from "@/components/offline-queue-banner";
import type { GetServerSidePropsContext } from "next";

const AIRTABLE_PAT = requireEnv('AIRTABLE_PAT');
const AIRTABLE_BASE_ID = requireEnv('AIRTABLE_BASE_ID');
const AIRTABLE_SWIFT_TABLE = requireEnv('AIRTABLE_SWIFT_TABLE');

// Client logo resolver - KEEP THIS
const getClientLogo = (companyName?: string, serialNumber?: string) => {
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
    if (client.serials.includes(serialNumber ?? '') || companyName?.includes(client.nameMatch)) {
      return { src: client.src, alt: `${companyName} Logo` };
    }
  }

  return null;
};

// Fetch unit data from Airtable
export async function getServerSideProps(context: GetServerSidePropsContext) {
  // MOVE getFileSize function HERE (inside getServerSideProps)
  const getFileSize = (filePath: string) => {
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

  const publicToken = String(context.params?.id ?? '');
  
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

    // operating_company is now a linked record field, so resolve the name
    let companyName = "Client Unit";
    const operatingCompanyIds = record.get("operating_company") as string[] | undefined;
    if (operatingCompanyIds && operatingCompanyIds.length > 0) {
      try {
        const companyRecord = await base('operating_companies').find(operatingCompanyIds[0]);
        companyName = (companyRecord.get('company_name') as string) || "Client Unit";
      } catch (e) {
        console.warn('Could not resolve operating company name:', errorMessage(e));
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
    let activeDrafts: { type: string; lastUpdated: string; engineerEmail: string }[] = [];
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
        type: d.get('maintenance_type') as string,
        lastUpdated: d.get('last_updated') as string,
        engineerEmail: d.get('engineer_email') as string,
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
type DashboardProps = {
  unit: { record_id: string; serial_number: string; company: string; annualDue: string; depthDue: string };
  publicToken: string;
  activeDrafts?: { type: string; lastUpdated: string; engineerEmail: string }[];
  accessType?: string;
  maintenanceManualSize: string;
  installationGuideSize: string;
  operatorsManualSize: string;
};

export default function SwiftUnitPage({
  unit,
  publicToken,
  activeDrafts = [],
  accessType = "maintenance",
  maintenanceManualSize,
  installationGuideSize,
  operatorsManualSize,
}: DashboardProps) {
  const { serial_number: serialNumber, company: companyName } = unit;
  const logoProps = getClientLogo(companyName, serialNumber);

  const allMaintenanceTypes = [
    {
      title: "Monthly\nmaintenance",
      description: "To be completed in accordance with Section 5.2 – Monthly maintenance of the Swift Rescue Conveyor Operators Maintenance Manual.",
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
        ? "To be completed in accordance with Section 5.3 – Unscheduled maintenance of the Swift Rescue Conveyor Operators Maintenance Manual."
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
    <div className="font-sans">
      <Head>
        <title>{companyName} Maintenance Portal</title>
      </Head>

      <div className="relative flex min-h-screen w-full flex-col justify-between overflow-x-hidden px-10 text-white max-[900px]:px-0">
        <div className="relative z-1 mx-auto flex w-[calc(100%-160px)] max-w-[1280px] flex-1 flex-col max-[900px]:w-full max-[900px]:max-w-full max-[900px]:px-5 max-[900px]:pt-5 max-[600px]:px-4">
          <div className="mt-[60px] mb-10 grid w-full shrink-0 grid-cols-[minmax(325px,4fr)_8fr] gap-5 max-[900px]:mt-0 max-[900px]:grid-cols-1 max-[600px]:mt-1.5">

            {/* Left Panel - Unit Details */}
            <div className="text-left max-[900px]:mb-5 max-[900px]:w-full max-[600px]:text-center">
              {logoProps && (
                <div className="relative mb-10 h-10 w-[250px] max-[900px]:mx-auto max-[900px]:mb-[30px] max-[900px]:h-9 max-[900px]:w-[225px]">
                  <Image
                    src={logoProps.src}
                    alt={logoProps.alt}
                    fill
                    priority
                    sizes="250px"
                    className="object-contain object-left max-[900px]:object-center"
                  />
                </div>
              )}

              <h1 className="mt-0 mb-[34px] text-[30px] font-semibold leading-[38px] text-white max-[900px]:mb-6 max-[900px]:text-center max-[900px]:text-[22px] max-[900px]:leading-7">
                <span className="block w-full">{companyName}</span>
                <span className="block w-full">maintenance portal</span>
              </h1>

              <div className="mt-5 flex w-full max-w-[305px] flex-col gap-4 max-[900px]:max-w-none max-[900px]:flex-row max-[900px]:flex-wrap max-[900px]:justify-center max-[900px]:gap-5 max-[600px]:mx-auto max-[600px]:mt-5 max-[600px]:flex-col max-[600px]:gap-3">
                {[
                  { label: "Serial number", value: serialNumber },
                  { label: "Annual maintenance due", value: unit.annualDue },
                  { label: "30-month depth maintenance due", value: unit.depthDue },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex w-full flex-col gap-1 border-b border-ink-muted/20 pb-3 last:border-b-0 last:pb-0 max-[900px]:min-w-[100px] max-[900px]:flex-[0_1_calc(33.33%-14px)] max-[900px]:border-b-0 max-[900px]:pb-0 max-[900px]:text-center max-[600px]:w-full max-[600px]:flex-none max-[600px]:items-center max-[600px]:border-b max-[600px]:pb-3 max-[600px]:last:border-b-0"
                  >
                    <p className="m-0 text-sm font-medium leading-5 text-ink-muted">{item.label}</p>
                    <p className="m-0 font-mono text-xl font-semibold leading-[26px] tracking-[0.1em] text-ink">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Panel - Actions */}
            <div className="flex w-full flex-col gap-5 text-left max-[600px]:text-center">

              <OfflineQueueBanner />

              {/* Maintenance Cards */}
              <div className="flex w-full flex-wrap gap-5 rounded-[20px] bg-field p-5 max-[1200px]:flex-col">
                {maintenanceTypes.map((maintenance, index) => (
                  <div
                    key={index}
                    className="flex w-[calc(50%-10px)] flex-col rounded-[10px] bg-[linear-gradient(39deg,rgba(74,98,104,0.20)_12.44%,rgba(74,98,104,0.00)_87.56%)] p-[25px_30px_30px] max-[1200px]:w-full"
                  >
                    <h3 className="mt-0 mb-3 font-mono text-xl font-normal leading-[26px] tracking-[0.1em] text-ink">
                      {maintenance.title.split('\n').map((line, i) => (
                        <span key={i}>
                          {line}
                          {i === 0 && <br />}
                        </span>
                      ))}
                    </h3>
                    <p className="mt-0 mb-5 text-sm font-light leading-5 tracking-[0.05em] text-ink-muted">{maintenance.description}</p>
                    <Link
                      href={
                        maintenance.hasDraft
                          ? `${maintenance.href}?draft=true`
                          : maintenance.href
                      }
                      className={clsx(arrowLinkClasses, "mt-auto max-w-full self-start max-[600px]:mx-auto max-[600px]:mt-0")}
                    >
                      <span className="min-w-0 flex-1 whitespace-normal">
                        {maintenance.hasDraft
                          ? (maintenance.title.includes("Report a fault") ? 'Continue fault reporting' : 'Continue')
                          : (maintenance.title.includes("Report a fault") ? 'Report a fault' : 'Start maintenance')
                        }
                      </span>
                      <ArrowIcon />
                    </Link>
                  </div>
                ))}
              </div>

              {/* Downloads */}
              <div className="w-full rounded-[20px] bg-field p-[24px_30px_30px] max-[600px]:p-[24px_20px_20px]">
                <h3 className="mt-0 mb-3 font-mono text-xl font-normal leading-[26px] tracking-[0.1em] text-ink">Downloads</h3>
                <p className="mt-0 mb-5 text-sm font-light leading-5 tracking-[0.05em] text-ink-muted">
                  {accessType === "operator"
                    ? "Operator maintenance documents for the Swift Rescue Conveyor."
                    : "Maintenance and installation documents for the Swift Rescue Conveyor."
                  }
                </p>

                <div className="flex flex-row justify-start gap-[15px] max-[600px]:flex-col max-[600px]:items-center">
                  {downloads.map((download, index) => (
                    <a
                      key={index}
                      href={download.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex max-w-[calc(50%-7.5px)] flex-1 cursor-pointer flex-row items-center gap-[15px] rounded-lg bg-card p-3 no-underline transition-colors duration-200 hover:bg-hover-light max-[600px]:w-full max-[600px]:max-w-none max-[600px]:text-left"
                    >
                      <Image
                        src="/Icons/PDF_Icon.svg"
                        width={40}
                        height={40}
                        alt="PDF Icon"
                        className="shrink-0"
                      />
                      <div>
                        <p className="m-0 text-sm font-semibold leading-4 text-ink">{download.name}</p>
                        <span className="block text-sm leading-[22px] text-ink-muted">{download.size}</span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="flex w-full shrink-0 justify-center pt-5 pb-10">
          <a href="https://www.zelim.com" target="_blank" rel="noopener noreferrer" className="block no-underline">
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