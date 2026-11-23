import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  getRedirectResult,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  initializeFirestore,
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  getDocFromServer,
  onSnapshot,
  deleteDoc,
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit
} from 'firebase/firestore';
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  uploadString,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';
import { UserProfile, UserFileRecord, UserStorageStats, FileCategory } from '../types';
import { OperationType, FirestoreErrorInfo } from '../types/firebase';
import { normalizeUserProfilePermissions } from './permissions';
import {
  coalesceAsyncRequest,
  dedupeUserFiles,
  getStableContentHash,
  invalidateAsyncCache,
  safeWriteLocalStorage,
} from '../utils/dataOptimizer';

export type { FirebaseUser };

export * from '../types/firebase';

const lastSyncedProfileHashes = new Map<string, string>();
const inFlightProfileSyncs = new Map<string, Promise<void>>();
const GUEST_PLACEHOLDER_EMAIL = 'guest@axumite.ai';

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
}, firebaseConfig.firestoreDatabaseId || '(default)');
export const storage = getStorage(app, firebaseConfig.storageBucket ? `gs://${firebaseConfig.storageBucket}` : undefined);
export const googleProvider = new GoogleAuthProvider();

export const SUPERADMIN_EMAIL = 'beckylove2004@gmail.com';

// Test connection to Firestore on initialization with resilient timeout handling
async function testFirestoreConnection() {
  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Connection check timeout')), 4000)
    );
    await Promise.race([
      getDocFromServer(doc(db, 'test', 'connection')),
      timeoutPromise
    ]);
  } catch (error) {
    if (error instanceof Error && (error.message.includes('the client is offline') || error.message.includes('timeout') || error.message.includes("Backend didn't respond"))) {
      console.warn("Firestore operating in resilient offline/cache mode: synchronization will occur automatically.");
    }
  }
}
testFirestoreConnection();

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

/**
 * Helper to translate Firebase Auth error codes to user-friendly messages in Tigrinya and English
 */
export function parseFirebaseAuthError(error: any, lang: string = 'en'): string {
  const code = error?.code || '';
  const message = error?.message || '';
  const isTigrinya = lang === 'ti' || lang === 'ti_tg';

  if (code === 'auth/operation-not-allowed' || message.includes('PASSWORD_LOGIN_DISABLED')) {
    return isTigrinya
      ? 'ብኢመይልን ፓስዎርድን ምእታው ኣብዚ ናይ Firebase ፕሮጀክት ገና ኣይተኸፍተን። በጃኹም ብቐጥታ ብ "Continue with Google" እተዉ።'
      : 'Email/Password sign-in is not enabled on this Firebase project yet. Please use "Continue with Google" above to sign in immediately.';
  }
  if (code === 'auth/email-already-in-use') {
    return isTigrinya
      ? 'እዚ ኢመይል ኣድራሻ ኣቐዲሙ ተመዝጊቡ ኣሎ። በጃኹም ብቐጥታ እተዉ (Sign In)።'
      : 'This email is already registered. Please sign in instead.';
  }
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return isTigrinya
      ? 'ዝተጋገየ ኢመይል ወይ ፓስዎርድ። በጃኹም ኣረጋጊጽኩም ደጊምኩም ፈትኑ ወይ ብ Google እተዉ።'
      : 'Incorrect email or password. Please verify and try again, or sign in with Google.';
  }
  if (code === 'auth/weak-password') {
    return isTigrinya
      ? 'ፓስዎርድ ድኹም እዩ። ብውሑዱ 6 ፊደላት ተጠቐሙ።'
      : 'Password is too weak. Please use at least 6 characters.';
  }
  if (code === 'auth/invalid-email') {
    return isTigrinya
      ? 'ዘይቅኑዕ ኢመይል ኣድራሻ።'
      : 'Please enter a valid email address.';
  }
  if (code === 'auth/too-many-requests') {
    return isTigrinya
      ? 'ብዙሕ ዘይዕዉት ፈተነታት ተገይሩ። በጃኹም ሒደት ደቓይቕ ጸኒሕኩም ፈትኑ ወይ ፓስዎርድኩም ቀይሩ።'
      : 'Access temporarily blocked due to many failed attempts. Try again later or reset password.';
  }
  if (code === 'auth/user-disabled') {
    return isTigrinya
      ? 'እዚ ናይ ተጠቃሚ ኣካውንት ተዓጽዩ ኣሎ።'
      : 'This user account has been disabled.';
  }
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return isTigrinya
      ? 'ናይ ጉግል መእተዊ መስኮት ቅድሚ ምዝዛሙ ተዓጽዩ። በጃኹም ደጊምኩም ፈትኑ።'
      : 'Google sign-in popup was closed before completing. Please try again.';
  }
  if (code === 'auth/popup-blocked') {
    return isTigrinya
      ? 'ብራውዘርኩም ናይ ጉግል መእተዊ መስኮት (Popup) ዓጊትዎ ኣሎ። ኣብ ብራውዘር Popup ኣፍቂድኩም ደጊምኩም ጠውቑ።'
      : 'Your browser blocked the Google sign-in popup. Please allow popups for this site and click Continue with Google again.';
  }
  if (code === 'auth/unauthorized-domain') {
    return isTigrinya
      ? 'እዚ ናይ ወብሳይት ኣድራሻ ኣብ Firebase Auth ኣይተፈቕደን።'
      : 'This domain is not authorized for Firebase sign-in. Please open the app from the authorized URL.';
  }
  if (code === 'auth/network-request-failed') {
    return isTigrinya
      ? 'ናይ ኢንተርነት ርክብ ጸገም ኣጋጢሙ። ርክብኩም ኣረጋጊጽኩም ደጊምኩም ፈትኑ።'
      : 'Network error while signing in. Please check your internet connection and try again.';
  }

  return message || (isTigrinya ? 'ናይ መእተዊ ጌጋ ኣጋጢሙ ኣሎ።' : 'Authentication error occurred.');
}

