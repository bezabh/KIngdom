import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';
import { auth, db, getFirebaseIdToken, handleFirestoreError, OperationType } from '../lib/firebase';
import { TranslationSubscriptionError } from '../lib/translationSubscriptionGuard';
import { UserProfile } from '../types';
import { getLanguageCapability } from '../utils/languages';
import type { OfflineLexiconEntry, OfflinePackMetadata } from '../server/offlineLanguagePacksData';
import {
  coalesceAsyncRequest,
  dedupeByKey,
  invalidateAsyncCache,
  normalizeTextKey,
  safeWriteLocalStorage,
} from '../utils/dataOptimizer';

export interface DownloadedOfflinePack extends OfflinePackMetadata {
  downloadedAt: string;
  entries: OfflineLexiconEntry[];
}

export interface OfflineTranslationMatch {
  translatedText: string;
  transliteration: string;
  matchedMode: 'exact' | 'phrase-segments' | 'word-glossary' | 'no-match';
  coverageTier: 'full-neural' | 'community-validated';
  coverageNote: string;
  usedOfflinePack: string;
}

const DB_NAME = 'axumite_offline_packs_db';
const DB_VERSION = 1;
const STORE_NAME = 'packs';
const CATALOG_CACHE_KEY = 'axumite_offline_pack_catalog_v1';

const LANG_NAME_TO_FIELD: Record<string, keyof OfflineLexiconEntry> = {
  english: 'en',
  en: 'en',
  tigrinya: 'ti',
  ti: 'ti',
  amharic: 'am',
  am: 'am',
  german: 'de',
  deutsch: 'de',
  de: 'de',
  arabic: 'ar',
  ar: 'ar',
  french: 'fr',
  fr: 'fr',
  spanish: 'es',
  es: 'es',
  italian: 'it',
  it: 'it',
  portuguese: 'pt',
  pt: 'pt',
  'chinese (simplified)': 'zh',
  'chinese (traditional)': 'zh',
  chinese: 'zh',
  zh: 'zh',
  "ge'ez": 'gez',
  geez: 'gez',
  gez: 'gez',
  kunama: 'kun',
  kun: 'kun',
  irob: 'irob',
};

export function resolveLexiconField(langNameOrCode: string): keyof OfflineLexiconEntry | null {
  const key = langNameOrCode.trim().toLowerCase();
  if (LANG_NAME_TO_FIELD[key]) return LANG_NAME_TO_FIELD[key];
  for (const [label, field] of Object.entries(LANG_NAME_TO_FIELD)) {
    if (key.includes(label)) return field;
  }
  return null;
}

function openPacksDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is unavailable in this browser environment.'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const database = req.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'code' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Failed to open offline pack database.'));
  });
}

export async function getDownloadedPacks(): Promise<DownloadedOfflinePack[]> {
  return coalesceAsyncRequest<DownloadedOfflinePack[]>(
    'offline_packs:downloaded',
    async () => {
      try {
        const database = await openPacksDb();
        return await new Promise((resolve, reject) => {
          const tx = database.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const req = store.getAll();
          req.onsuccess = () => {
            database.close();
            resolve(Array.isArray(req.result) ? req.result : []);
          };
          req.onerror = () => {
            database.close();
            reject(req.error);
          };
        });
      } catch (err) {
        console.warn('IndexedDB read warning:', err);
        return [];
      }
    },
    15000
  );
}

export async function savePackToIndexedDB(pack: DownloadedOfflinePack): Promise<void> {
  const dedupedPack: DownloadedOfflinePack = {
    ...pack,
    entries: Array.isArray(pack.entries)
      ? dedupeByKey(
          pack.entries,
          (e) => `${normalizeTextKey(e.en)}|${normalizeTextKey(e.ti)}|${normalizeTextKey(e.am)}`
        )
      : [],
  };
  const database = await openPacksDb();
  await new Promise<void>((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(dedupedPack);
    req.onsuccess = () => {
      database.close();
      resolve();
    };
    req.onerror = () => {
      database.close();
      reject(req.error);
    };
  });
  invalidateAsyncCache('offline_packs:downloaded');
}

export async function deletePackFromIndexedDB(code: string): Promise<void> {
  const database = await openPacksDb();
  await new Promise<void>((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(code.toLowerCase());
    req.onsuccess = () => {
      database.close();
      resolve();
    };
    req.onerror = () => {
      database.close();
      reject(req.error);
    };
  });
  invalidateAsyncCache('offline_packs:downloaded');
}

