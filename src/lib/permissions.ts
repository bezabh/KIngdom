import { UserPrivileges, UserRole, UserProfile, ManagedUser, AppSystemConfig } from '../types';

export const ROLE_DEFAULT_PRIVILEGES: Record<UserRole, UserPrivileges> = {
  Creator: {
    canUseChat: true,
    canUseVision: true,
    canUsePromptForge: true,
    canUseGeezTranslator: true,
    canUseAssistance: true,
    canUseProClick: true,
    canManageUsers: true,
    canManagePayments: true,
    canManageCRM: true,
    canConfigureApp: true,
    canExportData: true,
    canBypassMaintenance: true,
    canManagePrivileges: true,
  },
  Admin: {
    canUseChat: true,
    canUseVision: true,
    canUsePromptForge: true,
    canUseGeezTranslator: true,
    canUseAssistance: true,
    canUseProClick: true,
    canManageUsers: true,
    canManagePayments: true,
    canManageCRM: true,
    canConfigureApp: true,
    canExportData: true,
    canBypassMaintenance: true,
    canManagePrivileges: true,
  },
  'Axumite Sovereign Scholar': {
    canUseChat: true,
    canUseVision: true,
    canUsePromptForge: true,
    canUseGeezTranslator: true,
    canUseAssistance: true,
    canUseProClick: true,
    canManageUsers: false,
    canManagePayments: false,
    canManageCRM: false,
    canConfigureApp: false,
    canExportData: true,
    canBypassMaintenance: false,
    canManagePrivileges: false,
  },
  'ኣክሱማይት AI Pro': {
    canUseChat: true,
    canUseVision: true,
    canUsePromptForge: true,
    canUseGeezTranslator: true,
    canUseAssistance: true,
    canUseProClick: true,
    canManageUsers: false,
    canManagePayments: false,
    canManageCRM: false,
    canConfigureApp: false,
    canExportData: true,
    canBypassMaintenance: false,
    canManagePrivileges: false,
  },
  'Free Member': {
    canUseChat: true,
    canUseVision: false,
    canUsePromptForge: false,
    canUseGeezTranslator: true,
    canUseAssistance: true,
    canUseProClick: true,
    canManageUsers: false,
    canManagePayments: false,
    canManageCRM: false,
    canConfigureApp: false,
    canExportData: false,
    canBypassMaintenance: false,
    canManagePrivileges: false,
  },
  Guest: {
    canUseChat: true,
    canUseVision: false,
    canUsePromptForge: false,
    canUseGeezTranslator: true,
    canUseAssistance: false,
    canUseProClick: false,
    canManageUsers: false,
    canManagePayments: false,
    canManageCRM: false,
    canConfigureApp: false,
    canExportData: false,
    canBypassMaintenance: false,
    canManagePrivileges: false,
  },
  Suspended: {
    canUseChat: false,
    canUseVision: false,
    canUsePromptForge: false,
    canUseGeezTranslator: false,
    canUseAssistance: false,
    canUseProClick: false,
    canManageUsers: false,
    canManagePayments: false,
    canManageCRM: false,
    canConfigureApp: false,
    canExportData: false,
    canBypassMaintenance: false,
    canManagePrivileges: false,
  },
};

export const PRIVILEGE_METADATA: Record<
  keyof UserPrivileges,
  { label: string; labelTi: string; description: string; category: 'ai' | 'management' | 'system' }
