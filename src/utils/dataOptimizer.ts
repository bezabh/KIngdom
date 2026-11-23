import type { AppNotification, SavedItem, UserFileRecord } from '../types';

/**
 * Central Redundant-Data Deduplication, Dirty-Check Persistence,
 * Storage Compaction & Async Request Coalescing Utility.
 */

const lastWrittenSerializedMap = new Map<string, string>();
const inFlightRequests = new Map<string, Promise<unknown>>();
const memoryReadCache = new Map<string, { value: unknown; expiresAt: number }>();

const MAX_MEMORY_CACHE_ENTRIES = 120;

/**
 * Normalize text for fast semantic deduplication keys.
 */
export function normalizeTextKey(value: string | undefined | null): string {
  if (!value) return '';
  return String(value)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Deterministic serializer with sorted object keys that omits volatile metadata fields.
 */
function canonicalStringify(value: unknown, ignoredKeysSet: Set<string>, depth = 0): string {
  if (depth > 8) return '"[depth]"';
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';

  const type = typeof value;
  if (type === 'number') {
    return Number.isFinite(value) ? String(value) : 'null';
  }
  if (type === 'boolean') return value ? 'true' : 'false';
  if (type === 'string') return JSON.stringify(value);

  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalStringify(item, ignoredKeysSet, depth + 1)).join(',')}]`;
  }

  if (type === 'object') {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj)
      .filter((k) => !ignoredKeysSet.has(k) && obj[k] !== undefined)
      .sort();
    const entries = keys.map(
      (k) => `${JSON.stringify(k)}:${canonicalStringify(obj[k], ignoredKeysSet, depth + 1)}`
    );
    return `{${entries.join(',')}}`;
  }

  return JSON.stringify(String(value));
}

/**
 * Compute a fast, deterministic FNV-1a 32-bit hex content hash, ignoring volatile fields.
 */
export function getStableContentHash(
  value: unknown,
  ignoredKeys: string[] = ['updatedAt', 'lastSyncedAt', 'timestamp']
): string {
  const serialized = canonicalStringify(value, new Set(ignoredKeys));
  let hash = 0x811c9dc5;
  for (let i = 0; i < serialized.length; i++) {
    hash ^= serialized.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `${(hash >>> 0).toString(16)}_${serialized.length}`;
}

/**
 * Deduplicate an array by a derived key, preserving first (typically newest) occurrence.
 */
export function dedupeByKey<T>(
  items: T[],
  getKey: (item: T) => string,
  maxItems?: number
): T[] {
  if (!Array.isArray(items) || items.length === 0) return [];
  const seen = new Set<string>();
  const result: T[] = [];

  for (const item of items) {
    if (item == null) continue;
    const key = getKey(item);
    if (!key) {
      result.push(item);
    } else if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
    if (maxItems && result.length >= maxItems) break;
  }

  return result;
}

/**
 * Deduplicate records by both unique ID and semantic content key, preserving newest order.
 */
export function dedupeRecordsByIdAndContent<T>(
  items: T[],
  getId: (item: T) => string,
  getContentKey: (item: T) => string,
  maxItems = 80
): T[] {
  if (!Array.isArray(items) || items.length === 0) return [];
  const seenIds = new Set<string>();
  const seenContent = new Set<string>();
  const result: T[] = [];

  for (const item of items) {
    if (item == null) continue;
    const id = getId(item);
    const contentKey = getContentKey(item);

    if (id && seenIds.has(id)) continue;
    if (contentKey && seenContent.has(contentKey)) continue;

    if (id) seenIds.add(id);
    if (contentKey) seenContent.add(contentKey);
    result.push(item);

    if (result.length >= maxItems) break;
  }

  return result;
}

/**
 * Deduplicate Saved Insights by normalized (type|title|content), merging unique tags
 * and preserving the newest record's metadata/thumbnail.
 */
export function dedupeSavedInsights(items: SavedItem[], maxItems = 200): SavedItem[] {
  if (!Array.isArray(items) || items.length === 0) return [];

  const bySemanticKey = new Map<string, SavedItem>();
  const seenIds = new Set<string>();
  const orderedKeys: string[] = [];

  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    if (item.id && seenIds.has(item.id)) continue;

    const cleanTags = Array.isArray(item.tags)
      ? Array.from(new Set(item.tags.map((t) => String(t).trim()).filter(Boolean)))
      : [];

    const semanticKey = `${item.type || 'chat'}|${normalizeTextKey(item.title)}|${normalizeTextKey(item.content).slice(0, 600)}`;
    const existing = bySemanticKey.get(semanticKey);

    if (!existing) {
      if (item.id) seenIds.add(item.id);
      bySemanticKey.set(semanticKey, { ...item, tags: cleanTags });
      orderedKeys.push(semanticKey);
    } else {
      // Merge unique tags and backfill missing metadata without duplicating the item
      const mergedTags = Array.from(new Set([...existing.tags, ...cleanTags]));
      bySemanticKey.set(semanticKey, {
        ...existing,
        tags: mergedTags,
        metadata: existing.metadata || item.metadata,
      });
    }
  }

  return orderedKeys
    .slice(0, maxItems)
    .map((key) => bySemanticKey.get(key)!)
    .filter(Boolean);
}

/**
 * Deduplicate AppNotifications by ID and semantic key (category|titleEn|bodyEn),
 * preserving `read: true` if either duplicate has been read.
 */
export function dedupeNotifications(items: AppNotification[], maxItems = 80): AppNotification[] {
  if (!Array.isArray(items) || items.length === 0) return [];

  const byId = new Set<string>();
  const byContent = new Map<string, number>();
  const result: AppNotification[] = [];

  for (const notif of items) {
    if (!notif || typeof notif !== 'object') continue;
    if (notif.id && byId.has(notif.id)) continue;

    const semanticKey = `${notif.category || 'info'}|${normalizeTextKey(notif.titleEn || notif.titleTi)}|${normalizeTextKey(notif.bodyEn || notif.bodyTi).slice(0, 260)}`;
    const existingIdx = byContent.get(semanticKey);

    if (existingIdx !== undefined) {
      // Preserve read status if the duplicate was already acknowledged
      if (notif.read && !result[existingIdx].read) {
        result[existingIdx] = { ...result[existingIdx], read: true };
      }
      continue;
    }

    if (notif.id) byId.add(notif.id);
    byContent.set(semanticKey, result.length);
    result.push(notif);

    if (result.length >= maxItems) break;
  }

  return result;
}

/**
 * Deduplicate UserFileRecords by id and normalized (userId|fileName|fileSize|category).
 */
export function dedupeUserFiles(files: UserFileRecord[], maxItems = 120): UserFileRecord[] {
  return dedupeRecordsByIdAndContent(
    files,
    (f) => f.id || '',
    (f) =>
      `${normalizeTextKey(f.userId || f.userEmail)}|${normalizeTextKey(f.fileName)}|${f.fileSize || 0}|${f.category || 'other'}`,
    maxItems
  );
}

/**
 * Dirty-checked, quota-safe localStorage writer.
 * - Skips identical writes via an in-memory serialized snapshot cache.
 * - On QuotaExceededError, automatically compacts redundant app storage and retries once.
 */
export function safeWriteLocalStorage(key: string, value: unknown): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;

  let serialized: string;
  try {
    serialized = typeof value === 'string' ? value : JSON.stringify(value);
  } catch {
    return false;
  }

  // Skip identical redundant writes
  if (lastWrittenSerializedMap.get(key) === serialized) {
    return true;
  }

  try {
    const existing = localStorage.getItem(key);
    if (existing === serialized) {
      lastWrittenSerializedMap.set(key, serialized);
      return true;
    }
    localStorage.setItem(key, serialized);
    lastWrittenSerializedMap.set(key, serialized);
    return true;
  } catch (err: any) {
    const isQuota =
      err?.name === 'QuotaExceededError' ||
      err?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      err?.code === 22 ||
      err?.code === 1014;

    if (isQuota) {
      compactRedundantAppStorage({ aggressive: true });
      try {
        localStorage.setItem(key, serialized);
        lastWrittenSerializedMap.set(key, serialized);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
}

/**
 * Clear tracked write cache for a removed key.
 */
export function safeRemoveLocalStorage(key: string): void {
  lastWrittenSerializedMap.delete(key);
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore storage removal errors
  }
}

/**
 * Scan and compact redundant entries across known application localStorage keys.
 */
export function compactRedundantAppStorage(options?: { aggressive?: boolean }): {
  deduplicatedKeys: number;
  removedItems: number;
  bytesReclaimed: number;
} {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { deduplicatedKeys: 0, removedItems: 0, bytesReclaimed: 0 };
  }

  const aggressive = !!options?.aggressive;
  let deduplicatedKeys = 0;
  let removedItems = 0;
  let bytesReclaimed = 0;

  const compactArrayKey = <T>(
    key: string,
    deduper: (rows: T[]) => T[]
  ) => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw || raw.length < 4) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;

      const compacted = deduper(parsed);
      const nextSerialized = JSON.stringify(compacted);
      if (compacted.length < parsed.length || nextSerialized.length < raw.length) {
        removedItems += Math.max(0, parsed.length - compacted.length);
        bytesReclaimed += Math.max(0, raw.length - nextSerialized.length);
        localStorage.setItem(key, nextSerialized);
        lastWrittenSerializedMap.set(key, nextSerialized);
        deduplicatedKeys += 1;
      }
    } catch {
      // Skip malformed/unreadable keys safely
    }
  };

  // 1. Saved Insights
  compactArrayKey<SavedItem>('axumite_saved_insights', (rows) =>
    dedupeSavedInsights(rows, aggressive ? 100 : 200)
  );

  // 2. Push Notifications
  compactArrayKey<AppNotification>('axumite_push_notifications', (rows) =>
    dedupeNotifications(rows, aggressive ? 40 : 80)
  );

  // 3. Voice Assistant quick history
  compactArrayKey<any>('axumite_voice_history', (rows) =>
    dedupeRecordsByIdAndContent(
      rows,
      (r) => String(r?.id || ''),
      (r) => `${normalizeTextKey(r?.role)}|${normalizeTextKey(r?.text || r?.content)}`,
      aggressive ? 15 : 30
    )
  );

  // 4. Local user file vault
  compactArrayKey<UserFileRecord>('axumite_user_file_vault', (rows) => {
    const deduped = dedupeUserFiles(rows, aggressive ? 40 : 100);
    if (!aggressive) return deduped;
    // Under quota pressure, strip inline base64 previews for files that already have a cloud downloadUrl
    return deduped.map((f) =>
      f.downloadUrl && f.fileData && f.fileData.startsWith('data:')
        ? { ...f, fileData: f.downloadUrl }
        : f
    );
  });

  // 5. Dynamic user-scoped translator & voice history keys
  let allKeys: string[] = [];
  try {
    allKeys = Object.keys(localStorage);
  } catch {
    allKeys = [];
  }

  for (const key of allKeys) {
    if (key.startsWith('axumite_voice_translation_logs_v1')) {
      compactArrayKey<any>(key, (rows) =>
        dedupeRecordsByIdAndContent(
          rows,
          (r) => String(r?.id || ''),
          (r) =>
            `${normalizeTextKey(r?.sourceLanguage)}|${normalizeTextKey(r?.targetLanguage)}|${normalizeTextKey(r?.sourceTranscript)}|${normalizeTextKey(r?.translatedText)}`,
          aggressive ? 40 : 80
        )
      );
    } else if (key.startsWith('axumite_conv_sessions_v1')) {
      compactArrayKey<any>(key, (rows) =>
        dedupeRecordsByIdAndContent(
          rows,
          (r) => String(r?.id || ''),
          (r) =>
            `${normalizeTextKey(r?.personALang)}|${normalizeTextKey(r?.personBLang)}|${normalizeTextKey(r?.transcriptSummary)}`,
          aggressive ? 25 : 50
        )
      );
    } else if (key.startsWith('axumite_call_sessions_v1')) {
      compactArrayKey<any>(key, (rows) =>
        dedupeRecordsByIdAndContent(
          rows,
          (r) => String(r?.id || ''),
          (r) =>
            `${normalizeTextKey(r?.roomCode)}|${normalizeTextKey(r?.callType)}|${r?.durationSeconds || 0}|${normalizeTextKey(r?.transcriptText).slice(0, 240)}`,
          aggressive ? 25 : 50
        )
      );
    } else if (key.startsWith('axumite_ocr_documents_v1')) {
      compactArrayKey<any>(key, (rows) =>
        dedupeRecordsByIdAndContent(
          rows,
          (r) => String(r?.id || ''),
          (r) =>
            `${normalizeTextKey(r?.captureSource)}|${normalizeTextKey(r?.targetLanguage)}|${normalizeTextKey(r?.originalText).slice(0, 300)}|${normalizeTextKey(r?.translatedText).slice(0, 300)}`,
          aggressive ? 25 : 50
        )
      );
    } else if (key === 'asmera_saved_jobs') {
      compactArrayKey<any>(key, (rows) =>
        dedupeByKey(rows, (r) => (typeof r === 'string' ? r : String(r?.id || r?.title || '')), 100)
      );
    } else if (key === 'axumite_chat_history_archive') {
      compactArrayKey<any>(key, (rows) =>
        dedupeRecordsByIdAndContent(
          rows,
          (r) => String(r?.id || ''),
          (r) => `${normalizeTextKey(r?.role)}|${normalizeTextKey(r?.content || r?.text).slice(0, 300)}`,
          aggressive ? 40 : 100
        )
      );
    } else if (key === 'axumite_admin_audit_logs') {
      compactArrayKey<any>(key, (rows) =>
        dedupeByKey(rows, (r) => String(r?.id || `${r?.timestamp}|${r?.action}`), aggressive ? 50 : 120)
      );
    } else if (key === 'axumite_pro_click_activities') {
      compactArrayKey<any>(key, (rows) =>
        dedupeByKey(rows, (r) => String(r?.id || `${r?.timestamp}|${r?.type}`), aggressive ? 40 : 80)
      );
    } else if (key === 'axumite_payment_transactions') {
      compactArrayKey<any>(key, (rows) =>
        dedupeByKey(rows, (r) => String(r?.id || r?.reference || ''), aggressive ? 40 : 100)
      );
    }
  }

  return { deduplicatedKeys, removedItems, bytesReclaimed };
}

let startupOptimizationScheduled = false;

/**
 * Schedule a single non-blocking idle compaction pass after initial render.
 */
export function runStartupStorageOptimization(): void {
  if (startupOptimizationScheduled || typeof window === 'undefined') return;
  startupOptimizationScheduled = true;

  const execute = () => {
    try {
      compactRedundantAppStorage();
    } catch {
      // Never impact UI flow
    }
  };

  if ('requestIdleCallback' in window && typeof (window as any).requestIdleCallback === 'function') {
    (window as any).requestIdleCallback(execute, { timeout: 3000 });
  } else {
    window.setTimeout(execute, 1500);
  }
}

/**
 * Coalesce concurrent identical async calls and optionally serve from a short-TTL memory cache.
 */
export function coalesceAsyncRequest<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  ttlMs = 0
): Promise<T> {
  const now = Date.now();

  if (ttlMs > 0) {
    const cached = memoryReadCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return Promise.resolve(cached.value as T);
    }
  }

  const existingPromise = inFlightRequests.get(cacheKey);
  if (existingPromise) {
    return existingPromise as Promise<T>;
  }

  const promise = fetcher()
    .then((result) => {
      if (ttlMs > 0) {
        if (memoryReadCache.size >= MAX_MEMORY_CACHE_ENTRIES) {
          const oldestKey = memoryReadCache.keys().next().value;
          if (oldestKey) memoryReadCache.delete(oldestKey);
        }
        memoryReadCache.set(cacheKey, { value: result, expiresAt: Date.now() + ttlMs });
      }
      return result;
    })
    .finally(() => {
      inFlightRequests.delete(cacheKey);
    });

  inFlightRequests.set(cacheKey, promise);
  return promise;
}

/**
 * Invalidate cached async read entries by key prefix (or clear all if omitted).
 */
export function invalidateAsyncCache(keyPrefix?: string): void {
  if (!keyPrefix) {
    memoryReadCache.clear();
    return;
  }
  for (const key of memoryReadCache.keys()) {
    if (key.startsWith(keyPrefix)) {
      memoryReadCache.delete(key);
    }
  }
}