/**
 * Helper to get clean document ID for user
 */
export function getCleanUserId(emailOrUid: string): string {
  return emailOrUid.toLowerCase().replace(/[^a-z0-9]/g, '_');
}

/**
 * Returns true ONLY when Firebase Auth has a live, non-anonymous signed-in user
 * whose authenticated email matches the target profile email (or is the verified superadmin).
 * Prevents unauthenticated or stale-cache Firestore calls that trigger PERMISSION_DENIED.
 */
export function hasActiveFirebaseAuthForEmail(targetEmail?: string): boolean {
  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.isAnonymous) return false;
  const authEmail = (currentUser.email || '').trim().toLowerCase();
  if (!authEmail) return false;
  if (authEmail === SUPERADMIN_EMAIL) return true;
  if (!targetEmail) return true;
  const normalizedTarget = targetEmail.trim().toLowerCase();
  return normalizedTarget === authEmail;
}

/**
 * Strip explicit undefined keys so Firestore setDoc never rejects optional fields
 */
function stripUndefinedFields<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      clean[key] = value;
    }
  }
  return clean;
}

const PROFILE_HASH_IGNORED_KEYS = ['updatedAt', 'lastSyncedAt', 'lastLoginAt'];

/**
 * Clear all in-memory profile caches and dirty-check hashes on logout or account switch
 */
export function clearFirebaseProfileCaches(): void {
  lastSyncedProfileHashes.clear();
  inFlightProfileSyncs.clear();
  invalidateAsyncCache('profile:');
}

/**
 * Canonical resolver that hydrates a Firebase Auth user with authoritative Firestore
 * profile data and account-specific roles/privileges without clobbering cloud permissions.
 */
export async function resolveFirebaseUserProfile(
  fbUser: FirebaseUser,
  options?: {
    forceRefresh?: boolean;
    syncToFirestore?: boolean;
  }
): Promise<UserProfile | null> {
  const normalizedEmail = (fbUser.email || '').trim().toLowerCase();
  if (!normalizedEmail || normalizedEmail === GUEST_PLACEHOLDER_EMAIL) return null;

  const isSuperadmin = normalizedEmail === SUPERADMIN_EMAIL;
  const forceRefresh = options?.forceRefresh ?? true;
  const shouldSync = options?.syncToFirestore ?? true;

  const existingProfile = await fetchUserProfileFromFirestore(normalizedEmail, {
    authUid: fbUser.uid,
    forceRefresh,
  });

  const nowIso = new Date().toISOString();

  if (!existingProfile) {
    const freshProfile = normalizeUserProfilePermissions(
      {
        id: fbUser.uid || getCleanUserId(normalizedEmail),
        authUid: fbUser.uid,
        name: fbUser.displayName || (isSuperadmin ? 'Becky Love (Superadmin)' : 'Axumite Member'),
        email: normalizedEmail,
        phoneNumber: fbUser.phoneNumber || '+291 7 000000',
        isPhoneVerified: Boolean(fbUser.phoneNumber) || isSuperadmin,
        isEmailVerified: fbUser.emailVerified || isSuperadmin,
        avatar: fbUser.photoURL || (isSuperadmin ? '👑' : '🦁'),
        role: isSuperadmin ? 'Creator' : 'Free Member',
        preferredLanguage: 'ti-ER',
        isLoggedIn: true,
        joinedDate: nowIso,
        lastLoginAt: nowIso,
        offlineAccessEnabled: true,
        savedInsightsCount: 0,
      } as UserProfile,
      { isAuthenticated: true }
    ) as UserProfile;

    if (shouldSync) {
      await syncUserProfileToFirestore(freshProfile);
    }
    return freshProfile;
  }

  const mergedProfile = normalizeUserProfilePermissions(
    {
      ...existingProfile,
      id: existingProfile.id || fbUser.uid || getCleanUserId(normalizedEmail),
      authUid: fbUser.uid,
      email: normalizedEmail,
      name: existingProfile.name || fbUser.displayName || (isSuperadmin ? 'Becky Love (Superadmin)' : 'Axumite Member'),
      avatar: existingProfile.avatar || fbUser.photoURL || (isSuperadmin ? '👑' : '🦁'),
      phoneNumber: existingProfile.phoneNumber || fbUser.phoneNumber || '+291 7 000000',
      isPhoneVerified: Boolean(existingProfile.isPhoneVerified) || Boolean(fbUser.phoneNumber) || isSuperadmin,
      isEmailVerified: Boolean(fbUser.emailVerified) || Boolean(existingProfile.isEmailVerified) || isSuperadmin,
      preferredLanguage: existingProfile.preferredLanguage || 'ti-ER',
      joinedDate: existingProfile.joinedDate || nowIso,
      lastLoginAt: nowIso,
      offlineAccessEnabled: existingProfile.offlineAccessEnabled ?? true,
      savedInsightsCount: existingProfile.savedInsightsCount ?? 0,
      isLoggedIn: true,
    } as UserProfile,
    { isAuthenticated: true }
  ) as UserProfile;

  // Persist authUid/verified metadata if newly linked or explicitly syncing on login/redirect
  const needsMetadataSync =
    shouldSync ||
    existingProfile.authUid !== fbUser.uid ||
    existingProfile.isLoggedIn !== true ||
    (fbUser.emailVerified && !existingProfile.isEmailVerified);

  if (needsMetadataSync) {
    await syncUserProfileToFirestore(mergedProfile);
  }

  return mergedProfile;
}

