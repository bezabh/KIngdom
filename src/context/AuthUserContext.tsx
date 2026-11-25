import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { UserProfile } from '../types';
import {
  syncUserProfileToFirestore,
  hasActiveFirebaseAuthForEmail,
  handleFirebaseRedirectResultWithMeta,
  onFirebaseAuthStateChanged,
  resolveFirebaseUserProfile,
  subscribeToUserProfileInFirestore,
  clearFirebaseProfileCaches,
  logoutFromFirebase,
  type FirebaseUser,
} from '../lib/firebase';
import {
  AUTH_PROFILE_SYNCED_EVENT,
  ROLE_DEFAULT_PRIVILEGES,
  normalizeUserProfilePermissions,
} from '../lib/permissions';
import { isValidVoicePersonaId, saveVoicePersonaSettings } from '../types/voicePersona';
import { getStableContentHash, safeWriteLocalStorage } from '../utils/dataOptimizer';
import { useBrandingTheme } from './BrandingThemeContext';
import { isBatterySaverPowerSaveActive } from './BatterySaverContext';

export const DEFAULT_USER: UserProfile = {
  id: 'usr_guest_001',
  name: 'ጋሻ (Guest User)',
  email: 'guest@axumite.ai',
  phoneNumber: '',
  countryCode: '+291',
  isPhoneVerified: false,
  isEmailVerified: false,
  avatar: 'axumite-star',
  role: 'Guest',
  preferredLanguage: 'ti-ER',
  isLoggedIn: false,
  joinedDate: '2026',
  offlineAccessEnabled: true,
  savedInsightsCount: 0,
  customPrivilegesEnabled: false,
  privileges: { ...ROLE_DEFAULT_PRIVILEGES.Guest },
};

export interface UpdateUserOptions {
  forceRender?: boolean;
  fromAuthTransition?: boolean;
  fromFirestoreSnapshot?: boolean;
  navigateToPremiere?: boolean;
}

export interface AuthUserActionsType {
  updateUser: (updated: Partial<UserProfile>, options?: UpdateUserOptions) => void;
  logoutUser: () => void;
}

export interface AuthUserContextType extends AuthUserActionsType {
  user: UserProfile;
  isAuthReady: boolean;
  authSessionVersion: number;
  loginRedirectTick: number;
  authDismissTick: number;
}

const AuthUserContext = createContext<AuthUserContextType | undefined>(undefined);
const AuthUserActionsContext = createContext<AuthUserActionsType | undefined>(undefined);

