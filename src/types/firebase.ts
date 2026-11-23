/**
 * Comprehensive Firebase Interfaces & Type Definitions for Axumite AI
 * 
 * Defines all strongly-typed schemas for:
 * - Firestore Database Collections & Subcollections
 * - Firebase Authentication (Users, Sessions, Auth State)
 * - Firebase Storage (Blobs, File Uploads, Quota Management)
 * - Security Rules & ABAC Context
 * - Firestore Error Handling & Diagnostic Telemetry
 */

import { UserRole, SupportedCurrency, FileCategory } from '../types';

/* =========================================================================
   1. FIRESTORE ERROR HANDLING & TELEMETRY INTERFACES
   ========================================================================= */

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
  TRANSACTION = 'transaction',
  BATCH = 'batch',
}

export interface FirebaseAuthProviderInfo {
  providerId?: string | null;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  phoneNumber?: string | null;
  uid?: string | null;
}

export interface FirebaseAuthInfo {
  userId?: string | null;
  email?: string | null;
  emailVerified?: boolean | null;
  isAnonymous?: boolean | null;
  tenantId?: string | null;
  providerInfo?: FirebaseAuthProviderInfo[];
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: FirebaseAuthInfo;
  timestamp?: string;
  metadata?: Record<string, any>;
}

/* =========================================================================
   2. FIRESTORE DOCUMENT SCHEMAS (ENTITIES)
   ========================================================================= */

/**
 * User Profile Document stored in `/users/{userId}`
 */