/* =========================================================================
   1. USER AUTHENTICATION (EMAIL/PASSWORD & GOOGLE)
   ========================================================================= */

/**
 * Register a new user with Email and Password
 */
export async function registerWithFirebase(
  email: string, 
  password: string, 
  fullName: string, 
  role: string = 'Free Member'
): Promise<{ user: UserProfile; firebaseUser: FirebaseUser }> {
  const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  const fbUser = userCredential.user;

  if (fullName && fbUser) {
    try {
      await updateProfile(fbUser, { displayName: fullName });
    } catch (e) {
      console.warn('Could not set displayName on Firebase user:', e);
    }
  }

  const normalizedEmail = email.trim().toLowerCase();
  const isSuperadmin = normalizedEmail === SUPERADMIN_EMAIL;
  const nowIso = new Date().toISOString();

  const userProfile = normalizeUserProfilePermissions(
    {
      id: fbUser.uid || getCleanUserId(normalizedEmail),
      authUid: fbUser.uid,
      name: fullName || (isSuperadmin ? 'Becky Love (Superadmin)' : 'Axumite Member'),
      email: normalizedEmail,
      phoneNumber: '+291 7 000000',
      isPhoneVerified: isSuperadmin,
      isEmailVerified: fbUser.emailVerified || isSuperadmin,
      avatar: isSuperadmin ? '👑' : '🦁',
      role: isSuperadmin ? 'Creator' : (role as any),
      preferredLanguage: 'ti-ER',
      isLoggedIn: true,
      joinedDate: nowIso,
      lastLoginAt: nowIso,
      offlineAccessEnabled: true,
      savedInsightsCount: 0,
    } as UserProfile,
    { isAuthenticated: true }
  ) as UserProfile;

  await syncUserProfileToFirestore(userProfile);
  return { user: userProfile, firebaseUser: fbUser };
}

/**
 * Sign in existing user with Email and Password
 */
export async function loginWithFirebase(
  email: string, 
  password: string
): Promise<{ user: UserProfile; firebaseUser: FirebaseUser }> {
  const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
  const fbUser = userCredential.user;

  const profile = await resolveFirebaseUserProfile(fbUser, {
    forceRefresh: true,
    syncToFirestore: true,
  });

  if (!profile) {
    throw new Error('Unable to hydrate authenticated user profile.');
  }

  return { user: profile, firebaseUser: fbUser };
}

/**
 * Sign in with Google Popup (primary OAuth method)
 */
export async function signInWithGoogleFirebase(
  loginHint?: string
): Promise<{ user: UserProfile; firebaseUser: FirebaseUser }> {
  const provider = new GoogleAuthProvider();
  provider.addScope('email');
  provider.addScope('profile');
  provider.setCustomParameters(
    loginHint && loginHint.trim()
      ? { login_hint: loginHint.trim(), prompt: 'select_account' }
      : { prompt: 'select_account' }
  );

  const result = await signInWithPopup(auth, provider);
  const fbUser = result.user;

  const profile = await resolveFirebaseUserProfile(fbUser, {
    forceRefresh: true,
    syncToFirestore: true,
  });

  if (!profile) {
    throw new Error('Google sign-in completed without an email profile.');
  }

  return { user: profile, firebaseUser: fbUser };
}

