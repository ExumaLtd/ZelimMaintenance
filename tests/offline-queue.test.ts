import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  submitOrQueue,
  flushOfflineQueue,
  queuedSubmissionCount,
  failedSubmissionCount,
  OfflineSaveError,
} from '@/utils/offline-queue';

const QUEUE_KEY = 'offline_submission_queue';

function makeLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    _store: store,
  };
}

const args = {
  submitPayload: { unit_record_id: 'recUNIT', maintenance_type: 'Monthly' },
  reportBody: { serialNumber: 'SWI005', reportType: 'Monthly' },
};

let storage: ReturnType<typeof makeLocalStorage>;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  storage = makeLocalStorage();
  fetchMock = vi.fn();
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('navigator', { onLine: true });
  vi.stubGlobal('window', { dispatchEvent: () => true });
});

describe('submitOrQueue', () => {
  it('queues and resolves queued: true when the device is offline', async () => {
    vi.stubGlobal('navigator', { onLine: false });
    await expect(submitOrQueue(args)).resolves.toEqual({ queued: true });
    expect(queuedSubmissionCount()).toBe(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('queues when the fetch fails at the network level', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(submitOrQueue(args)).resolves.toEqual({ queued: true });
    expect(queuedSubmissionCount()).toBe(1);
  });

  it('preserves two distinct submissions queued in one offline stretch', async () => {
    vi.stubGlobal('navigator', { onLine: false });
    await submitOrQueue(args);
    await submitOrQueue({ ...args, submitPayload: { ...args.submitPayload, answers: [] } });
    expect(queuedSubmissionCount()).toBe(2);
  });

  it('throws OfflineSaveError when offline and the queue write fails', async () => {
    vi.stubGlobal('navigator', { onLine: false });
    storage.setItem = () => {
      throw new DOMException('quota', 'QuotaExceededError');
    };
    await expect(submitOrQueue(args)).rejects.toBeInstanceOf(OfflineSaveError);
  });

  it('does not queue on a server rejection while online', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 400 });
    await expect(submitOrQueue(args)).rejects.toThrow('Failed to submit');
    expect(queuedSubmissionCount()).toBe(0);
  });

  it('turns a 200 non-JSON response into a friendly retryable error', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => { throw new SyntaxError('<'); } });
    await expect(submitOrQueue(args)).rejects.toThrow('Unexpected response');
    expect(queuedSubmissionCount()).toBe(0);
  });

  it('submits then sends the report with the returned recordRef', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ recordRef: 'RI/SWI005/M/1' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    await expect(submitOrQueue(args)).resolves.toEqual({ queued: false, recordRef: 'RI/SWI005/M/1' });
    const [, reportCall] = fetchMock.mock.calls;
    expect(reportCall[0]).toBe('/api/send-report');
    expect(JSON.parse(reportCall[1].body).recordRef).toBe('RI/SWI005/M/1');
  });

  it('does not surface a failed report email as a submission error', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ recordRef: 'RI/SWI005/M/1' }) })
      .mockRejectedValueOnce(new DOMException('aborted', 'AbortError'));
    await expect(submitOrQueue(args)).resolves.toEqual({ queued: false, recordRef: 'RI/SWI005/M/1' });
  });
});

describe('flushOfflineQueue', () => {
  const queueTwo = async () => {
    vi.stubGlobal('navigator', { onLine: false });
    await submitOrQueue(args);
    await submitOrQueue({ ...args, submitPayload: { ...args.submitPayload, maintenance_type: 'Annual' } });
    vi.stubGlobal('navigator', { onLine: true });
  };

  it('sends queued entries oldest first and empties the queue', async () => {
    await queueTwo();
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ recordRef: 'RI/X' }) });
    await flushOfflineQueue();
    expect(queuedSubmissionCount()).toBe(0);
    // Two submits and two report emails.
    expect(fetchMock.mock.calls.filter(c => c[0] === '/api/submit-maintenance').length).toBe(2);
    expect(fetchMock.mock.calls.filter(c => c[0] === '/api/send-report').length).toBe(2);
  });

  it('stops without losing entries when the network drops mid-flush', async () => {
    await queueTwo();
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await flushOfflineQueue();
    expect(queuedSubmissionCount()).toBe(2);
    expect(storage.getItem(QUEUE_KEY)).toContain('Monthly');
  });

  it('stops on 401 so entries retry after the next login', async () => {
    await queueTwo();
    fetchMock.mockResolvedValueOnce({ ok: false, status: 401 });
    await flushOfflineQueue();
    expect(queuedSubmissionCount()).toBe(2);
    expect(failedSubmissionCount()).toBe(0);
  });

  it('skips past a 403 entry so it cannot block the queue', async () => {
    await queueTwo();
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 403 })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ recordRef: 'RI/X' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    await flushOfflineQueue();
    // The 403 entry is retained for its own unit's next session; the other sent.
    expect(queuedSubmissionCount()).toBe(1);
    expect(failedSubmissionCount()).toBe(0);
  });

  it('parks a permanently rejected entry as failed and continues', async () => {
    await queueTwo();
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 400 })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ recordRef: 'RI/X' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    await flushOfflineQueue();
    expect(failedSubmissionCount()).toBe(1);
    expect(queuedSubmissionCount()).toBe(0);
    // A parked entry is never retried.
    fetchMock.mockClear();
    await flushOfflineQueue();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('treats a 200 non-JSON response as transient and keeps the entry', async () => {
    await queueTwo();
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => { throw new SyntaxError('<'); } });
    await expect(flushOfflineQueue()).resolves.toBeUndefined();
    expect(queuedSubmissionCount()).toBe(2);
  });

  it('dequeues before the report email so a failure there cannot resubmit', async () => {
    vi.stubGlobal('navigator', { onLine: false });
    await submitOrQueue(args);
    vi.stubGlobal('navigator', { onLine: true });
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ recordRef: 'RI/X' }) })
      .mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await flushOfflineQueue();
    expect(queuedSubmissionCount()).toBe(0);
  });
});