export interface FirebaseUserProfileDocument {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phoneNumber?: string;
  countryCode?: string;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  avatar?: string;
  preferredLanguage?: 'ti-ER' | 'ti-ET' | 'gez' | 'en';
  tokensRemaining?: number;
  storageUsedBytes?: number;
  storageQuotaBytes?: number;
  isLoggedIn?: boolean;
  joinedDate?: string;
  offlineAccessEnabled?: boolean;
  savedInsightsCount?: number;
  notificationsEnabled?: boolean;
  autoBackupEnabled?: boolean;
  soundEffectsEnabled?: boolean;
  ambientSoundEnabled?: boolean;
  ambientSoundVolume?: number;
  ambientInstrument?: 'masinko' | 'kirar' | 'washint' | 'ensemble';
  themePreference?: 'high-contrast-gold' | 'soft-ambient-gold' | 'balanced-gold';
  customPrivilegesEnabled?: boolean;
  privileges?: Record<string, boolean>;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * User File Document stored in `/users/{userId}/files/{fileId}` or `/userFiles/{fileId}`
 */
export interface FirebaseUserFileDocument {
  id: string;
  userId: string;
  userEmail: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  category: FileCategory;
  downloadUrl?: string;
  storagePath?: string;
  fileData?: string; // Preview data URL / base64 thumbnail
  description?: string;
  uploadDate: string;
  updatedAt?: string;
  tags?: string[];
  isEncrypted?: boolean;
  mimeType?: string;
  md5Hash?: string;
  etag?: string;
  metadata?: Record<string, string>;
}

/**
 * Chat Message inside Conversation
 */
export interface FirebaseChatMessage {
  id?: string;
  sender: 'user' | 'assistant' | 'model';
  role?: 'user' | 'model' | 'system';
  text: string;
  content?: string;
  timestamp: string;
  mode?: 'general' | 'deep-reasoning' | 'ancient-script' | 'creative';
  tigrinyaAudio?: string;
  audioBase64?: string;
  isOfflineFallback?: boolean;
}

/**
 * Chat Conversation Document stored in `/users/{userId}/conversations/{conversationId}`
 */
export interface FirebaseChatConversationDocument {
  id: string;
  userId: string;
  userEmail: string;
  title: string;
  mode?: string;
  messages: FirebaseChatMessage[];
  messagesCount?: number;
  lastMessageSnippet?: string;
  isPinned?: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Payment & Refill Document stored in `/payments/{paymentId}`
 */
export interface FirebasePaymentRecordDocument {
  id: string;
  userId: string;
  user_id?: string;
  userEmail?: string;
  user_email?: string;
  customerEmail?: string;
  customerName?: string;
  planId: string;
  amount: number | string;
  currency: SupportedCurrency | string;
  bankName?: string;
  referenceNumber: string;
  provider_payment_id?: string;
  invoiceNumber?: string;
  paymentMethod?: string;
  payment_method_label?: string;
  card_last4?: string;
  status: 'succeeded' | 'Completed' | 'Pending' | 'Failed' | 'Refunded';
  tokensCredited?: number;
  receiptUrl?: string;
  failureReason?: string;
  createdAt: string;
  payment_date?: string;
  updatedAt?: string;
}

/**
 * Subscription Record Document stored in `/subscriptions/{subscriptionId}`
 */
export interface FirebaseSubscriptionRecordDocument {
  id: string;
  user_id: string;
  userId?: string;
  user_email: string;
  userEmail?: string;
  provider_customer_id: string;
  provider_subscription_id: string;
  plan: 'free' | 'pro_monthly' | 'pro_yearly' | 'enterprise_monthly' | 'enterprise_yearly' | 'lifetime_pass' | string;
  plan_name?: string;
  status: 'active' | 'trialing' | 'canceled' | 'past_due' | 'unpaid' | 'incomplete' | 'expired';
  billing_cycle?: 'monthly' | 'yearly' | 'one_time' | 'free';
  amount?: number;
  currency?: SupportedCurrency;
  start_date: string;
  end_date: string;
  renewal_date: string;
  cancel_at_period_end?: boolean;
  trial_end_date?: string | null;
  entitlement_signature?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Saved Item / Knowledge Note Document stored in `/users/{userId}/saved/{itemId}`
 */
export interface FirebaseSavedItemDocument {
  id: string;
  userId: string;
  title: string;
  type: 'chat' | 'vision' | 'prompt' | 'translation' | 'payment' | 'assistance' | 'calligraphy';
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt?: string;
  metadata?: Record<string, any>;
}

/**
 * App System Configuration Document stored in `/system/config`
 */
export interface FirebaseSystemConfigDocument {
  appName: string;
  appSubtitle: string;
  defaultLanguage: 'ti-ER' | 'ti-ET' | 'gez' | 'en';
  maintenanceMode: boolean;
  maintenanceNotice: string;
  publicSignUp: boolean;
  enableGuestMode: boolean;
  enableVoiceSynthesis: boolean;
  enableImageRecognition: boolean;
  enablePromptForge: boolean;
  enableProClickEarning: boolean;
  defaultModel: string;
  aiTemperature: number;
  maxOutputTokens: number;
  tokenLimits: {
    free: number;
    pro: number;
    scholar: number;
    admin: number;
  };
  security: {
    enforce2FA: boolean;
    sessionTimeoutMinutes: number;
    maxFailedAttempts: number;
    allowExportCSV: boolean;
    ipGeofenceEnabled: boolean;
  };
  updatedAt?: string;
  updatedBy?: string;
}

/**
 * Support Ticket Document stored in `/support_tickets/{ticketId}`
 */
export interface FirebaseSupportTicketDocument {
  id: string;
  ticketNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  subject: string;
  category: 'Billing & Payments' | 'AI Model Query' | 'Ge\'ez Script Support' | 'Account Access' | 'Feature Request';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  messages: Array<{
    id: string;
    sender: 'customer' | 'agent';
    senderName: string;
    message: string;
    timestamp: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Push & In-App Notification Document stored in `/users/{userId}/notifications/{notificationId}`
 */
export interface FirebaseNotificationDocument {
  id: string;
  userId: string;
  titleTi: string;
  titleEn: string;
  bodyTi: string;
  bodyEn: string;
  category: 'scholarship' | 'system_update' | 'security' | 'feature' | 'payment_failed' | 'payment' | 'churn_alert';
  urgency: 'urgent' | 'important' | 'info';
  read: boolean;
  timestamp: string;
  actionType?: 'navigate_tab' | 'external_url' | 'open_scholarship' | 'open_system_status' | 'open_payment' | 'open_admin_metrics';
  targetTab?: string;
  actionUrl?: string;
}

/* =========================================================================
   3. FIREBASE AUTHENTICATION INTERFACES
   ========================================================================= */

export interface FirebaseUserAccountState {
  user: FirebaseUserProfileDocument | null;
  firebaseAuthUser: any | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;
  isSuperAdmin: boolean;
  activeRole: UserRole;
}

export interface FirebaseAuthCredentials {
  email: string;
  password?: string;
  displayName?: string;
  phoneNumber?: string;
  rememberMe?: boolean;
}

export interface FirebaseAuthResult {
  user: FirebaseUserProfileDocument;
  firebaseUser: any;
  isNewUser?: boolean;
}

export interface FirebasePasswordResetResult {
  success: boolean;
  message?: string;
}

/* =========================================================================
   4. FIREBASE STORAGE INTERFACES
   ========================================================================= */

export interface FirebaseStorageMetadata {
  originalName: string;
  uploadedBy: string;
  category: FileCategory;
  contentType?: string;
  size?: number;
  updatedAt?: string;
  customMetadata?: Record<string, string>;
}

export interface FirebaseFileUploadOptions {
  category: FileCategory;
  description?: string;
  tags?: string[];
  userId?: string;
  fileSize?: number;
  fileType?: string;
  generateThumbnail?: boolean;
  encryptFile?: boolean;
}

export interface FirebaseFileUploadResult {
  success: boolean;
  record?: FirebaseUserFileDocument;
  downloadUrl?: string;
  storagePath?: string;
  error?: string;
}

export interface FirebaseUserStorageStats {
  usedBytes: number;
  quotaBytes: number;
  fileCount: number;
  categoryBreakdown: {
    document: number;
    image: number;
    audio: number;
    geez_script: number;
    video: number;
    other: number;
  };
}

/* =========================================================================
   5. FIRESTORE QUERY & COLLECTION PATHS
   ========================================================================= */

export type FirestoreCollectionPath = 
  | 'users'
  | 'userFiles'
  | 'payments'
  | 'subscriptions'
  | 'support_tickets'
  | 'system'
  | 'notifications'
  | 'audit_logs';

export interface FirestoreQueryFilter {
  field: string;
  operator: '<' | '<=' | '==' | '!=' | '>=' | '>' | 'array-contains' | 'in' | 'array-contains-any' | 'not-in';
  value: any;
}

export interface FirestoreQueryOptions {
  filters?: FirestoreQueryFilter[];
  orderByField?: string;
  orderDirection?: 'asc' | 'desc';
  limitCount?: number;
  startAfterDoc?: any;
}

export interface FirebaseDatabaseSchemaMap {
  'users': FirebaseUserProfileDocument;
  'userFiles': FirebaseUserFileDocument;
  'payments': FirebasePaymentRecordDocument;
  'subscriptions': FirebaseSubscriptionRecordDocument;
  'support_tickets': FirebaseSupportTicketDocument;
  'system': FirebaseSystemConfigDocument;
}