/**
 * Initiate redirect-based Google sign-in when explicitly requested in top-level browser tabs
 */
export async function signInWithGoogleRedirectFirebase(loginHint?: string): Promise<void> {
  const provider = new GoogleAuthProvider();
  provider.addScope('email');
  provider.addScope('profile');
  provider.setCustomParameters(
    loginHint && loginHint.trim()
      ? { login_hint: loginHint.trim(), prompt: 'select_account' }
      : { prompt: 'select_account' }
  );
  await signInWithRedirect(auth, provider);
}

/**
 * Send password reset email
 */
export async function sendFirebasePasswordReset(email: string): Promise<{ success: boolean; message?: string }> {
  try {
    await sendPasswordResetEmail(auth, email.trim());
    return { success: true };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to send password reset email' };
  }
}

/**
 * Log out user from Firebase and clear cloud session caches
 */
export async function logoutFromFirebase(): Promise<void> {
  clearFirebaseProfileCaches();
  try {
    await firebaseSignOut(auth);
  } catch (err) {
    console.warn('Firebase logout notice:', err);
  }
}

/**
 * Listen to Firebase Auth state changes
 */
export function onFirebaseAuthStateChanged(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Resolve Firebase Auth redirect result and return both the authoritative Firestore profile
 * and FirebaseUser so callers can coordinate state hydration and live listeners cleanly.
 */
export async function handleFirebaseRedirectResultWithMeta(): Promise<{
  profile: UserProfile;
  firebaseUser: FirebaseUser;
} | null> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      getRedirectResult(auth),
      new Promise<null>((resolve) => {
        timeoutId = setTimeout(() => resolve(null), 2500);
      }),
    ]);
    if (result && result.user && result.user.email) {
      const profile = await resolveFirebaseUserProfile(result.user, {
        forceRefresh: true,
        syncToFirestore: true,
      });
      if (profile) {
        return { profile, firebaseUser: result.user };
      }
    }
  } catch (error: any) {
    // Gracefully handle benign/environment redirect errors (e.g. iframe restrictions or user cancellation)
    console.warn('Firebase Redirect Result handler note (handled gracefully):', error);
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
  return null;
}

/**
 * Backward-compatible redirect result resolver returning only the hydrated UserProfile
 */
export async function handleFirebaseRedirectResult(): Promise<UserProfile | null> {
  const resolved = await handleFirebaseRedirectResultWithMeta();
  return resolved ? resolved.profile : null;
}

/* =========================================================================
   2. USER-SPECIFIC DATABASE & PROFILE MANAGEMENT
   ========================================================================= */

/**
 * Sync user profile to Firestore (dirty-checked & coalesced to eliminate redundant writes)
 */