export const AuthUserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    setThemeScheme,
    setGoldIntensity,
    setThemeHue,
    setGoldShimmerEffect,
    setBorderGlow,
  } = useBrandingTheme();

  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
  const [authSessionVersion, setAuthSessionVersion] = useState<number>(0);
  const [loginRedirectTick, setLoginRedirectTick] = useState<number>(0);
  const [authDismissTick, setAuthDismissTick] = useState<number>(0);

  const wasFirebaseSignedInRef = useRef<boolean>(false);
  const skipNextFirestoreSyncRef = useRef<boolean>(false);

  // Persistent User State (preserves authoritative Firestore roles & custom privileges)
  const [user, setUser] = useState<UserProfile>(() => {
    try {
      const stored = localStorage.getItem('axumite_user_profile');
      if (stored) {
        const parsed: UserProfile = JSON.parse(stored);
        const normalizedEmail = (parsed.email || '').trim().toLowerCase();
        const isGuest = !normalizedEmail || normalizedEmail === 'guest@axumite.ai';
        const effectiveLoggedIn = !isGuest && Boolean(parsed.isLoggedIn);
        return normalizeUserProfilePermissions(
          {
            ...parsed,
            isLoggedIn: effectiveLoggedIn,
          },
          {
            isAuthenticated: effectiveLoggedIn,
          }
        ) as UserProfile;
      }
      return DEFAULT_USER;
    } catch {
      return DEFAULT_USER;
    }
  });

  const userRef = useRef<UserProfile>(user);
  userRef.current = user;

  // Apply cloud-stored theme preferences consistently across redirect login, auth state restore, and live snapshots
  const applyCloudThemePreferences = useCallback(
    (profile: Partial<UserProfile> | null | undefined) => {
      if (!profile) return;
      if (profile.themePreference) {
        setThemeScheme(profile.themePreference);
      }
      if (profile.themeConfig) {
        if (profile.themeConfig.goldIntensity) setGoldIntensity(profile.themeConfig.goldIntensity);
        if (profile.themeConfig.themeHue) setThemeHue(profile.themeConfig.themeHue as any);
        if (typeof profile.themeConfig.goldShimmerEffect === 'boolean') {
          setGoldShimmerEffect(profile.themeConfig.goldShimmerEffect);
        }
        if (typeof profile.themeConfig.borderGlow === 'boolean') {
          setBorderGlow(profile.themeConfig.borderGlow);
        }
      }
    },
    [setThemeScheme, setGoldIntensity, setThemeHue, setGoldShimmerEffect, setBorderGlow]
  );

  // Mirror Firestore-hydrated or user-updated AI Voice Persona settings into local voice store
  useEffect(() => {
    const partial: {
      personaId?: 'ancient_historian' | 'modern_advisor' | 'technical_consultant' | 'cultural_custodian' | 'concise_executive';
      pitchMultiplier?: number;
      rateMultiplier?: number;
    } = {};

    if (isValidVoicePersonaId(user.voicePersona)) {
      partial.personaId = user.voicePersona;
    }
    if (typeof user.voicePersonaPitch === 'number' && Number.isFinite(user.voicePersonaPitch)) {
      partial.pitchMultiplier = user.voicePersonaPitch;
    }
    if (typeof user.voicePersonaRate === 'number' && Number.isFinite(user.voicePersonaRate)) {
      partial.rateMultiplier = user.voicePersonaRate;
    }

    if (Object.keys(partial).length > 0) {
      saveVoicePersonaSettings(partial);
    }
  }, [user.voicePersona, user.voicePersonaPitch, user.voicePersonaRate]);

  // Canonical user profile & permissions updater (triggers reliable React re-renders on auth transitions)
  const updateUser = useCallback(
    (updated: Partial<UserProfile>, options?: UpdateUserOptions) => {
      const prev = userRef.current;
      const mergedInput: UserProfile = {
        ...prev,
        ...updated,
      };

      const isSameEmail =
        Boolean(prev.email) &&
        Boolean(mergedInput.email) &&
        prev.email.trim().toLowerCase() === mergedInput.email.trim().toLowerCase();

      const nextNormalized = normalizeUserProfilePermissions(mergedInput, {
        isAuthenticated: Boolean(mergedInput.isLoggedIn),
        fallbackRole: isSameEmail ? prev.role : undefined,
      }) as UserProfile;

      const isExplicitLogin = updated.isLoggedIn === true;
      const isAccountSwitch =
        Boolean(prev.email) &&
        Boolean(nextNormalized.email) &&
        prev.email.trim().toLowerCase() !== nextNormalized.email.trim().toLowerCase();
      const isStateLogin = !prev.isLoggedIn && nextNormalized.isLoggedIn;
      const isStateLogout = prev.isLoggedIn && !nextNormalized.isLoggedIn;
      const didPermissionsChange =
        prev.role !== nextNormalized.role ||
        Boolean(prev.customPrivilegesEnabled) !== Boolean(nextNormalized.customPrivilegesEnabled) ||
        getStableContentHash(prev.privileges || {}) !==
          getStableContentHash(nextNormalized.privileges || {});

      const isMeaningfulAuthEvent =
        Boolean(options?.forceRender) ||
        Boolean(options?.fromAuthTransition) ||
        didPermissionsChange ||
        isAccountSwitch ||
        isStateLogin ||
        isStateLogout;

      // Skip redundant state updates for routine unchanged profile writes,
      // while ALWAYS re-rendering on auth transitions or permission updates
      if (!isMeaningfulAuthEvent && getStableContentHash(prev) === getStableContentHash(nextNormalized)) {
        return;
      }

      if (options?.fromFirestoreSnapshot) {
        skipNextFirestoreSyncRef.current = true;
      }

      const committedNext: UserProfile = {
        ...nextNormalized,
        privileges: nextNormalized.privileges
          ? { ...nextNormalized.privileges }
          : undefined,
      };

      userRef.current = committedNext;
      setUser(committedNext);

      if (isMeaningfulAuthEvent) {
        setAuthSessionVersion((v) => v + 1);
      }

      if (options?.fromAuthTransition || options?.fromFirestoreSnapshot) {
        applyCloudThemePreferences(committedNext);
      }

      if (
        committedNext.isLoggedIn &&
        (options?.fromAuthTransition || isExplicitLogin || isStateLogin || isAccountSwitch)
      ) {
        setAuthDismissTick((t) => t + 1);
      }

      const shouldNavigateToPremiere =
        committedNext.isLoggedIn &&
        (Boolean(options?.navigateToPremiere) ||
          (!options?.fromFirestoreSnapshot && (isExplicitLogin || isStateLogin || isAccountSwitch)) ||
          (Boolean(options?.fromAuthTransition) && (isStateLogin || isAccountSwitch)));

      if (shouldNavigateToPremiere) {
        setLoginRedirectTick((t) => t + 1);
      }
    },
    [applyCloudThemePreferences]
  );

  const logoutUser = useCallback(() => {
    wasFirebaseSignedInRef.current = false;
    void logoutFromFirebase();
    updateUser(
      { isLoggedIn: false },
      { fromAuthTransition: true, forceRender: true }
    );
  }, [updateUser]);

  // Persist user profile, broadcast legacy sync event if needed, and mirror authenticated local changes to Firestore
  useEffect(() => {
    try {
      safeWriteLocalStorage('axumite_user_profile', user);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(AUTH_PROFILE_SYNCED_EVENT, { detail: user }));
      }

      if (skipNextFirestoreSyncRef.current) {
        skipNextFirestoreSyncRef.current = false;
        return;
      }

      const normalizedEmail = (user?.email || '').trim().toLowerCase();
      if (
        isAuthReady &&
        normalizedEmail &&
        normalizedEmail !== 'guest@axumite.ai' &&
        user?.isLoggedIn &&
        hasActiveFirebaseAuthForEmail(normalizedEmail) &&
        !isBatterySaverPowerSaveActive()
      ) {
        syncUserProfileToFirestore(user);
      }
    } catch (err) {
      console.error('Failed to save user profile:', err);
    }
  }, [user, authSessionVersion, isAuthReady]);

  // Serialized Firebase Auth Redirect Resolution, Firestore Profile Hydration & Live Permission Sync
  useEffect(() => {
    let isMounted = true;
    let unsubscribeAuth: (() => void) | null = null;
    let unsubscribeProfile: (() => void) | null = null;

    const detachProfileListener = () => {
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }
    };

    const attachLiveProfileSync = (fbUser: FirebaseUser, email: string) => {
      detachProfileListener();
      unsubscribeProfile = subscribeToUserProfileInFirestore(
        email,
        fbUser.uid,
        (liveProfile) => {
          if (!isMounted) return;
          updateUser(
            {
              ...liveProfile,
              authUid: fbUser.uid,
              isLoggedIn: true,
              isEmailVerified: fbUser.emailVerified || liveProfile.isEmailVerified,
            },
            {
              fromFirestoreSnapshot: true,
              forceRender: true,
            }
          );
        }
      );
    };

    const hydrateFromFirebaseUser = async (
      fbUser: FirebaseUser,
      opts: { fromRedirect?: boolean } = {}
    ) => {
      const email = (fbUser.email || '').trim().toLowerCase();
      if (!email || !isMounted) return;

      wasFirebaseSignedInRef.current = true;

      try {
        const cloudProfile = await resolveFirebaseUserProfile(fbUser, {
          forceRefresh: true,
          syncToFirestore: Boolean(opts.fromRedirect),
        });

        if (!isMounted) return;

        if (cloudProfile) {
          updateUser(
            {
              ...cloudProfile,
              authUid: fbUser.uid,
              isLoggedIn: true,
            },
            {
              fromAuthTransition: true,
              fromFirestoreSnapshot: true,
              forceRender: true,
              navigateToPremiere: Boolean(opts.fromRedirect),
            }
          );
        } else {
          const isSuperadmin = email === 'beckylove2004@gmail.com';
          updateUser(
            {
              id: fbUser.uid,
              authUid: fbUser.uid,
              name: fbUser.displayName || (isSuperadmin ? 'Becky Love (Superadmin)' : 'Axumite Member'),
              email,
              isLoggedIn: true,
              isEmailVerified: fbUser.emailVerified || isSuperadmin,
              role: isSuperadmin ? 'Creator' : 'Free Member',
            },
            {
              fromAuthTransition: true,
              forceRender: true,
              navigateToPremiere: Boolean(opts.fromRedirect),
            }
          );
        }

        attachLiveProfileSync(fbUser, email);
      } catch (profileErr) {
        console.warn('Auth state profile fetch notice:', profileErr);
      }
    };

    const bootstrapFirebaseAuth = async () => {
      let redirectResolvedUid: string | null = null;

      // 1. Resolve redirect-based login FIRST before subscribing to onAuthStateChanged
      try {
        const redirectResolved = await handleFirebaseRedirectResultWithMeta();
        if (redirectResolved && isMounted) {
          const { profile, firebaseUser } = redirectResolved;
          redirectResolvedUid = firebaseUser.uid;
          wasFirebaseSignedInRef.current = true;

          updateUser(
            {
              ...profile,
              authUid: firebaseUser.uid,
              isLoggedIn: true,
            },
            {
              fromAuthTransition: true,
              fromFirestoreSnapshot: true,
              forceRender: true,
              navigateToPremiere: true,
            }
          );

          attachLiveProfileSync(firebaseUser, profile.email);
          setIsAuthReady(true);
        }
      } catch (err) {
        console.warn('Firebase initial redirect resolution notice:', err);
      }

      if (!isMounted) return;

      // 2. Attach continuous Firebase Auth state listener after redirect resolution completes
      unsubscribeAuth = onFirebaseAuthStateChanged(async (fbUser) => {
        if (!isMounted) return;

        if (fbUser && fbUser.email) {
          const alreadyHydratedByRedirect =
            redirectResolvedUid !== null && redirectResolvedUid === fbUser.uid;
          redirectResolvedUid = null;

          if (!alreadyHydratedByRedirect) {
            await hydrateFromFirebaseUser(fbUser, { fromRedirect: false });
          }
        } else {
          detachProfileListener();
          const hasStaleCachedLogin =
            Boolean(userRef.current?.isLoggedIn) &&
            Boolean(userRef.current?.email) &&
            userRef.current.email.trim().toLowerCase() !== 'guest@axumite.ai';

          if (wasFirebaseSignedInRef.current || hasStaleCachedLogin) {
            wasFirebaseSignedInRef.current = false;
            clearFirebaseProfileCaches();
            updateUser(
              {
                ...DEFAULT_USER,
                isLoggedIn: false,
                authUid: undefined,
              },
              {
                fromAuthTransition: true,
                forceRender: true,
              }
            );
          }
        }

        if (isMounted) {
          setIsAuthReady(true);
        }
      });
    };

    bootstrapFirebaseAuth();

    return () => {
      isMounted = false;
      detachProfileListener();
      if (unsubscribeAuth) {
        unsubscribeAuth();
      }
    };
  }, [updateUser]);

  const actionsValue = useMemo<AuthUserActionsType>(
    () => ({ updateUser, logoutUser }),
    [updateUser, logoutUser]
  );

  const value = useMemo<AuthUserContextType>(
    () => ({
      user,
      isAuthReady,
      authSessionVersion,
      updateUser,
      logoutUser,
      loginRedirectTick,
      authDismissTick,
    }),
    [user, isAuthReady, authSessionVersion, updateUser, logoutUser, loginRedirectTick, authDismissTick]
  );

  return (
    <AuthUserActionsContext.Provider value={actionsValue}>
      <AuthUserContext.Provider value={value}>{children}</AuthUserContext.Provider>
    </AuthUserActionsContext.Provider>
  );
};

export const useAuthUser = (): AuthUserContextType => {
  const context = useContext(AuthUserContext);
  if (!context) {
    throw new Error('useAuthUser must be used within an AuthUserProvider');
  }
  return context;
};

export const useAuthUserActions = (): AuthUserActionsType => {
  const context = useContext(AuthUserActionsContext);
  if (!context) {
    throw new Error('useAuthUserActions must be used within an AuthUserProvider');
  }
  return context;
};
