/**
 * Offline-first submission queue.
 *
 * Vessels lose connectivity, so a finished form must never be lost to a dead
 * network. submitWithOfflineQueue wraps the submit-maintenance call: when the
 * device is offline or the fetch fails at the network level, the full payload
 * pair (submission plus report email body) is stored in localStorage and an
 * OfflineQueuedError is thrown so the form can tell the user their work is
 * safe. flushOfflineQueue retries the queue in order whenever the app loads
 * or the browser fires an online event; it is wired up once in _app.
 *
 * The report email body is built before submitting because only recordRef
 * comes from the submit response; the flusher patches it in after a queued
 * submission finally succeeds.
 */

const QUEUE_KEY = 'offline_submission_queue';

export class OfflineQueuedError extends Error {
  constructor() {
    super(
      'No connection. Your completed form is saved on this device and will be submitted automatically when you are back online.'
    );
    this.name = 'OfflineQueuedError';
  }
}

type QueuedSubmission = {
  /** Dedupe key so resubmitting the same form offline replaces its entry. */
  key: string;
  queuedAt: string;
  submitPayload: Record<string, unknown>;
  reportBody: Record<string, unknown>;
  /** localStorage keys (draft mirror, image caches) cleared once it sends. */
  clearKeys: string[];
};

function readQueue(): QueuedSubmission[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedSubmission[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Quota exceeded. The Airtable draft autosave still holds the answers,
    // so the work is recoverable even if the queue write fails.
  }
}

export function queuedSubmissionCount(): number {
  return readQueue().length;
}

function enqueue(entry: Omit<QueuedSubmission, 'queuedAt'>) {
  const queue = readQueue().filter((item) => item.key !== entry.key);
  queue.push({ ...entry, queuedAt: new Date().toISOString() });
  writeQueue(queue);
}

/** fetch rejects with a TypeError when the network itself fails. */
function isNetworkError(err: unknown): boolean {
  return err instanceof TypeError;
}

async function postJson(url: string, body: Record<string, unknown>) {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

type SubmitArgs = {
  queueKey: string;
  submitPayload: Record<string, unknown>;
  reportBody: Record<string, unknown>;
  clearKeys: string[];
};

/**
 * Submit now, or queue for later if the network is down. Resolves with the
 * submit response JSON on success. Throws OfflineQueuedError after queueing,
 * or a plain Error when the server rejected the submission while online.
 */
export async function submitWithOfflineQueue({ queueKey, submitPayload, reportBody, clearKeys }: SubmitArgs) {
  const entry = { key: queueKey, submitPayload, reportBody, clearKeys };

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    enqueue(entry);
    throw new OfflineQueuedError();
  }

  let res: Response;
  try {
    res = await postJson('/api/submit-maintenance', submitPayload);
  } catch (err) {
    if (isNetworkError(err)) {
      enqueue(entry);
      throw new OfflineQueuedError();
    }
    throw err;
  }

  if (!res.ok) throw new Error('Failed to submit to database. Please try again.');
  const submitResult = await res.json();

  // The record is saved at this point. A failed report email must not surface
  // as a submission error, or the user would resubmit and duplicate the
  // record, so network failures here are swallowed.
  try {
    await postJson('/api/send-report', { ...reportBody, recordRef: submitResult.recordRef });
  } catch (err) {
    if (!isNetworkError(err)) throw err;
  }

  return submitResult;
}

let flushing = false;

/**
 * Send queued submissions oldest first. Stops at the first failure so order
 * is preserved and nothing is dropped; the next load or online event retries.
 */
export async function flushOfflineQueue() {
  if (flushing) return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  flushing = true;

  try {
    while (true) {
      const queue = readQueue();
      const entry = queue[0];
      if (!entry) break;

      let res: Response;
      try {
        res = await postJson('/api/submit-maintenance', entry.submitPayload);
      } catch {
        break;
      }
      if (!res.ok) break;
      const submitResult = await res.json();

      // Dequeue before the report email so a failure there cannot cause the
      // flusher to submit the same record twice.
      writeQueue(readQueue().filter((item) => item.key !== entry.key));
      entry.clearKeys.forEach((key) => localStorage.removeItem(key));

      try {
        await postJson('/api/send-report', { ...entry.reportBody, recordRef: submitResult.recordRef });
      } catch {
        // Record saved; email lost. Acceptable, the data is in Airtable.
      }
    }
  } finally {
    flushing = false;
  }
}
