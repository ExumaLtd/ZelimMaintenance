import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  submitWithOfflineQueue,
  flushOfflineQueue,
  queuedSubmissionCount,
  OfflineQueuedError,
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
  queueKey: 'draft_monthly_SWI005',
  submitPayload: { unit_record_id: 'recUNIT', maintenance_type: 'Monthly' },
  reportBody: { serialNumber: 'SWI005', reportType: 'Monthly' },
  clearKeys: ['draft_monthly_SWI005', 'images_monthly_SWI005_q1'],
};

let storage: ReturnType<typeof makeLocalStorage>;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  storage = makeLocalStorage();
  fetchMock = vi.fn();
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('navigator', { onLine: true });
});

describe('submitWithOfflineQueue', () => {
  it('queues and throws OfflineQueuedError when the device is offline', async () => {
    vi.stubGlobal('navigator', { onLine: false });
    await expect(submitWithOfflineQueue(args)).rejects.toBeInstanceOf(OfflineQueuedError);
    expect(queuedSubmissionCount()).toBe(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('queues when the fetch fails at the network level', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(submitWithOfflineQueue(args)).rejects.toBeInstanceOf(OfflineQueuedError);
    expect(queuedSubmissionCount()).toBe(1);
  });

  it('replaces the entry when the same form is resubmitted offline', async () => {
    vi.stubGlobal('navigator', { onLine: false });
    await expect(submitWithOfflineQueue(args)).rejects.toBeInstanceOf(OfflineQueuedError);
    await expect(submitWithOfflineQueue(args)).rejects.toBeInstanceOf(OfflineQueuedError);
    expect(queuedSubmissionCount()).toBe(1);
  });

  it('does not queue on a server rejection while online', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 400 });
    await expect(submitWithOfflineQueue(args)).rejects.toThrow('Failed to submit');
    expect(queuedSubmissionCount()).toBe(0);
  });

  it('submits then sends the report with the returned recordRef', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ recordRef: 'RI/SWI005/M/1' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    await submitWithOfflineQueue(args);
    const [, reportCall] = fetchMock.mock.calls;
    expect(reportCall[0]).toBe('/api/send-report');
    expect(JSON.parse(reportCall[1].body).recordRef).toBe('RI/SWI005/M/1');
  });
});

describe('flushOfflineQueue', () => {
  beforeEach(async () => {
    vi.stubGlobal('navigator', { onLine: false });
    await submitWithOfflineQueue(args).catch(() => {});
    vi.stubGlobal('navigator', { onLine: true });
    storage.setItem('images_monthly_SWI005_q1', '[]');
  });

  it('sends the queued pair, clears its keys and empties the queue', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ recordRef: 'RI/SWI005/M/2' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    await flushOfflineQueue();
    expect(queuedSubmissionCount()).toBe(0);
    expect(storage.getItem('images_monthly_SWI005_q1')).toBeNull();
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).recordRef).toBe('RI/SWI005/M/2');
  });

  it('keeps the entry when the submit still fails', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 503 });
    await flushOfflineQueue();
    expect(queuedSubmissionCount()).toBe(1);
  });

  it('does not lose the entry when the network drops again mid-flush', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await flushOfflineQueue();
    expect(queuedSubmissionCount()).toBe(1);
    expect(storage.getItem(QUEUE_KEY)).toContain('draft_monthly_SWI005');
  });
});
