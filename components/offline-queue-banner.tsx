import { useEffect, useState } from "react";
import { CloudUpload, TriangleAlert } from "lucide-react";
import { queuedSubmissionCount, failedSubmissionCount } from "@/utils/offline-queue";

/**
 * Dashboard banner surfacing the offline submission queue: how many
 * completed forms are waiting to send, and whether any were permanently
 * rejected. Without this the queue would be invisible and a stuck
 * submission could go unnoticed.
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
    <div className="mb-5 rounded-[10px] border border-line bg-card p-4 text-sm leading-6 tracking-[0.02em] text-ink-soft">
      {pending > 0 && (
        <p className="m-0 flex items-start gap-2.5">
          <CloudUpload size={18} strokeWidth={1.5} className="mt-1 shrink-0 text-accent" />
          <span>
            {pending === 1 ? "1 completed submission is" : `${pending} completed submissions are`} saved
            on this device and will be sent automatically when a connection is available.
          </span>
        </p>
      )}
      {failed > 0 && (
        <p className={`m-0 flex items-start gap-2.5 ${pending > 0 ? "mt-2.5" : ""}`}>
          <TriangleAlert size={18} strokeWidth={1.5} className="mt-1 shrink-0 text-warn" />
          <span>
            {failed === 1 ? "1 saved submission" : `${failed} saved submissions`} could not be accepted
            by the server. Please contact Zelim so the record can be recovered from this device.
          </span>
        </p>
      )}
    </div>
  );
}