export async function clearAllOfflinePacksIndexedDB(): Promise<void> {
  try {
    const database = await openPacksDb();
    await new Promise<void>((resolve, reject) => {
      const tx = database.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => {
        database.close();
        resolve();
      };
      req.onerror = () => {
        database.close();
        reject(req.error);
      };
    });
  } catch {
    // Ignore cleanup errors
  } finally {
    invalidateAsyncCache('offline_packs:downloaded');
  }
}

export async function fetchAvailableOfflinePacks(): Promise<OfflinePackMetadata[]> {
  return coalesceAsyncRequest<OfflinePackMetadata[]>(
    'offline_packs:catalog',
    async () => {
      try {
        const res = await fetch('/api/obelisk/offline-packs');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.packs)) {
            const uniquePacks = dedupeByKey<OfflinePackMetadata>(
              data.packs,
              (p) => normalizeTextKey(p.code)
            );
            safeWriteLocalStorage(CATALOG_CACHE_KEY, uniquePacks);
            return uniquePacks;
          }
        }
      } catch {
        // Offline fallback to cached catalog
      }
      try {
        const cached = localStorage.getItem(CATALOG_CACHE_KEY);
        if (cached) return JSON.parse(cached);
      } catch {}
      return [];
    },
    60000
  );
}

export async function downloadOfflinePack(
  langCode: string,
  user?: UserProfile
): Promise<DownloadedOfflinePack> {
  const idToken = await getFirebaseIdToken();
  const headers: Record<string, string> = {};
  if (idToken) {
    headers.Authorization = `Bearer ${idToken}`;
  }
  const res = await fetch(`/api/obelisk/offline-pack/${encodeURIComponent(langCode.toLowerCase())}`, {
    headers,
  });
  const data = await res.json().catch(() => ({} as any));
  if (!res.ok || !data.pack) {
    if (res.status === 401 || res.status === 403 || data?.error === 'PRO_SUBSCRIPTION_REQUIRED') {
      throw new TranslationSubscriptionError({
        allowed: false,
        uid: auth.currentUser?.uid || '',
        feature: 'offline_packs',
        plan: 'free',
        subscriptionStatus: String(data?.subscriptionStatus || 'NONE'),
        expiresAt: null,
        source: 'backend_fallback',
        reason: res.status === 401 ? 'UNAUTHENTICATED' : 'SUBSCRIPTION_INACTIVE',
        message:
          data?.message || 'Active Axumite Pro subscription is required to download offline language packs.',
        tigrinyaMessage:
          data?.tigrinyaMessage || 'ናይ ቋንቋ ፓኬጃት ንምውራድ ንጡፍ ናይ Axumite Pro ኣባልነት የድሊ።',
        checkedAt: new Date().toISOString(),
      });
    }
    throw new Error(data.error || `Failed to download offline pack "${langCode}".`);
  }

  const pack: DownloadedOfflinePack = data.pack;
  await savePackToIndexedDB(pack);

  const fbUser = auth.currentUser;
  if (fbUser && !fbUser.isAnonymous) {
    const docPath = `users/${fbUser.uid}/language_packs/${pack.code}`;
    try {
      await setDoc(doc(db, 'users', fbUser.uid, 'language_packs', pack.code), {
        id: pack.code,
        userId: fbUser.uid,
        userEmail: (fbUser.email || user?.email || 'member@axumite.ai').slice(0, 200),
        languageCode: pack.code,
        languageName: pack.name,
        version: pack.version,
        sizeBytes: pack.estimatedBytes,
        downloadedAt: pack.downloadedAt,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, docPath);
    }
  }

  return pack;
}

export async function removeOfflinePack(langCode: string): Promise<void> {
  const cleanCode = langCode.toLowerCase();
  await deletePackFromIndexedDB(cleanCode);

  const fbUser = auth.currentUser;
  if (fbUser && !fbUser.isAnonymous) {
    const docPath = `users/${fbUser.uid}/language_packs/${cleanCode}`;
    try {
      await deleteDoc(doc(db, 'users', fbUser.uid, 'language_packs', cleanCode));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, docPath);
    }
  }
}

export async function listCloudPackRegistry(): Promise<Array<{ id: string; version: string; downloadedAt: string }>> {
  const fbUser = auth.currentUser;
  if (!fbUser || fbUser.isAnonymous) return [];
  const colPath = `users/${fbUser.uid}/language_packs`;
  try {
    const snap = await getDocs(collection(db, 'users', fbUser.uid, 'language_packs'));
    return snap.docs.map((d) => d.data() as any);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, colPath);
    return [];
  }
}

