import * as StoryAPI from '../data/api';
import {
  getOutboxEntries,
  removeFromOutbox,
  updateOutboxEntry,
  countOutboxEntries,
} from '../data/database';

const listeners = new Set();

function notifyListeners(state) {
  listeners.forEach((listener) => {
    try {
      listener(state);
    } catch (error) {
      console.error('SyncManager listener error:', error);
    }
  });
}

export function onSyncStateChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function getPendingCount() {
  return countOutboxEntries();
}

/**
 * Lets other parts of the app (e.g. the add-story form, right after queueing
 * an offline submission) tell subscribed UI to refresh its pending count
 * without needing direct access to the internal listener set.
 */
export async function refreshPendingCount() {
  const pending = await countOutboxEntries();
  notifyListeners({ syncing: isSyncing, pending });
  return pending;
}

let isSyncing = false;

/**
 * Attempts to send every queued outbox entry to the API. Entries that
 * succeed are removed from IndexedDB; entries that still fail (e.g. we're
 * still offline) are left in place with an updated status so the next
 * `online` event or manual retry can pick them up again.
 */
export async function flushOutbox() {
  if (isSyncing) return;
  if (!navigator.onLine) return;

  const entries = await getOutboxEntries();
  if (entries.length === 0) return;

  isSyncing = true;
  notifyListeners({ syncing: true, pending: entries.length });

  let successCount = 0;

  for (const entry of entries) {
    try {
      await updateOutboxEntry(entry.localId, { status: 'syncing' });
      const photo = new File([entry.photoBlob], entry.photoName || 'story.jpg', {
        type: entry.photoType || 'image/jpeg',
      });

      const response = await StoryAPI.addStory({
        description: entry.description,
        photo,
        lat: entry.lat,
        lon: entry.lon,
      });

      if (response.error === false) {
        await removeFromOutbox(entry.localId);
        successCount += 1;
      } else {
        await updateOutboxEntry(entry.localId, { status: 'failed', errorMessage: response.message });
      }
    } catch (error) {
      // Network error — most likely we went offline again mid-sync. Leave
      // the entry queued and stop; we'll retry on the next `online` event.
      await updateOutboxEntry(entry.localId, { status: 'pending', errorMessage: error.message });
      break;
    }
  }

  isSyncing = false;
  const remaining = await countOutboxEntries();
  notifyListeners({ syncing: false, pending: remaining, lastSyncedCount: successCount });
}

let initialized = false;

export function initSyncManager() {
  if (initialized) return;
  initialized = true;

  window.addEventListener('online', () => {
    flushOutbox();
  });

  // Also try once at startup in case entries were queued during a previous
  // offline session and the app is reopened while already online.
  if (navigator.onLine) {
    flushOutbox();
  }
}