export async function syncUserProfileToFirestore(user: Partial<UserProfile>): Promise<void> {
  const normalizedEmail = (user.email || '').trim().toLowerCase();
  if (!normalizedEmail || normalizedEmail === GUEST_PLACEHOLDER_EMAIL) return;

  // Never attempt a Firestore write without an active matching Firebase Auth session
  if (!hasActiveFirebaseAuthForEmail(normalizedEmail)) return;

  const activeAuthUser = auth.currentUser;
  const activeAuthEmail = (activeAuthUser?.email || '').trim().toLowerCase();
  const resolvedAuthUid =
    user.authUid || (activeAuthUser && activeAuthEmail === normalizedEmail ? activeAuthUser.uid : undefined);

  const userId = getCleanUserId(normalizedEmail);
  const normalizedWithPerms = normalizeUserProfilePermissions(
    {
      ...user,
      id: user.id || resolvedAuthUid || userId,
      authUid: resolvedAuthUid,
      email: normalizedEmail,
    },
    { isAuthenticated: Boolean(user.isLoggedIn ?? true) }
  );

  const normalizedPayload = stripUndefinedFields(normalizedWithPerms as Record<string, unknown>);
  const payloadHash = getStableContentHash(normalizedPayload, PROFILE_HASH_IGNORED_KEYS);

  if (lastSyncedProfileHashes.get(userId) === payloadHash) {
    return;
  }

  const syncKey = `${userId}:${payloadHash}`;
  const activeSync = inFlightProfileSyncs.get(syncKey);
  if (activeSync) {
    return activeSync;
  }

  const writePromise = (async () => {
    try {
      const userDocRef = doc(db, 'users', userId);
      await setDoc(
        userDocRef,
        {
          ...normalizedPayload,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      lastSyncedProfileHashes.set(userId, payloadHash);
      invalidateAsyncCache(`profile:${userId}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${userId}`);
    } finally {
      inFlightProfileSyncs.delete(syncKey);
    }
  })();

  inFlightProfileSyncs.set(syncKey, writePromise);
  return writePromise;
}

/**
 * Fetch user profile from Firestore with optional force-refresh (bypassing short-TTL cache)
 * and Auth UID document fallback so permissions are always authoritative.
 */
export async function fetchUserProfileFromFirestore(
  email: string,
  options?: {
    authUid?: string;
    forceRefresh?: boolean;
  }
): Promise<UserProfile | null> {
  const normalizedEmail = (email || '').trim().toLowerCase();
  if (!normalizedEmail || normalizedEmail === GUEST_PLACEHOLDER_EMAIL) return null;

  // Never attempt a Firestore read without an active matching Firebase Auth session
  if (!hasActiveFirebaseAuthForEmail(normalizedEmail)) return null;

  const userId = getCleanUserId(normalizedEmail);
  const cacheKey = `profile:${userId}`;

  if (options?.forceRefresh) {
    invalidateAsyncCache(cacheKey);
  }

  return coalesceAsyncRequest<UserProfile | null>(
    cacheKey,
    async () => {
      try {
        const userDocRef = doc(db, 'users', userId);
        let snap = await getDoc(userDocRef);

        // Fallback to Firebase Auth UID document if primary email-keyed document does not exist
        if (!snap.exists() && options?.authUid && options.authUid !== userId) {
          const uidDocRef = doc(db, 'users', options.authUid);
          const uidSnap = await getDoc(uidDocRef);
          if (uidSnap.exists()) {
            snap = uidSnap;
          }
        }

        if (snap.exists()) {
          const rawProfile = snap.data() as UserProfile;
          const profile = normalizeUserProfilePermissions(
            {
              ...rawProfile,
              id: rawProfile.id || options?.authUid || userId,
              email: (rawProfile.email || normalizedEmail).trim().toLowerCase(),
            },
            { isAuthenticated: true }
          ) as UserProfile;

          // Seed dirty-check hash so immediate React hydration does not echo a redundant write
          const hash = getStableContentHash(
            stripUndefinedFields(profile as unknown as Record<string, unknown>),
            PROFILE_HASH_IGNORED_KEYS
          );
          lastSyncedProfileHashes.set(userId, hash);
          return profile;
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${userId}`);
      }
      return null;
    },
    options?.forceRefresh ? 0 : 8000
  );
}

/**
 * Subscribe to real-time Firestore profile & permission changes for an authenticated user.
 * Ensures live role and custom privilege updates immediately re-render the application UI.
 */
export function subscribeToUserProfileInFirestore(
  email: string,
  authUid: string | undefined,
  onProfileUpdate: (profile: UserProfile) => void
): () => void {
  const normalizedEmail = (email || '').trim().toLowerCase();
  if (
    !normalizedEmail ||
    normalizedEmail === GUEST_PLACEHOLDER_EMAIL ||
    !auth.currentUser ||
    auth.currentUser.isAnonymous
  ) {
    return () => {};
  }

  const userId = getCleanUserId(normalizedEmail);
  const userDocRef = doc(db, 'users', userId);
  let lastSnapshotHash = '';

  return onSnapshot(
    userDocRef,
    (snap) => {
      if (!snap.exists()) return;

      const rawProfile = snap.data() as UserProfile;
      const normalizedProfile = normalizeUserProfilePermissions(
        {
          ...rawProfile,
          id: rawProfile.id || authUid || userId,
          authUid: authUid || rawProfile.authUid,
          email: (rawProfile.email || normalizedEmail).trim().toLowerCase(),
          isLoggedIn: true,
        },
        { isAuthenticated: true }
      ) as UserProfile;

      const snapshotHash = getStableContentHash(
        stripUndefinedFields(normalizedProfile as unknown as Record<string, unknown>),
        PROFILE_HASH_IGNORED_KEYS
      );

      if (snapshotHash === lastSnapshotHash) return;
      lastSnapshotHash = snapshotHash;

      lastSyncedProfileHashes.set(userId, snapshotHash);
      invalidateAsyncCache(`profile:${userId}`);
      onProfileUpdate(normalizedProfile);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${userId}`);
    }
  );
}

/**
 * Upload a user avatar image to Firebase Storage and update the user profile in Firestore
 */
export async function uploadAvatarToFirebaseStorage(
  fileOrBlob: File | Blob | string,
  userEmail: string,
  userId?: string
): Promise<{ success: boolean; downloadUrl: string; error?: string }> {
  const cleanId = getCleanUserId(userEmail || userId || 'guest');
  const timestamp = Date.now();
  let downloadUrl = '';

  try {
    if (typeof fileOrBlob === 'string') {
      if (fileOrBlob.startsWith('data:')) {
        const storagePath = `avatars/${cleanId}_${timestamp}`;
        const fileRef = storageRef(storage, storagePath);
        await uploadString(fileRef, fileOrBlob, 'data_url');
        downloadUrl = await getDownloadURL(fileRef);
      } else {
        downloadUrl = fileOrBlob;
      }
    } else {
      const ext = (fileOrBlob instanceof File && fileOrBlob.name.includes('.')) 
        ? fileOrBlob.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'jpg'
        : 'jpg';
      const storagePath = `avatars/${cleanId}_${timestamp}.${ext}`;
      const fileRef = storageRef(storage, storagePath);
      const contentType = fileOrBlob.type || 'image/jpeg';
      
      const uploadResult = await uploadBytes(fileRef, fileOrBlob, {
        contentType,
        customMetadata: {
          uploadedBy: userEmail || cleanId,
          type: 'user_avatar',
          updatedAt: new Date().toISOString()
        }
      });
      downloadUrl = await getDownloadURL(uploadResult.ref);
    }
  } catch (storageErr) {
    console.warn('Firebase Storage avatar upload note (applying robust fallback):', storageErr);
  }

  // If Firebase Storage did not return a URL (e.g. offline/storage config), generate safe dataUrl fallback
  if (!downloadUrl && typeof fileOrBlob !== 'string') {
    try {
      downloadUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(fileOrBlob as Blob);
      });
    } catch (readErr) {
      console.warn('Fallback data URL generation error:', readErr);
    }
  } else if (!downloadUrl && typeof fileOrBlob === 'string') {
    downloadUrl = fileOrBlob;
  }

  if (!downloadUrl) {
    return { success: false, downloadUrl: '', error: 'Failed to process image' };
  }

  // 1. Update Firestore user document only when Firebase Auth session is active for this user
  if (hasActiveFirebaseAuthForEmail(userEmail)) {
    try {
      const userDocRef = doc(db, 'users', cleanId);
      await setDoc(userDocRef, {
        avatar: downloadUrl,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      lastSyncedProfileHashes.delete(cleanId);
      invalidateAsyncCache(`profile:${cleanId}`);
    } catch (firestoreErr) {
      handleFirestoreError(firestoreErr, OperationType.UPDATE, `users/${cleanId}`);
    }
  }

  // 2. Also update Firebase Auth profile photoURL if user is signed in
  try {
    if (auth.currentUser && !auth.currentUser.isAnonymous) {
      await updateProfile(auth.currentUser, { photoURL: downloadUrl });
    }
  } catch (authErr) {
    console.warn('Could not update Firebase Auth photoURL:', authErr);
  }

  return { success: true, downloadUrl };
}

/* =========================================================================
   3. USER FILE STORAGE & METADATA DATABASE
   ========================================================================= */

const LOCAL_STORAGE_FILES_KEY = 'axumite_user_file_vault';

/**
 * Get fallback local files (deduplicated)
 */
function getLocalFiles(): UserFileRecord[] {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_FILES_KEY);
    const parsed = data ? JSON.parse(data) : [];
    return Array.isArray(parsed) ? dedupeUserFiles(parsed) : [];
  } catch {
    return [];
  }
}

/**
 * Save fallback local files (deduplicated & quota-safe)
 */
function saveLocalFiles(files: UserFileRecord[]) {
  const cleanFiles = dedupeUserFiles(files);
  safeWriteLocalStorage(LOCAL_STORAGE_FILES_KEY, cleanFiles);
}

/**
 * Upload a File, Blob, or Data URL directly to Firebase Storage bucket and save metadata to Firestore
 */
export async function uploadFileToFirebaseStorage(
  fileOrBlob: File | Blob | string,
  fileName: string,
  userEmail: string,
  meta: {
    category: FileCategory;
    description?: string;
    tags?: string[];
    userId?: string;
    fileSize?: number;
    fileType?: string;
  }
): Promise<UserFileRecord> {
  const fileId = `file_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const userId = getCleanUserId(userEmail || meta.userId || 'guest');
  const now = new Date().toISOString();
  
  let downloadUrl = '';
  const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `users/${userId}/files/${fileId}_${cleanFileName}`;
  
  let detectedType = meta.fileType || 'application/octet-stream';
  let size = meta.fileSize || 0;
  let previewData: string | undefined = undefined;

  try {
    const fileRef = storageRef(storage, storagePath);

    if (typeof fileOrBlob === 'string') {
      // It's a Data URL or base64 string
      if (fileOrBlob.startsWith('data:')) {
        await uploadString(fileRef, fileOrBlob, 'data_url');
        downloadUrl = await getDownloadURL(fileRef);
        previewData = fileOrBlob.length < 300000 ? fileOrBlob : undefined;
      }
    } else {
      // It's a File or Blob
      detectedType = fileOrBlob.type || detectedType;
      size = fileOrBlob.size || size;
      const uploadResult = await uploadBytes(fileRef, fileOrBlob, {
        contentType: detectedType,
        customMetadata: {
          originalName: fileName,
          uploadedBy: userEmail,
          category: meta.category
        }
      });
      downloadUrl = await getDownloadURL(uploadResult.ref);
    }
  } catch (storageErr) {
    console.warn('Firebase Storage upload note (persisting with local/firestore fallback):', storageErr);
  }

  // Build full record
  const fullRecord: UserFileRecord = {
    id: fileId,
    userId,
    userEmail: userEmail.toLowerCase(),
    fileName,
    fileSize: size,
    fileType: detectedType,
    category: meta.category,
    downloadUrl: downloadUrl || undefined,
    storagePath,
    fileData: previewData || (downloadUrl ? downloadUrl : (typeof fileOrBlob === 'string' ? fileOrBlob : undefined)),
    description: meta.description || `Uploaded on ${new Date().toLocaleDateString()}`,
    uploadDate: now,
    updatedAt: now,
    tags: meta.tags || [meta.category],
    isEncrypted: true,
  };

  // 1. Update local cache immediately
  const localList = getLocalFiles();
  const filtered = localList.filter(f => f.id !== fileId);
  filtered.unshift(fullRecord);
  saveLocalFiles(filtered);

  // 2. Persist to Firestore only when an active Firebase Auth session owns this account
  if (hasActiveFirebaseAuthForEmail(userEmail)) {
    try {
      const userFileRef = doc(db, 'users', userId, 'files', fileId);
      await setDoc(userFileRef, fullRecord);

      const directFileRef = doc(db, 'userFiles', fileId);
      await setDoc(directFileRef, fullRecord);
    } catch (firestoreErr) {
      console.warn('Firestore file metadata upload notice:', firestoreErr);
    }
  }

  invalidateAsyncCache(`user_files:${userId}`);
  return fullRecord;
}

/**
 * Upload and save a user file to Firestore and local vault (backward compatible & connects to storage)
 */
export async function uploadUserFileToFirestore(fileRecord: Omit<UserFileRecord, 'id' | 'uploadDate'> & { id?: string }): Promise<UserFileRecord> {
  const fileId = fileRecord.id || `file_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const now = new Date().toISOString();
  const userId = getCleanUserId(fileRecord.userEmail || fileRecord.userId);
  const cleanFileName = fileRecord.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = fileRecord.storagePath || `users/${userId}/files/${fileId}_${cleanFileName}`;

  let downloadUrl = fileRecord.downloadUrl || '';

  // If fileData is a data_url, upload to Firebase Storage
  if (!downloadUrl && fileRecord.fileData && fileRecord.fileData.startsWith('data:')) {
    try {
      const fileRef = storageRef(storage, storagePath);
      await uploadString(fileRef, fileRecord.fileData, 'data_url');
      downloadUrl = await getDownloadURL(fileRef);
    } catch (storageErr) {
      console.warn('Firebase Storage upload string note:', storageErr);
    }
  }

  const fullRecord: UserFileRecord = {
    ...fileRecord,
    id: fileId,
    userId,
    userEmail: fileRecord.userEmail.toLowerCase(),
    downloadUrl: downloadUrl || undefined,
    storagePath,
    uploadDate: now,
    updatedAt: now,
    tags: fileRecord.tags || [fileRecord.category],
  };

  // 1. Always update local storage cache immediately for instant UI response
  const localList = getLocalFiles();
  const filtered = localList.filter(f => f.id !== fileId);
  filtered.unshift(fullRecord);
  saveLocalFiles(filtered);

  // 2. Persist to Firestore user subcollection & direct collection when authenticated
  if (hasActiveFirebaseAuthForEmail(fileRecord.userEmail)) {
    try {
      const userFileRef = doc(db, 'users', userId, 'files', fileId);
      await setDoc(userFileRef, fullRecord);

      const directFileRef = doc(db, 'userFiles', fileId);
      await setDoc(directFileRef, fullRecord);
    } catch (error) {
      console.warn('Firestore file upload notice (cached locally):', error);
    }
  }

  invalidateAsyncCache(`user_files:${userId}`);
  return fullRecord;
}

/**
 * Fetch all files belonging to the specific user (coalesced & deduplicated)
 */
export async function fetchUserFilesFromFirestore(userEmail: string, userId?: string): Promise<UserFileRecord[]> {
  const cleanId = getCleanUserId(userEmail || userId || '');
  const localList = getLocalFiles().filter(f => 
    f.userEmail?.toLowerCase() === userEmail?.toLowerCase() || f.userId === cleanId
  );

  if (!cleanId || !hasActiveFirebaseAuthForEmail(userEmail)) return localList;

  return coalesceAsyncRequest<UserFileRecord[]>(
    `user_files:${cleanId}`,
    async () => {
      try {
        const userFilesCol = collection(db, 'users', cleanId, 'files');
        const snap = await getDocs(userFilesCol);
        
        if (!snap.empty) {
          const cloudFiles: UserFileRecord[] = [];
          snap.forEach((docSnap) => {
            cloudFiles.push(docSnap.data() as UserFileRecord);
          });

          const mergedList = dedupeUserFiles([...cloudFiles, ...localList]).sort(
            (a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
          );
          saveLocalFiles(mergedList);
          return mergedList;
        }
      } catch (error) {
        console.warn('Firestore fetch user files notice (using local files):', error);
      }

      return localList;
    },
    10000
  );
}

/**
 * Delete a user's file from Firestore, Firebase Storage, and local storage
 */
export async function deleteUserFileFromFirestore(userEmail: string, fileId: string, storagePath?: string): Promise<boolean> {
  const cleanId = getCleanUserId(userEmail);

  // 1. Update local storage immediately
  const localList = getLocalFiles();
  const fileToDelete = localList.find(f => f.id === fileId);
  const updated = localList.filter(f => f.id !== fileId);
  saveLocalFiles(updated);

  const pathToUse = storagePath || fileToDelete?.storagePath;

  // 2. Delete from Firebase Storage
  if (pathToUse) {
    try {
      const fileRef = storageRef(storage, pathToUse);
      await deleteObject(fileRef);
    } catch (storageErr) {
      console.warn('Firebase Storage delete notice:', storageErr);
    }
  }

  // 3. Delete from Firestore only when authenticated
  invalidateAsyncCache(`user_files:${cleanId}`);
  if (!hasActiveFirebaseAuthForEmail(userEmail)) {
    return true;
  }
  try {
    if (cleanId) {
      const userFileRef = doc(db, 'users', cleanId, 'files', fileId);
      await deleteDoc(userFileRef);
    }
    const directFileRef = doc(db, 'userFiles', fileId);
    await deleteDoc(directFileRef);
    return true;
  } catch (error) {
    console.warn('Firestore delete file notice:', error);
    return true;
  }
}

/**
 * Calculate user storage statistics and quota
 */
export async function getUserStorageStats(userEmail: string, role?: string): Promise<UserStorageStats> {
  const files = await fetchUserFilesFromFirestore(userEmail);
  
  // Storage Quota by role
  let quotaBytes = 50 * 1024 * 1024; // 50MB for Free Member
  if (role === 'Creator' || userEmail.toLowerCase() === SUPERADMIN_EMAIL) {
    quotaBytes = 5 * 1024 * 1024 * 1024; // 5GB for Superadmin Creator
  } else if (role === 'Axumite Sovereign Scholar' || role === 'Admin') {
    quotaBytes = 2 * 1024 * 1024 * 1024; // 2GB for Scholar / Admin
  } else if (role === 'ኣክሱማይት AI Pro') {
    quotaBytes = 500 * 1024 * 1024; // 500MB for AI Pro
  }

  let usedBytes = 0;
  const categoryBreakdown = {
    document: 0,
    image: 0,
    audio: 0,
    geez_script: 0,
    video: 0,
    other: 0,
  };

  files.forEach(f => {
    usedBytes += f.fileSize || 0;
    const cat = f.category as FileCategory;
    if (categoryBreakdown[cat] !== undefined) {
      categoryBreakdown[cat] += f.fileSize || 0;
    } else {
      categoryBreakdown.other += f.fileSize || 0;
    }
  });

  return {
    usedBytes,
    quotaBytes,
    fileCount: files.length,
    categoryBreakdown,
  };
}

/* =========================================================================
   4. CHAT HISTORY DATABASE
   ========================================================================= */

/**
 * Save chat message to Firestore
 */
export async function saveChatMessageToFirestore(
  email: string, 
  conversationId: string, 
  message: { sender: 'user' | 'assistant'; text: string; timestamp: string; tigrinyaAudio?: string }
): Promise<void> {
  const normalizedEmail = (email || '').trim().toLowerCase();
  if (!normalizedEmail || normalizedEmail === GUEST_PLACEHOLDER_EMAIL) return;
  if (!hasActiveFirebaseAuthForEmail(normalizedEmail)) return;
  try {
    const userId = getCleanUserId(normalizedEmail);
    const convRef = doc(db, 'users', userId, 'conversations', conversationId);
    
    const existing = await getDoc(convRef);
    const existingMessages: Array<{ sender: string; text: string; timestamp: string }> = existing.exists()
      ? (existing.data().messages || [])
      : [];

    // Skip duplicate consecutive message writes
    const lastMsg = existingMessages[existingMessages.length - 1];
    if (
      lastMsg &&
      lastMsg.sender === message.sender &&
      lastMsg.text === message.text &&
      lastMsg.timestamp === message.timestamp
    ) {
      return;
    }

    const boundedMessages = [...existingMessages, message].slice(-200);
    
    await setDoc(convRef, {
      userId,
      userEmail: normalizedEmail,
      messages: boundedMessages,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    console.warn('Firestore save chat notice:', error);
  }
}

/**
 * Returns the active Firebase Auth ID token for verified server-side requests
 * (PayPal checkout, subscription status, admin analytics, and Pro endpoints).
 */
export async function getFirebaseIdToken(forceRefresh = false): Promise<string | null> {
  try {
    const current = auth.currentUser;
    if (!current) return null;
    return await current.getIdToken(forceRefresh);
  } catch (error) {
    console.warn('Failed to retrieve Firebase ID token:', error);
    return null;
  }
}


