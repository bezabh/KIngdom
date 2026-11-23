import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile, WordBreakdown } from '../types';
import {
  coalesceAsyncRequest,
  dedupeRecordsByIdAndContent,
  invalidateAsyncCache,
  normalizeTextKey,
  safeWriteLocalStorage,
} from '../utils/dataOptimizer';

export interface VoiceTranslationLogRecord {
  id: string;
  speaker: 'A' | 'B';
  sourceLanguage: string;
  targetLanguage: string;
  sourceTranscript: string;
  translatedText: string;
  spokenTargetText: string;
  transliteration: string;
  scriptName: string;
  wordBreakdown: WordBreakdown[];
  culturalContext: string;
  latencyMs?: number;
  timestamp: string;
  createdAt: string;
}

const STORAGE_KEY_PREFIX = 'axumite_voice_translation_logs_v1';
const MAX_LOCAL_LOGS = 80;

function getVoiceLogContentKey(record: VoiceTranslationLogRecord): string {
  return `${normalizeTextKey(record.sourceLanguage)}|${normalizeTextKey(record.targetLanguage)}|${normalizeTextKey(record.sourceTranscript)}|${normalizeTextKey(record.translatedText)}`;
}

function dedupeVoiceLogs(logs: VoiceTranslationLogRecord[]): VoiceTranslationLogRecord[] {
  return dedupeRecordsByIdAndContent(
    logs,
    (l) => l.id || '',
    (l) => getVoiceLogContentKey(l),
    MAX_LOCAL_LOGS
  );
}

function getStorageKey(user?: UserProfile): string {
  const emailLower = (auth.currentUser?.email || user?.email || '').trim().toLowerCase();
  const idPart = (emailLower || auth.currentUser?.uid || user?.id || 'guest').replace(
    /[^a-z0-9@._-]/gi,
    '_'
  );
  return `${STORAGE_KEY_PREFIX}:${idPart}`;
}

function readLocalLogs(user?: UserProfile): VoiceTranslationLogRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(getStorageKey(user));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const deduped = dedupeVoiceLogs(parsed);
    if (deduped.length !== parsed.length) {
      safeWriteLocalStorage(getStorageKey(user), deduped);
    }
    return deduped;
  } catch {
    return [];
  }
}

function writeLocalLogs(logs: VoiceTranslationLogRecord[], user?: UserProfile): void {
  if (typeof window === 'undefined') return;
  const deduped = dedupeVoiceLogs(logs);
  safeWriteLocalStorage(getStorageKey(user), deduped);
}

function sanitizeForFirestore(
  record: VoiceTranslationLogRecord,
  userId: string,
  userEmail: string,
  authUid?: string
): Record<string, any> {
  const cleanBreakdown = Array.isArray(record.wordBreakdown)
    ? record.wordBreakdown.slice(0, 12).map((wb) => ({
        originalWord: String(wb.originalWord || '').slice(0, 120),
        translatedWord: String(wb.translatedWord || '').slice(0, 120),
        phonetic: String(wb.phonetic || '').slice(0, 120),
        meaning: String(wb.meaning || '').slice(0, 200),
      }))
    : [];

  const payload: Record<string, any> = {
    id: record.id.slice(0, 128),
    userId: userId.slice(0, 128),
    userEmail: (userEmail || 'guest@axumite.ai').slice(0, 200),
    speaker: record.speaker === 'B' ? 'B' : 'A',
    sourceLanguage: String(record.sourceLanguage || 'Tigrinya').slice(0, 64),
    targetLanguage: String(record.targetLanguage || 'English').slice(0, 64),
    sourceTranscript: String(record.sourceTranscript || '').slice(0, 2000),
    translatedText: String(record.translatedText || '').slice(0, 2000),
    spokenTargetText: String(record.spokenTargetText || record.translatedText || '').slice(0, 2000),
    transliteration: String(record.transliteration || '').slice(0, 2000),
    scriptName: String(record.scriptName || 'Ethiopic Fidel Script').slice(0, 100),
    culturalContext: String(record.culturalContext || '').slice(0, 1000),
    wordBreakdown: cleanBreakdown,
    timestamp: String(record.timestamp || '').slice(0, 64),
    createdAt: String(record.createdAt || new Date().toISOString()).slice(0, 64),
  };

  if (authUid) {
    payload.authUid = authUid.slice(0, 128);
  }
  if (typeof record.latencyMs === 'number' && Number.isFinite(record.latencyMs)) {
    payload.latencyMs = Math.max(0, Math.min(120000, Math.round(record.latencyMs)));
  }

  return payload;
}

