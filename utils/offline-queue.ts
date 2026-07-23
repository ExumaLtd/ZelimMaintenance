/**
 * Offline-first submission queue.
 *
 * Vessels lose connectivity, so a finished form must never be lost to a dead
 * network. submitOrQueue wraps the submit-maintenance call: when the device
 * is offline or the fetch fails at the network level, the full payload pair
 * (submission plus report email body) is stored in localStorage and the call
 * resolves with queued: true so the form can treat it as an accepted outcome
 * and navigate to the completion page. If the queue write itself fails (for
 * example localStorage quota), OfflineSaveError is thrown so the form can be
 * honest that nothing was saved. flushOfflineQueue retries the queue in
 * order whenever the app loads or the browser fires an online event; it is
 * wired up once in _app and never throws.
 *
 * Every entry has a unique id, so two distinct submissions of the same form
 * type queued in one offline stretch are both preserved. Queueing navigates
 * the form away, so an entry can never race a manual resubmit of the same
 * form instance.
 *
 * Flush failure handling, deliberately per class:
 * - network error or a non-JSON 200 (captive portal): stop, retry on the
 *   next load or online event; nothing is lost.
 * - 401: the session expired; stop, since it applies to every entry. The
 *   next login reloads the app and retries with the fresh session.
 * - 403: this entry belongs to a different unit than the current session;
 *   skip it and continue so it cannot block entries behind it. It retries
 *   once the user logs into its unit again.
 * - 400/404/413/422: permanently rejected payload; park the entry as failed
 *   (kept in storage, skipped by future flushes, surfaced by the banner).
 * - anything else (429, 5xx): stop, retry later.
 *
 * The report email body is built before submitting because only recordRef
 * comes from the submit response; the flusher patches it in after a queued
 * submission finally succeeds.
 */

const QUEUE_KEY = 'offline_submission_queue';

/** Thrown when the device is offline AND the queue write failed. */
export class OfflineSaveError extends Error {
  constructor() {
    super(
      'No connection, and this device could not store the form. Keep this page open and submit again when you are back online.'
    );
    this.name = 'OfflineSaveError';
  }
}

type QueuedSubmission = {
  id: string;
  queuedAt: string;
  submitPayload: Record<string, unknown>;
  reportBody: Record<string, unknown>;
  attempts: number;
  /** Permanently rejected by the server; kept for support, never retried. */
  failed?: boolean;
};

function notifyQueueChange() {
  try {
    window.dispatchEvent(new Event('offline-queue-change'));
  } catch {
    // Not in a browser; nothing to notify.
  }
}

function readQueue(): QueuedSubmission[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Returns false when the write failed (quota); callers must not lie about it. */
function writeQueue(queue: QueuedSubmission[]): boolean {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    return true;
  } catch {
    return false;
  }
}

/** Entries waiting to send. */
export function queuedSubmissionCount(): number {
  return readQueue().filter((item) => !item.failed).length;
}

/** Entries the server permanently rejected. */
export function failedSubmissionCount(): number {
  return readQueue().filter((item) => item.failed).length;
}

/** fetch rejects with a TypeError when the network itself fails; browsers
    can also surface interrupted requests as AbortError DOMExceptions. */
function isNetworkError(err: unknown): boolean {
  return err instanceof TypeError || (err instanceof DOMException && err.name === 'AbortError');
}

async function postJson(url: string, body: Record<string, unknown>) {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** Best-effort report email; the record is already saved, so a failed email
    must never surface as a submission error and cause a duplicate. */
async function sendReport(reportBody: Record<string, unknown>, recordRef: unknown) {
  try {
    await postJson('/api/send-report', { ...reportBody, recordRef });
  } catch {
    // Record saved; email lost. Acceptable, the data is in Airtable.
  }
}

type SubmitArgs = {
  submitPayload: Record<string, unknown>;
  reportBody: Record<string, unknown>;
};

/**
 * Submit now, or queue for later if the network is down. Resolves with
 * queued: false and the submit response on direct success, or queued: true
 * after storing the submission for the flusher. Throws OfflineSaveError when
 * offline and the queue write failed, or a plain Error when the server
 * rejected the submission while online.
 */
export async function submitOrQueue({ submitPayload, reportBody }: SubmitArgs): Promise<{ queued: boolean; recordRef?: string }> {
  const enqueue = (): { queued: true } => {
    const entry: QueuedSubmission = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
      queuedAt: new Date().toISOString(),
      submitPayload,
      reportBody,
      attempts: 0,
    };
    if (!writeQueue([...readQueue(), entry])) throw new OfflineSaveError();
    notifyQueueChange();
    return { queued: true };
  };

  if (typeof navigator !== 'undefined' && !navigator.onLine) return enqueue();

  let res: Response;
  try {
    res = await postJson('/api/submit-maintenance', submitPayload);
  } catch (err) {
    if (isNetworkError(err)) return enqueue();
    throw err;
  }

  if (!res.ok) throw new Error('Failed to submit to database. Please try again.');

  let submitResult: { recordRef?: string };
  try {
    submitResult = await res.json();
  } catch {
    // A 200 without JSON means something intercepted the request (captive
    // portal); it never reached the API, so retrying cannot duplicate.
    throw new Error('Unexpected response from the network. Please try again.');
  }

  await sendReport(reportBody, submitResult.recordRef);
  return { queued: false, recordRef: submitResult.recordRef };
}

let flushing = false;

/**
 * Send queued submissions oldest first. Never throws; see the module
 * comment for the per-failure-class behavior.
 */
export async function flushOfflineQueue() {
  if (flushing) return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  flushing = true;
  let changed = false;

  try {
    for (const entry of readQueue()) {
      if (entry.failed) continue;

      let res: Response;
      try {
        res = await postJson('/api/submit-maintenance', entry.submitPayload);
      } catch {
        break;
      }

      if (res.ok) {
        let submitResult: { recordRef?: string };
        try {
          submitResult = await res.json();
        } catch {
          // Captive portal interception; the request never reached the API.
          break;
        }
        // Dequeue before the report email so a failure there cannot cause
        // the flusher to submit the same record twice.
        writeQueue(readQueue().filter((item) => item.id !== entry.id));
        changed = true;
        await sendReport(entry.reportBody, submitResult.recordRef);
        continue;
      }

      if (res.status === 401) break;

      const updateEntry = (patch: Partial<QueuedSubmission>) => {
        writeQueue(readQueue().map((item) => (item.id === entry.id ? { ...item, ...patch } : item)));
        changed = true;
      };

      if (res.status === 403) {
        // Wrong unit for this session; try the rest, retry this one later.
        updateEntry({ attempts: entry.attempts + 1 });
        continue;
      }
      if ([400, 404, 413, 422].includes(res.status)) {
        updateEntry({ attempts: entry.attempts + 1, failed: true });
        continue;
      }
      break;
    }
  } catch {
    // Defensive: flush must never reject into _app's fire-and-forget call.
  } finally {
    flushing = false;
    if (changed) notifyQueueChange();
  }
}