> = {
  canUseChat: {
    label: 'Obelisk AI Chat & Voice',
    labelTi: 'ናይ ጽሑፍን ድምጽን ዕላል',
    description: 'Enables access to multi-modal conversational AI and deep reasoning.',
    category: 'ai',
  },
  canUseVision: {
    label: 'Vision Studio & OCR',
    labelTi: 'ምርመራ ስእልን ቪዥንን',
    description: 'Enables image recognition, artifact inspection, and OCR extraction.',
    category: 'ai',
  },
  canUsePromptForge: {
    label: 'Prompt Forge AI Studio',
    labelTi: 'ፈጠራን ምሕዳስን ፕሮምፕት',
    description: 'Enables advanced prompt engineering, enhancement, and style presets.',
    category: 'ai',
  },
  canUseGeezTranslator: {
    label: "Ge'ez & Tigrinya Dictionary",
    labelTi: 'ትርጉም ግእዝን ትግርኛን',
    description: 'Enables ancient script translation, etymology, and phrasebook lookup.',
    category: 'ai',
  },
  canUseAssistance: {
    label: 'Axumite AI Assistant Voice',
    labelTi: 'ኣክሱማይት ድምጻዊ ረዳኢ',
    description: 'Enables hands-free voice synthesis, news briefing, and smart voice commands.',
    category: 'ai',
  },
  canUseProClick: {
    label: 'Pro Click Token Earning',
    labelTi: 'ናይ ቶከን መኽሰብ ፕሮ ክሊክ',
    description: 'Enables token rewards, referral link creation, and daily claim rewards.',
    category: 'ai',
  },
  canManageUsers: {
    label: 'User Directory & Account Controls',
    labelTi: 'ምሕደራ ተጠቀምቲ ኣካውንት',
    description: 'Allows viewing, adding, editing, suspending, and resetting user accounts.',
    category: 'management',
  },
  canManagePayments: {
    label: 'Payment Gateway & Invoicing',
    labelTi: 'ምሕደራ ክፍሊትን ደረሰኝን',
    description: 'Allows reviewing transactions, verifying gateway transfers, and issuing receipts.',
    category: 'management',
  },
  canManageCRM: {
    label: 'Customer CRM & Support Desk',
    labelTi: 'ምሕደራ ዓማዊልን ትኬታትን',
    description: 'Allows managing customer leads, VIP scholars, and handling support tickets.',
    category: 'management',
  },
  canConfigureApp: {
    label: 'Full App & System Configuration',
    labelTi: 'ምሉእ ምቁጽጻርን ቅጥዕታትን መድረኽ',
    description: 'Complete authority to configure AI models, parameters, UI themes, and system settings.',
    category: 'system',
  },
  canManagePrivileges: {
    label: 'Role-Based Privilege Management',
    labelTi: 'ምሕደራ መሰላትን ሚናታትን (RBAC)',
    description: 'Allows assigning, overriding, and customizing granular user permissions.',
    category: 'system',
  },
  canExportData: {
    label: 'Data & CSV Directory Export',
    labelTi: 'ሰነዳት ናይ ምውራድ መሰል',
    description: 'Allows exporting user lists, financial transactions, and audit logs.',
    category: 'system',
  },
  canBypassMaintenance: {
    label: 'Maintenance Mode Bypass',
    labelTi: 'ናይ ጽገና ሰዓት ናጻ መእተዊ',
    description: 'Allows uninterrupted access even when maintenance mode is active.',
    category: 'system',
  },
};

export const DEFAULT_APP_CONFIG: AppSystemConfig = {
  appName: 'AXUMITE AI',
  appSubtitle: 'ልዑላዊ ናይ ምስትውዓል መድረኽ (Sovereign Intelligence Workspace)',
  defaultLanguage: 'ti-ER',
  maintenanceMode: false,
  maintenanceNotice: 'ሲስተም ኣብ ምሕዳስን ጽገናን ይርከብ። በይዛኹም ድሕሪ ሒደት ደቓይቕ ተመሊስኩም ፈትኑ። (System under scheduled maintenance.)',
  publicSignUp: true,
  enableGuestMode: true,
  enableVoiceSynthesis: true,
  enableImageRecognition: true,
  enablePromptForge: true,
  enableProClickEarning: true,
  defaultModel: 'gemini-3.7-flash',
  aiTemperature: 0.7,
  maxOutputTokens: 2048,
  systemPromptBase: 'You are Axumite AI, a culturally conscious and intellectually sovereign Eritrean & Ethiopian AI assistant fluent in Tigrinya, Ge\'ez, and English. You serve with deep respect for African history and precision.',
  tokenLimits: {
    free: 10000,
    pro: 50000,
    scholar: 150000,
    admin: 1000000,
  },
  security: {
    enforce2FA: false,
    sessionTimeoutMinutes: 1440,
    maxFailedAttempts: 5,
    allowExportCSV: true,
    ipGeofenceEnabled: false,
  },
  ui: {
    primaryTheme: 'gold',
    showWelcomeOverlayOnStartup: true,
    rollingBackgroundDefault: true,
    enableCursorGuide: true,
  },
  churnThreshold: 3.0,
  enableChurnAlert: true,
};

export const AUTH_PROFILE_SYNCED_EVENT = 'axumite:auth_profile_synced';

export const SUPERADMIN_EMAIL_NORMALIZED = 'beckylove2004@gmail.com';
export const GUEST_PLACEHOLDER_EMAIL_NORMALIZED = 'guest@axumite.ai';

export const VALID_USER_ROLES: ReadonlySet<UserRole> = new Set<UserRole>([
  'Creator',
  'Admin',
  'Axumite Sovereign Scholar',
  'ኣክሱማይት AI Pro',
  'Free Member',
  'Guest',
  'Suspended',
]);

export function isValidUserRole(role: unknown): role is UserRole {
  return typeof role === 'string' && VALID_USER_ROLES.has(role as UserRole);
}