export async function loadVoiceHistoryLogs(
  user?: UserProfile
): Promise<{ logs: VoiceTranslationLogRecord[]; cloudSynced: boolean }> {
  const localLogs = readLocalLogs(user);
  const fbUser = auth.currentUser;

  if (!fbUser || fbUser.isAnonymous) {
    return { logs: localLogs, cloudSynced: false };
  }

  const cacheKey = `voice_logs:${fbUser.uid}`;
  return coalesceAsyncRequest<{ logs: VoiceTranslationLogRecord[]; cloudSynced: boolean }>(
    cacheKey,
    async () => {
      const collectionPath = `users/${fbUser.uid}/voice_translation_logs`;
      try {
        const q = query(
          collection(db, 'users', fbUser.uid, 'voice_translation_logs'),
          orderBy('createdAt', 'desc'),
          limit(60)
        );
        const snap = await getDocs(q);
        const cloudLogs: VoiceTranslationLogRecord[] = snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: data.id || d.id,
            speaker: data.speaker === 'B' ? 'B' : 'A',
            sourceLanguage: data.sourceLanguage || 'Tigrinya',
            targetLanguage: data.targetLanguage || 'English',
            sourceTranscript: data.sourceTranscript || '',
            translatedText: data.translatedText || '',
            spokenTargetText: data.spokenTargetText || data.translatedText || '',
            transliteration: data.transliteration || '',
            scriptName: data.scriptName || '',
            wordBreakdown: Array.isArray(data.wordBreakdown) ? data.wordBreakdown : [],
            culturalContext: data.culturalContext || '',
            latencyMs: typeof data.latencyMs === 'number' ? data.latencyMs : undefined,
            timestamp: data.timestamp || '',
            createdAt: data.createdAt || new Date().toISOString(),
          };
        });

        // Merge and deduplicate both by ID and semantic transcript content
        const sorted = [...cloudLogs, ...localLogs].sort((a, b) =>
          b.createdAt.localeCompare(a.createdAt)
        );
        const merged = dedupeVoiceLogs(sorted);
        writeLocalLogs(merged, user);
        return { logs: merged, cloudSynced: true };
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, collectionPath);
        return { logs: localLogs, cloudSynced: false };
      }
    },
    10000
  );
}

export async function saveVoiceHistoryLog(
  record: VoiceTranslationLogRecord,
  user?: UserProfile
): Promise<{ cloudSynced: boolean }> {
  const existing = readLocalLogs(user);
  const incomingContentKey = getVoiceLogContentKey(record);
  const duplicateEntry = existing.find(
    (l) => l.id === record.id || getVoiceLogContentKey(l) === incomingContentKey
  );

  // Deduplicate locally by placing latest record first and removing semantic duplicates
  const updated = dedupeVoiceLogs([record, ...existing]);
  writeLocalLogs(updated, user);
  invalidateAsyncCache('voice_logs:');

  const fbUser = auth.currentUser;
  if (!fbUser || fbUser.isAnonymous) {
    return { cloudSynced: false };
  }

  // Skip redundant Firestore write if an identical translation record already exists
  if (
    duplicateEntry &&
    duplicateEntry.sourceTranscript === record.sourceTranscript &&
    duplicateEntry.translatedText === record.translatedText
  ) {
    return { cloudSynced: true };
  }

  const docPath = `users/${fbUser.uid}/voice_translation_logs/${record.id}`;
  try {
    const cleanPayload = sanitizeForFirestore(
      record,
      fbUser.uid,
      fbUser.email || user?.email || 'member@axumite.ai',
      fbUser.uid
    );
    await setDoc(doc(db, 'users', fbUser.uid, 'voice_translation_logs', record.id), cleanPayload);
    return { cloudSynced: true };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, docPath);
    return { cloudSynced: false };
  }
}

export async function deleteVoiceHistoryLog(logId: string, user?: UserProfile): Promise<void> {
  const existing = readLocalLogs(user);
  writeLocalLogs(
    existing.filter((l) => l.id !== logId),
    user
  );
  invalidateAsyncCache('voice_logs:');

  const fbUser = auth.currentUser;
  if (!fbUser || fbUser.isAnonymous) return;

  const docPath = `users/${fbUser.uid}/voice_translation_logs/${logId}`;
  try {
    await deleteDoc(doc(db, 'users', fbUser.uid, 'voice_translation_logs', logId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, docPath);
  }
}

export async function clearVoiceHistoryLogs(
  logIds: string[],
  user?: UserProfile
): Promise<void> {
  writeLocalLogs([], user);
  invalidateAsyncCache('voice_logs:');

  const fbUser = auth.currentUser;
  if (!fbUser || fbUser.isAnonymous || logIds.length === 0) return;

  const collectionPath = `users/${fbUser.uid}/voice_translation_logs`;
  try {
    const batch = writeBatch(db);
    for (const id of logIds.slice(0, 100)) {
      batch.delete(doc(db, 'users', fbUser.uid, 'voice_translation_logs', id));
    }
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, collectionPath);
  }
}