export async function getBrowserStorageEstimate(): Promise<{
  usedBytes: number;
  quotaBytes: number;
  packBytes: number;
}> {
  const packs = await getDownloadedPacks();
  const packBytes = packs.reduce((sum, p) => sum + (p.estimatedBytes || 0), 0);

  if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
    try {
      const est = await navigator.storage.estimate();
      return {
        usedBytes: est.usage || packBytes,
        quotaBytes: est.quota || 512 * 1024 * 1024,
        packBytes,
      };
    } catch {}
  }

  return {
    usedBytes: packBytes,
    quotaBytes: 512 * 1024 * 1024,
    packBytes,
  };
}

function normalizePhrase(input: string): string {
  return input
    .toLowerCase()
    .replace(/[?!.,;:"'()፣፤።]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function translateTextOffline(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<OfflineTranslationMatch> {
  const packs = await getDownloadedPacks();
  const srcField = resolveLexiconField(sourceLanguage);
  const tgtField = resolveLexiconField(targetLanguage);
  const cap = getLanguageCapability(targetLanguage);

  if (packs.length === 0) {
    return {
      translatedText: '',
      transliteration: '',
      matchedMode: 'no-match',
      coverageTier: cap.coverageTier,
      coverageNote: 'No offline language packs are currently downloaded on this device.',
      usedOfflinePack: 'none',
    };
  }

  const targetPack =
    (tgtField && packs.find((p) => p.code.toLowerCase() === tgtField)) ||
    (srcField && packs.find((p) => p.code.toLowerCase() === srcField)) ||
    packs[0];

  const entries = targetPack.entries || [];
  if (!srcField || !tgtField || entries.length === 0) {
    return {
      translatedText: '',
      transliteration: '',
      matchedMode: 'no-match',
      coverageTier: cap.coverageTier,
      coverageNote: `Offline lexicon field unavailable for ${sourceLanguage} ➔ ${targetLanguage}.`,
      usedOfflinePack: targetPack.name,
    };
  }

  const normalizedInput = normalizePhrase(text);

  // 1. Exact phrase match
  const exact = entries.find((entry) => {
    const srcVal = entry[srcField];
    return typeof srcVal === 'string' && normalizePhrase(srcVal) === normalizedInput;
  });

  if (exact && exact[tgtField]) {
    return {
      translatedText: String(exact[tgtField]),
      transliteration: tgtField === 'ti' && exact.phoneticTi ? exact.phoneticTi : String(exact.en || ''),
      matchedMode: 'exact',
      coverageTier: cap.coverageTier,
      coverageNote: `Matched offline in ${targetPack.name} pack v${targetPack.version}.`,
      usedOfflinePack: `${targetPack.name} (${targetPack.code})`,
    };
  }

  // 2. Longest substring phrase match + word glossary assembly
  const sortedEntries = [...entries].sort((a, b) => {
    const aLen = String(a[srcField] || '').length;
    const bLen = String(b[srcField] || '').length;
    return bLen - aLen;
  });

  let working = normalizedInput;
  const matchedTranslations: string[] = [];
  const matchedPhonetics: string[] = [];

  for (const entry of sortedEntries) {
    const srcPhrase = normalizePhrase(String(entry[srcField] || ''));
    const tgtPhrase = entry[tgtField];
    if (!srcPhrase || !tgtPhrase || srcPhrase.length < 2) continue;

    if (working.includes(srcPhrase)) {
      matchedTranslations.push(String(tgtPhrase));
      if (entry.phoneticTi && tgtField === 'ti') {
        matchedPhonetics.push(entry.phoneticTi);
      } else if (entry.en) {
        matchedPhonetics.push(entry.en);
      }
      working = working.replace(srcPhrase, ' ').replace(/\s+/g, ' ').trim();
    }
  }

  if (matchedTranslations.length > 0) {
    return {
      translatedText: matchedTranslations.join(' · '),
      transliteration: matchedPhonetics.join(' · '),
      matchedMode: working.length === 0 ? 'phrase-segments' : 'word-glossary',
      coverageTier: cap.coverageTier,
      coverageNote:
        working.length === 0
          ? `Translated offline using ${targetPack.name} pack v${targetPack.version}.`
          : `Partial offline glossary match (unmatched tokens: "${working}"). Connect online for full sentence syntax.`,
      usedOfflinePack: `${targetPack.name} (${targetPack.code})`,
    };
  }

  return {
    translatedText: '',
    transliteration: '',
    matchedMode: 'no-match',
    coverageTier: cap.coverageTier,
    coverageNote: `No matching offline glossary entry in ${targetPack.name} pack for "${text}". Connect online for full neural translation.`,
    usedOfflinePack: `${targetPack.name} (${targetPack.code})`,
  };
}
