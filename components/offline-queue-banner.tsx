import { useEffect, useState } from "react";
import { CloudUpload, TriangleAlert } from "lucide-react";
import { queuedSubmissionCount, failedSubmissionCount } from "@/utils/offline-queue";

/**
 * Dashboard banner surfacing the offline submission queue: how many
 * completed forms are waiting to send, and whether any were permanently
 * rejected. Without this the queue would be invisible and a stuck
 * submission could go unnoticed. Styled as a maintenance card: field
 * shell, gradient inner card, and the dashboard's paragraph treatment.
 */
export default function OfflineQueueBanner() {
  const [pending, setPending] = useState(0);
  const [failed, setFailed] = useState(0);

  useEffect(() => {
    // localStorage does not exist during server rendering, so the counts
    // are read after mount and re-read whenever the queue changes.
    const update = () => {
      setPending(queuedSubmissionCount());
      setFailed(failedSubmissionCount());
    };
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline-queue-change", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline-queue-change", update);
    };
  }, []);

  if (pending === 0 && failed === 0) return null;

  return (
    <div className="w-full rounded-[20px] bg-field p-5">
      <div className="flex w-full flex-col rounded-[10px] bg-[linear-gradient(39deg,rgba(74,98,104,0.20)_12.44%,rgba(74,98,104,0.00)_87.56%)] p-[25px_30px_30px]">
        {pending > 0 && (
          <p className="m-0 flex items-start gap-2.5 text-sm font-light leading-5 tracking-[0.02em] text-ink-muted">
            <CloudUpload size={18} strokeWidth={1.5} className="mt-0.5 shrink-0 text-accent" />
            <span>
              {pending === 1 ? "1 completed submission is" : `${pending} completed submissions are`} saved
              on this device and will be sent automatically when a connection is available.
            </span>
          </p>
        )}
        {failed > 0 && (
          <p className={`m-0 flex items-start gap-2.5 text-sm font-light leading-5 tracking-[0.02em] text-ink-muted ${pending > 0 ? "mt-3" : ""}`}>
            <TriangleAlert size={18} strokeWidth={1.5} className="mt-0.5 shrink-0 text-warn" />
            <span>
              {failed === 1 ? "1 saved submission" : `${failed} saved submissions`} could not be accepted
              by the server. Please contact Zelim so the record can be recovered from this device.
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