/**
 * Resolve canonical role and effective account-specific privileges without
 * clobbering authoritative Firestore roles or custom privilege overrides.
 */
export function normalizeUserProfilePermissions<T extends Partial<UserProfile>>(
  profile: T,
  options?: {
    isAuthenticated?: boolean;
    fallbackRole?: UserRole;
  }
): T & {
  role: UserRole;
  privileges: UserPrivileges;
  customPrivilegesEnabled: boolean;
} {
  const normalizedEmail = (profile.email || '').trim().toLowerCase();
  const isSuperadmin = normalizedEmail === SUPERADMIN_EMAIL_NORMALIZED;
  const isGuestPlaceholder = !normalizedEmail || normalizedEmail === GUEST_PLACEHOLDER_EMAIL_NORMALIZED;
  const isAuthenticated = options?.isAuthenticated ?? Boolean(profile.isLoggedIn);

  if (isSuperadmin) {
    return {
      ...profile,
      email: normalizedEmail,
      role: 'Creator',
      isEmailVerified: true,
      isPhoneVerified: true,
      customPrivilegesEnabled: false,
      privileges: { ...ROLE_DEFAULT_PRIVILEGES.Creator },
    };
  }

  if (isGuestPlaceholder || !isAuthenticated) {
    return {
      ...profile,
      authUid: isGuestPlaceholder ? undefined : profile.authUid,
      email: normalizedEmail || GUEST_PLACEHOLDER_EMAIL_NORMALIZED,
      role: 'Guest',
      customPrivilegesEnabled: false,
      privileges: { ...ROLE_DEFAULT_PRIVILEGES.Guest },
    };
  }

  let resolvedRole: UserRole;
  if (isValidUserRole(profile.role) && profile.role !== 'Guest') {
    resolvedRole = profile.role;
  } else if (isValidUserRole(options?.fallbackRole) && options.fallbackRole !== 'Guest') {
    resolvedRole = options.fallbackRole;
  } else {
    resolvedRole = 'Free Member';
  }

  const customPrivilegesEnabled = Boolean(profile.customPrivilegesEnabled);
  const effectivePrivileges = getUserEffectivePrivileges({
    ...profile,
    email: normalizedEmail,
    role: resolvedRole,
    customPrivilegesEnabled,
  } as UserProfile);

  return {
    ...profile,
    email: normalizedEmail,
    role: resolvedRole,
    customPrivilegesEnabled,
    privileges: effectivePrivileges,
  };
}

export function getUserEffectivePrivileges(user: UserProfile | ManagedUser | null | undefined): UserPrivileges {
  if (!user) return ROLE_DEFAULT_PRIVILEGES.Guest;
  
  const normalizedEmail = (user.email || '').trim().toLowerCase();

  // Becky Love (Superadmin / Creator) holds 100% full root privileges
  if (user.role === 'Creator' || normalizedEmail === SUPERADMIN_EMAIL_NORMALIZED) {
    return { ...ROLE_DEFAULT_PRIVILEGES.Creator };
  }

  if (user.role === 'Admin') {
    return { ...ROLE_DEFAULT_PRIVILEGES.Admin };
  }

  const basePrivileges = ROLE_DEFAULT_PRIVILEGES[user.role] || ROLE_DEFAULT_PRIVILEGES.Guest;

  if (user.customPrivilegesEnabled && user.privileges) {
    return {
      ...basePrivileges,
      ...user.privileges,
    };
  }

  return { ...basePrivileges };
}

export function hasPrivilege(
  user: UserProfile | ManagedUser | null | undefined,
  privilegeKey: keyof UserPrivileges
): boolean {
  if (!user) return false;
  const normalizedEmail = (user.email || '').trim().toLowerCase();
  if (user.role === 'Creator' || normalizedEmail === SUPERADMIN_EMAIL_NORMALIZED) return true;
  if (user.role === 'Admin') return true;
  const effective = getUserEffectivePrivileges(user);
  return !!effective[privilegeKey];
}

export function isAdminOrCreator(user: UserProfile | ManagedUser | null | undefined): boolean {
  if (!user) return false;
  const normalizedEmail = (user.email || '').trim().toLowerCase();
  return user.role === 'Admin' || user.role === 'Creator' || normalizedEmail === SUPERADMIN_EMAIL_NORMALIZED;
}

export function getStoredAppConfig(): AppSystemConfig {
  try {
    const stored = localStorage.getItem('axumite_system_config');
    if (stored) {
      return { ...DEFAULT_APP_CONFIG, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('Failed to load system config:', e);
  }
  return DEFAULT_APP_CONFIG;
}

export function saveStoredAppConfig(config: AppSystemConfig): void {
  try {
    localStorage.setItem('axumite_system_config', JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save system config:', e);
  }
}
