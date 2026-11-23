import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppNotification, NotificationPreferences, WeeklySummaryData } from '../types';
import {
  getStoredNotifications,
  saveStoredNotifications,
  getStoredPreferences,
  saveStoredPreferences,
  playGoldenNotificationChime,
  triggerBrowserPushNotification,
  getMockWeeklySummaryData,
  triggerWeeklySummaryNotification,
  NOTIFICATION_EVENT_NAME,
} from '../services/notificationService';
import { syncOneSignalCategoryTags } from '../services/oneSignalTagService';
import { dedupeNotifications, runStartupStorageOptimization } from '../utils/dataOptimizer';
import { useAuthUser } from './AuthUserContext';

export interface NotificationActionsType {
  updateNotifications: (newNotifs: AppNotification[]) => void;
  updateNotificationPrefs: (newPrefs: NotificationPreferences) => void;
  dismissToast: () => void;
  prepareWeeklySummary: (data?: WeeklySummaryData) => WeeklySummaryData;
  triggerWeeklySummary: () => void;
  triggerTestPushNotification: () => void;
}

export interface NotificationDataType {
  notifications: AppNotification[];
  notificationPrefs: NotificationPreferences;
  weeklySummaryData: WeeklySummaryData;
}

const NotificationDataContext = createContext<NotificationDataType | undefined>(undefined);
const NotificationUnreadContext = createContext<number | undefined>(undefined);
const NotificationToastContext = createContext<AppNotification | null | undefined>(undefined);
const NotificationActionsContext = createContext<NotificationActionsType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthUser();
  const userRef = useRef(user);
  userRef.current = user;

  const [notifications, setNotifications] = useState<AppNotification[]>(() => getStoredNotifications());
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>(() =>
    getStoredPreferences()
  );
  const [activePushToast, setActivePushToast] = useState<AppNotification | null>(null);
  const [weeklySummaryData, setWeeklySummaryData] = useState<WeeklySummaryData | null>(null);

  const prefsRef = useRef(notificationPrefs);
  prefsRef.current = notificationPrefs;

  useEffect(() => {
    runStartupStorageOptimization();
    syncOneSignalCategoryTags(prefsRef.current, userRef.current);
  }, []);

  // Sync programmatic and cross-system notifications (e.g. Stripe payment failure alerts)
  useEffect(() => {
    const handleNewNotificationEvent = (e: Event) => {
      const detail = (e as CustomEvent<AppNotification>)?.detail;
      if (!detail) return;
      setNotifications((prev) => dedupeNotifications([detail, ...prev]));
      setActivePushToast(detail);
    };

    window.addEventListener(NOTIFICATION_EVENT_NAME, handleNewNotificationEvent);
    return () => {
      window.removeEventListener(NOTIFICATION_EVENT_NAME, handleNewNotificationEvent);
    };
  }, []);

  const updateNotifications = useCallback((newNotifs: AppNotification[]) => {
    const deduped = dedupeNotifications(newNotifs);
    setNotifications(deduped);
    saveStoredNotifications(deduped);
  }, []);

  const updateNotificationPrefs = useCallback((newPrefs: NotificationPreferences) => {
    setNotificationPrefs(newPrefs);
    saveStoredPreferences(newPrefs);
    syncOneSignalCategoryTags(newPrefs, userRef.current);
  }, []);

  const dismissToast = useCallback(() => {
    setActivePushToast(null);
  }, []);

  const prepareWeeklySummary = useCallback((data?: WeeklySummaryData): WeeklySummaryData => {
    const resolved = data ?? getMockWeeklySummaryData(userRef.current);
    setWeeklySummaryData(resolved);
    return resolved;
  }, []);

  const triggerWeeklySummary = useCallback(() => {
    const currentUser = userRef.current;
    const currentPrefs = prefsRef.current;
    const summary = getMockWeeklySummaryData(currentUser);
    setWeeklySummaryData(summary);
    const newNotif = triggerWeeklySummaryNotification(currentUser, summary);
    setActivePushToast(newNotif);
    if (currentPrefs.enableAudioChime) {
      playGoldenNotificationChime();
    }
    if (currentPrefs.enableWebPush) {
      triggerBrowserPushNotification(
        newNotif,
        currentUser.preferredLanguage?.startsWith('ti') ? 'ti' : 'en'
      );
    }
  }, []);

  const triggerTestPushNotification = useCallback(() => {
    const currentUser = userRef.current;
    const currentPrefs = prefsRef.current;
    const testSamples: Omit<AppNotification, 'id' | 'timestamp' | 'isoDate' | 'read'>[] = [
      {
        titleTi: '🎓 ሓድሽ ዕድል ስኮላርሺፕ፡ KAIST ኮርያ 2026/27 ምሉእ ብምሉእ ዝተኸፍለ STEM',
        titleEn: '🎓 New Scholarship: KAIST South Korea 2026 Full AI & STEM Fellowship',
        bodyTi:
          'ኣብ ኮርያ ብሉጽ ናይ ሳይንስን ቴክኖሎጂን ትምህርቲ፡ ምሉእ ናጻ ክፍሊት ትምህርቲ፡ ናይ ወርሒ $1,000 ኣበልን ናይ ምርምር ደገፍን።',
        bodyEn:
          'Korea Advanced Institute of Science and Technology (KAIST) offers full tuition, monthly living allowance ($1,000/mo), and national health insurance.',
        category: 'scholarship',
        urgency: 'urgent',
        scholarshipId: 'kaust-fellowship',
        actionLabelTi: 'ስኮላርሺፕ ተመልከት',
        actionLabelEn: 'View Scholarship',
        badgeText: 'Full Fellowship',
      },
      {
        titleTi: '🎓 ኤራስመስ ሙንዱስ (Erasmus Mundus) ናይ ኣውሮጳ ሕብረት 2026/27',
        titleEn: '🎓 Erasmus Mundus Joint Master Degrees 2026 EU Full Grant',
        bodyTi:
          'ኣብ 2 ክሳብ 3 ናይ ኣውሮጳ ሃገራት ብነጻ ናይ ማስተርስ ዲግሪ ንምምሃርን ናይ ወርሒ €1,400 ኣበልን ዝወሃብ ዓለምለኸ ስኮላርሺፕ።',
        bodyEn:
          'Prestigious European Commission scholarship covering tuition in multiple EU countries with €1,400 monthly allowance and flight funding.',
        category: 'scholarship',
        urgency: 'urgent',
        scholarshipId: 'erasmus-mundus',
        actionLabelTi: 'ዝርዝር ሓበሬታ ርአ',
        actionLabelEn: 'View Details',
        badgeText: 'EU Grant',
      },
      {
        titleTi: '⚙️ ናይ ስርዓት ሓበሬታ፡ ናይ ትግርኛ ድምጺ AI 2.0 ሞዴል ተኸፊቱ',
        titleEn: '⚙️ System Alert: Tigrinya Neural TTS v2.0 Ultra-Crisp Voice Activated',
        bodyTi:
          'ሓድሽ ናይ ትግርኛ ንባብን ድምጺ ምድላውን ሞዴል ብዝለዓለ ጽሬት ኣብ ኩሉ ናይ ቻትን ትርጉምን ክፍሊ ተተኺሉ ኣሎ።',
        bodyEn:
          'Upgraded Tigrinya natural voice synthesis engine is now active across voice assistance, translation, and welcome greetings.',
        category: 'system_update',
        urgency: 'important',
        actionLabelTi: 'ድምጺ ፈትን',
        actionLabelEn: 'Try Voice',
        badgeText: 'Audio v2.0',
      },
    ];

    const chosen = testSamples[Math.floor(Math.random() * testSamples.length)];
    const newNotification: AppNotification = {
      ...chosen,
      id: `notif_${Date.now()}`,
      timestamp: 'ሕጂ • Just now',
      isoDate: new Date().toISOString(),
      read: false,
    };

    setNotifications((prev) => {
      const deduped = dedupeNotifications([newNotification, ...prev]);
      saveStoredNotifications(deduped);
      return deduped;
    });
    setActivePushToast(newNotification);

    if (currentPrefs.enableAudioChime) {
      playGoldenNotificationChime();
    }

    if (currentPrefs.enableWebPush) {
      triggerBrowserPushNotification(
        newNotification,
        currentUser.preferredLanguage?.startsWith('ti') ? 'ti' : 'en'
      );
    }
  }, []);

  const unreadCount = useMemo(
    () => notifications.reduce((acc, item) => (item.read ? acc : acc + 1), 0),
    [notifications]
  );

  const actionsValue = useMemo<NotificationActionsType>(
    () => ({
      updateNotifications,
      updateNotificationPrefs,
      dismissToast,
      prepareWeeklySummary,
      triggerWeeklySummary,
      triggerTestPushNotification,
    }),
    [
      updateNotifications,
      updateNotificationPrefs,
      dismissToast,
      prepareWeeklySummary,
      triggerWeeklySummary,
      triggerTestPushNotification,
    ]
  );

  const dataValue = useMemo<NotificationDataType>(
    () => ({
      notifications,
      notificationPrefs,
      weeklySummaryData: weeklySummaryData ?? getMockWeeklySummaryData(userRef.current),
    }),
    [notifications, notificationPrefs, weeklySummaryData]
  );

  return (
    <NotificationActionsContext.Provider value={actionsValue}>
      <NotificationUnreadContext.Provider value={unreadCount}>
        <NotificationToastContext.Provider value={activePushToast}>
          <NotificationDataContext.Provider value={dataValue}>
            {children}
          </NotificationDataContext.Provider>
        </NotificationToastContext.Provider>
      </NotificationUnreadContext.Provider>
    </NotificationActionsContext.Provider>
  );
};

export const useNotificationUnreadCount = (): number => {
  const count = useContext(NotificationUnreadContext);
  if (count === undefined) {
    throw new Error('useNotificationUnreadCount must be used within a NotificationProvider');
  }
  return count;
};

export const useActivePushToast = (): AppNotification | null => {
  const toast = useContext(NotificationToastContext);
  if (toast === undefined) {
    throw new Error('useActivePushToast must be used within a NotificationProvider');
  }
  return toast;
};

export const useNotificationData = (): NotificationDataType => {
  const data = useContext(NotificationDataContext);
  if (!data) {
    throw new Error('useNotificationData must be used within a NotificationProvider');
  }
  return data;
};

export const useNotificationActions = (): NotificationActionsType => {
  const actions = useContext(NotificationActionsContext);
  if (!actions) {
    throw new Error('useNotificationActions must be used within a NotificationProvider');
  }
  return actions;
};
