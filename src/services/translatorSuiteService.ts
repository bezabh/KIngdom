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
import { auth, db, getFirebaseIdToken, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile } from '../types';
import { clearAllOfflinePacksIndexedDB, getDownloadedPacks } from './offlinePackService';
import {
  coalesceAsyncRequest,
  dedupeRecordsByIdAndContent,
  invalidateAsyncCache,
  normalizeTextKey,
  safeRemoveLocalStorage,
  safeWriteLocalStorage,
} from '../utils/dataOptimizer';

export interface ConversationTurnItem {
  id: string;
  speaker: 'A' | 'B';
  sourceLanguage: string;
  targetLanguage: string;
  originalText: string;
  translatedText: string;
  transliteration?: string;
  timestamp: string;
}

export interface ConversationSessionRecord {
  id: string;
  personALang: string;
  personBLang: string;
  turnCount: number;
  transcriptSummary: string;
  turns: ConversationTurnItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CallSessionRecord {
  id: string;
  roomCode: string;
  callType: 'audio' | 'video';
  localLanguage: string;
  remoteLanguage: string;
  durationSeconds: number;
  transcriptText: string;
  createdAt: string;
}

export interface OcrOverlayBlock {
  originalText: string;
  translatedText: string;
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
}

export interface OcrDocumentRecord {
  id: string;
  title: string;
  captureSource: 'screen_capture' | 'camera_ocr' | 'image_upload';
  detectedLanguage: string;
  targetLanguage: string;
  originalText: string;
  translatedText: string;
  transliteration?: string;
  pageCount: number;
  createdAt: string;
}

const CONV_KEY = 'axumite_conv_sessions_v1';
const CALL_KEY = 'axumite_call_sessions_v1';
const OCR_KEY = 'axumite_ocr_documents_v1';
const GUEST_CLIENT_ID_KEY = 'axumite_guest_client_id_v1';

export function getOrCreateClientSessionId(): string {
  if (typeof window === 'undefined') return 'server_session';
  try {
    const existing = localStorage.getItem(GUEST_CLIENT_ID_KEY);
    if (existing) return existing;
    const nextId = `guest_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem(GUEST_CLIENT_ID_KEY, nextId);
    return nextId;
  } catch {
    return 'guest_browser';
  }
}

export function buildTranslatorApiHeaders(user?: UserProfile): Record<string, string> {
  const email = auth.currentUser?.email || user?.email || '';
  const userId = auth.currentUser?.uid || user?.id || (email ? '' : getOrCreateClientSessionId());
  const role = user?.role || (email ? 'Free Member' : 'Guest');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (userId) headers['x-user-id'] = userId;
  if (email) headers['x-user-email'] = email;
  if (role) headers['x-user-role'] = role;
  return headers;
}

export async function buildAuthorizedTranslatorApiHeaders(
  user?: UserProfile
): Promise<Record<string, string>> {
  const headers = buildTranslatorApiHeaders(user);
  const idToken = await getFirebaseIdToken();
  if (idToken) {
    headers.Authorization = `Bearer ${idToken}`;
  }
  return headers;
}

function scopedKey(base: string, user?: UserProfile): string {
  const id = (auth.currentUser?.uid || user?.email || user?.id || 'guest').replace(/[^a-z0-9@._-]/gi, '_');
  return `${base}:${id}`;
}

function readLocal<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal<T>(key: string, rows: T[]): void {
  if (typeof window === 'undefined') return;
  safeWriteLocalStorage(key, rows.slice(0, 50));
}

function dedupeConversations(rows: ConversationSessionRecord[]): ConversationSessionRecord[] {
  return dedupeRecordsByIdAndContent(
    rows,
    (r) => r.id || '',
    (r) =>
      `${normalizeTextKey(r.personALang)}|${normalizeTextKey(r.personBLang)}|${r.turnCount}|${normalizeTextKey(r.transcriptSummary)}`,
    50
  );
}

function dedupeCalls(rows: CallSessionRecord[]): CallSessionRecord[] {
  return dedupeRecordsByIdAndContent(
    rows,
    (r) => r.id || '',
    (r) =>
      `${normalizeTextKey(r.roomCode)}|${r.callType}|${r.durationSeconds}|${normalizeTextKey(r.transcriptText).slice(0, 240)}`,
    50
  );
}

function dedupeOcrDocs(rows: OcrDocumentRecord[]): OcrDocumentRecord[] {
  return dedupeRecordsByIdAndContent(
    rows,
    (r) => r.id || '',
    (r) =>
      `${r.captureSource}|${normalizeTextKey(r.targetLanguage)}|${normalizeTextKey(r.originalText).slice(0, 300)}|${normalizeTextKey(r.translatedText).slice(0, 300)}`,
    50
  );
}

// =========================================================================
// 1. CONVERSATION SESSIONS
// =========================================================================

export async function loadConversationSessions(user?: UserProfile): Promise<ConversationSessionRecord[]> {
  const key = scopedKey(CONV_KEY, user);
  const localRows = dedupeConversations(readLocal<ConversationSessionRecord>(key));
  const fbUser = auth.currentUser;
  if (!fbUser || fbUser.isAnonymous) return localRows;

  return coalesceAsyncRequest<ConversationSessionRecord[]>(
    `conv_sessions:${fbUser.uid}`,
    async () => {
      const colPath = `users/${fbUser.uid}/conversation_sessions`;
      try {
        const q = query(collection(db, 'users', fbUser.uid, 'conversation_sessions'), orderBy('updatedAt', 'desc'), limit(30));
        const snap = await getDocs(q);
        const cloudRows = snap.docs.map((d) => d.data() as ConversationSessionRecord);
        const merged = dedupeConversations([...cloudRows, ...localRows]);
        writeLocal(key, merged);
        return merged;
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, colPath);
        return localRows;
      }
    },
    10000
  );
}

export async function saveConversationSession(
  record: ConversationSessionRecord,
  user?: UserProfile
): Promise<void> {
  const key = scopedKey(CONV_KEY, user);
  const existing = readLocal<ConversationSessionRecord>(key);
  writeLocal(key, dedupeConversations([record, ...existing]));
  invalidateAsyncCache('conv_sessions:');

  const fbUser = auth.currentUser;
  if (!fbUser || fbUser.isAnonymous) return;

  const docPath = `users/${fbUser.uid}/conversation_sessions/${record.id}`;
  try {
    await setDoc(doc(db, 'users', fbUser.uid, 'conversation_sessions', record.id), {
      id: record.id.slice(0, 128),
      userId: fbUser.uid,
      userEmail: (fbUser.email || user?.email || 'member@axumite.ai').slice(0, 200),
      personALang: record.personALang.slice(0, 64),
      personBLang: record.personBLang.slice(0, 64),
      turnCount: record.turnCount,
      transcriptSummary: (record.transcriptSummary || 'Session transcript').slice(0, 4000),
      turns: record.turns.slice(0, 40),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, docPath);
  }
}

export async function deleteConversationSession(id: string, user?: UserProfile): Promise<void> {
  const key = scopedKey(CONV_KEY, user);
  writeLocal(
    key,
    readLocal<ConversationSessionRecord>(key).filter((r) => r.id !== id)
  );
  invalidateAsyncCache('conv_sessions:');
  const fbUser = auth.currentUser;
  if (!fbUser || fbUser.isAnonymous) return;
  try {
    await deleteDoc(doc(db, 'users', fbUser.uid, 'conversation_sessions', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `users/${fbUser.uid}/conversation_sessions/${id}`);
  }
}

// =========================================================================
// 2. CALL SESSIONS
// =========================================================================

export async function loadCallSessions(user?: UserProfile): Promise<CallSessionRecord[]> {
  const key = scopedKey(CALL_KEY, user);
  const localRows = dedupeCalls(readLocal<CallSessionRecord>(key));
  const fbUser = auth.currentUser;
  if (!fbUser || fbUser.isAnonymous) return localRows;

  return coalesceAsyncRequest<CallSessionRecord[]>(
    `call_sessions:${fbUser.uid}`,
    async () => {
      const colPath = `users/${fbUser.uid}/call_sessions`;
      try {
        const q = query(collection(db, 'users', fbUser.uid, 'call_sessions'), orderBy('createdAt', 'desc'), limit(30));
        const snap = await getDocs(q);
        const cloudRows = snap.docs.map((d) => d.data() as CallSessionRecord);
        const merged = dedupeCalls([...cloudRows, ...localRows]);
        writeLocal(key, merged);
        return merged;
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, colPath);
        return localRows;
      }
    },
    10000
  );
}

export async function saveCallSession(record: CallSessionRecord, user?: UserProfile): Promise<void> {
  const key = scopedKey(CALL_KEY, user);
  const existing = readLocal<CallSessionRecord>(key);
  writeLocal(key, dedupeCalls([record, ...existing]));
  invalidateAsyncCache('call_sessions:');

  const fbUser = auth.currentUser;
  if (!fbUser || fbUser.isAnonymous) return;

  const docPath = `users/${fbUser.uid}/call_sessions/${record.id}`;
  try {
    await setDoc(doc(db, 'users', fbUser.uid, 'call_sessions', record.id), {
      id: record.id.slice(0, 128),
      userId: fbUser.uid,
      userEmail: (fbUser.email || user?.email || 'member@axumite.ai').slice(0, 200),
      roomCode: record.roomCode.slice(0, 32),
      callType: record.callType,
      localLanguage: record.localLanguage.slice(0, 64),
      remoteLanguage: record.remoteLanguage.slice(0, 64),
      durationSeconds: Math.max(0, Math.round(record.durationSeconds)),
      transcriptText: (record.transcriptText || '').slice(0, 4000),
      createdAt: record.createdAt,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, docPath);
  }
}

export async function deleteCallSession(id: string, user?: UserProfile): Promise<void> {
  const key = scopedKey(CALL_KEY, user);
  writeLocal(
    key,
    readLocal<CallSessionRecord>(key).filter((r) => r.id !== id)
  );
  invalidateAsyncCache('call_sessions:');
  const fbUser = auth.currentUser;
  if (!fbUser || fbUser.isAnonymous) return;
  try {
    await deleteDoc(doc(db, 'users', fbUser.uid, 'call_sessions', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `users/${fbUser.uid}/call_sessions/${id}`);
  }
}

// =========================================================================
// 3. OCR DOCUMENTS (SCREEN CAPTURE & CAMERA OCR)
// =========================================================================

export async function loadOcrDocuments(user?: UserProfile): Promise<OcrDocumentRecord[]> {
  const key = scopedKey(OCR_KEY, user);
  const localRows = dedupeOcrDocs(readLocal<OcrDocumentRecord>(key));
  const fbUser = auth.currentUser;
  if (!fbUser || fbUser.isAnonymous) return localRows;

  return coalesceAsyncRequest<OcrDocumentRecord[]>(
    `ocr_documents:${fbUser.uid}`,
    async () => {
      const colPath = `users/${fbUser.uid}/ocr_documents`;
      try {
        const q = query(collection(db, 'users', fbUser.uid, 'ocr_documents'), orderBy('createdAt', 'desc'), limit(35));
        const snap = await getDocs(q);
        const cloudRows = snap.docs.map((d) => d.data() as OcrDocumentRecord);
        const merged = dedupeOcrDocs([...cloudRows, ...localRows]);
        writeLocal(key, merged);
        return merged;
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, colPath);
        return localRows;
      }
    },
    10000
  );
}

export async function saveOcrDocument(record: OcrDocumentRecord, user?: UserProfile): Promise<void> {
  const key = scopedKey(OCR_KEY, user);
  const existing = readLocal<OcrDocumentRecord>(key);
  writeLocal(key, dedupeOcrDocs([record, ...existing]));
  invalidateAsyncCache('ocr_documents:');

  const fbUser = auth.currentUser;
  if (!fbUser || fbUser.isAnonymous) return;

  const docPath = `users/${fbUser.uid}/ocr_documents/${record.id}`;
  try {
    await setDoc(doc(db, 'users', fbUser.uid, 'ocr_documents', record.id), {
      id: record.id.slice(0, 128),
      userId: fbUser.uid,
      userEmail: (fbUser.email || user?.email || 'member@axumite.ai').slice(0, 200),
      title: record.title.slice(0, 160),
      captureSource: record.captureSource,
      detectedLanguage: record.detectedLanguage.slice(0, 64),
      targetLanguage: record.targetLanguage.slice(0, 64),
      originalText: record.originalText.slice(0, 4000),
      translatedText: record.translatedText.slice(0, 4000),
      transliteration: (record.transliteration || '').slice(0, 2000),
      pageCount: Math.max(1, record.pageCount || 1),
      createdAt: record.createdAt,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, docPath);
  }
}

export async function deleteOcrDocument(id: string, user?: UserProfile): Promise<void> {
  const key = scopedKey(OCR_KEY, user);
  writeLocal(
    key,
    readLocal<OcrDocumentRecord>(key).filter((r) => r.id !== id)
  );
  invalidateAsyncCache('ocr_documents:');
  const fbUser = auth.currentUser;
  if (!fbUser || fbUser.isAnonymous) return;
  try {
    await deleteDoc(doc(db, 'users', fbUser.uid, 'ocr_documents', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `users/${fbUser.uid}/ocr_documents/${id}`);
  }
}

// =========================================================================
// 4. PRIVACY CONTROLS: DATA EXPORT & COMPLETE USER DATA DELETION
// =========================================================================

export async function exportAllUserTranslatorData(user?: UserProfile): Promise<string> {
  const [conversations, calls, ocrDocs, offlinePacks] = await Promise.all([
    loadConversationSessions(user),
    loadCallSessions(user),
    loadOcrDocuments(user),
    getDownloadedPacks(),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    account: {
      email: auth.currentUser?.email || user?.email || 'guest',
      name: user?.name || 'Guest',
    },
    conversationSessions: conversations,
    callSessions: calls,
    ocrDocuments: ocrDocs,
    offlinePacks: offlinePacks.map(({ code, name, version, downloadedAt }) => ({
      code,
      name,
      version,
      downloadedAt,
    })),
  };

  return JSON.stringify(payload, null, 2);
}

export async function deleteAllUserTranslatorData(user?: UserProfile): Promise<{ deletedCount: number }> {
  let deletedCount = 0;

  if (typeof window !== 'undefined') {
    for (const k of [scopedKey(CONV_KEY, user), scopedKey(CALL_KEY, user), scopedKey(OCR_KEY, user)]) {
      safeRemoveLocalStorage(k);
    }
    Object.keys(localStorage)
      .filter((k) => k.startsWith('axumite_voice_translation_logs_v1'))
      .forEach((k) => safeRemoveLocalStorage(k));
  }

  await clearAllOfflinePacksIndexedDB();
  invalidateAsyncCache();

  const fbUser = auth.currentUser;
  if (fbUser && !fbUser.isAnonymous) {
    const subcollections = [
      'conversation_sessions',
      'call_sessions',
      'ocr_documents',
      'language_packs',
      'voice_translation_logs',
    ];
    for (const sub of subcollections) {
      try {
        const snap = await getDocs(collection(db, 'users', fbUser.uid, sub));
        if (!snap.empty) {
          const batch = writeBatch(db);
          snap.docs.forEach((d) => {
            batch.delete(d.ref);
            deletedCount += 1;
          });
          await batch.commit();
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${fbUser.uid}/${sub}`);
      }
    }
  }

  return { deletedCount };
}
