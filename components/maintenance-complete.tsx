import Head from "next/head";
import { useEffect, useState } from "react";
import { ThumbsUp } from "lucide-react";
import PortalShell from "./ui/portal-shell";
import MessageCard from "./ui/message-card";
import ArrowButton from "./ui/arrow-button";

type Props = {
  /** Fallback shown until the stored maintenance type is read. */
  defaultType?: string;
  /** Fault reports use fixed copy instead of the stored maintenance type. */
  isFaultReport?: boolean;
};

/**
 * Confirmation page shown after a maintenance form or fault report is
 * submitted. The submitting form leaves the serial number and maintenance
 * type in localStorage; both keys are consumed and cleared on mount.
 */
export default function MaintenanceComplete({ defaultType = "Maintenance", isFaultReport = false }: Props) {
  const [unitSN, setUnitSN] = useState("");
  const [maintenanceType, setMaintenanceType] = useState(defaultType);

  useEffect(() => {
    // Reads the submitting form's hand-off from localStorage after mount;
    // localStorage does not exist during server rendering.
    const savedSN = localStorage.getItem("last_submitted_sn");
    const savedType = localStorage.getItem("last_maintenance_type");

    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (savedSN) setUnitSN(savedSN);
    if (savedType && !isFaultReport) setMaintenanceType(savedType);

    localStorage.removeItem("last_submitted_sn");
    localStorage.removeItem("last_maintenance_type");
  }, [isFaultReport]);

  const headTitle = isFaultReport
    ? unitSN
      ? `${unitSN} | Fault report submitted`
      : "Fault report submitted"
    : unitSN
      ? `${unitSN} | ${maintenanceType} maintenance submitted`
      : `${maintenanceType} maintenance submitted`;

  return (
    <PortalShell>
      <Head>
        <title>{headTitle}</title>
      </Head>

      <MessageCard
        icon={<ThumbsUp size={26} strokeWidth={1.5} className="max-[600px]:h-6 max-[600px]:w-6" />}
        title={
          <>
            {/* Inline on mobile so the title wraps as one sentence, stacked lines on desktop. */}
            <span className="inline min-[769px]:block">
              {isFaultReport ? "Fault report" : `${maintenanceType} maintenance`}
            </span>{" "}
            <span className="inline min-[769px]:block">submitted for {unitSN || "unit"}</span>
          </>
        }
        text={
          isFaultReport
            ? "Your fault report has been successfully submitted and sent to the maintenance facility for review and follow-up. You will receive email confirmation shortly."
            : `Your ${maintenanceType.toLowerCase()} maintenance has successfully been recorded. You will receive email confirmation shortly.`
        }
        action={<ArrowButton href="/portal/swift">Return to dashboard</ArrowButton>}
      />
    </PortalShell>
  );
}
