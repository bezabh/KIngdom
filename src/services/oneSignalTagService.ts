import { AppNotification, NotificationPreferences, UserProfile } from '../types';
import { playGoldenNotificationChime } from './notificationService';

export const ONESIGNAL_APP_ID = '122b150b-1b50-4200-b515-7da4ed438c4e';
export const ONESIGNAL_TAG_EVENT = 'axumite:onesignal_tags_synced';

export type OneSignalCategoryId = 
  | 'scholarships' 
  | 'system_alerts' 
  | 'weekly_summary' 
  | 'payment_alerts' 
  | 'cultural_heritage' 
  | 'ai_insights';

export interface OneSignalCategoryConfig {
  id: OneSignalCategoryId;
  tagKey: string;
  prefKey: keyof NotificationPreferences;
  nameEn: string;
  nameTi: string;
  descEn: string;
  descTi: string;
  badgeEn: string;
  badgeTi: string;
  accentColor: string; // Tailwind hex or class mapping
  iconEmoji: string;
  defaultSubscribed: boolean;
  sampleNotification: {
    titleTi: string;
    titleEn: string;
    bodyTi: string;
    bodyEn: string;
    category: AppNotification['category'];
    urgency: AppNotification['urgency'];
    badgeText: string;
    actionLabelTi: string;
    actionLabelEn: string;
    targetTab?: string;
    scholarshipId?: string;
  };
}

export const ONESIGNAL_CATEGORY_SUBSCRIPTIONS: OneSignalCategoryConfig[] = [
  {
    id: 'scholarships',
    tagKey: 'sub_scholarships',
    prefKey: 'enableScholarships',
    nameEn: 'Scholarships & Fellowships',
    nameTi: 'ስኮላርሺፕን ናጻ ናይ ትምህርቲ ዕድላትን',
    descEn: 'Exclusive global scholarship alerts, KAIST, Erasmus Mundus, DAAD, and STEM full grants.',
    descTi: 'ብAI ዝተመርጹ ናይ ስኮላርሺፕን ናጻ ናይ ትምህርቲ ዕድላትን መጠንቀቕታ።',
    badgeEn: 'Scholarships',
    badgeTi: 'ስኮላርሺፕ',
    accentColor: '#F59E0B',
    iconEmoji: '🎓',
    defaultSubscribed: true,
    sampleNotification: {
      titleTi: '🎓 ሓድሽ ዕድል ስኮላርሺፕ፡ KAIST ኮርያ 2026/27 ምሉእ ብምሉእ ዝተኸፍለ STEM',
      titleEn: '🎓 New Scholarship: KAIST South Korea 2026 Full AI & STEM Fellowship',
      bodyTi: 'ኣብ ኮርያ ብሉጽ ናይ ሳይንስን ቴክኖሎጂን ትምህርቲ፡ ምሉእ ናጻ ክፍሊት ትምህርቲ፡ ናይ ወርሒ $1,000 ኣበልን ናይ ምርምር ደገፍን።',
      bodyEn: 'Korea Advanced Institute of Science and Technology (KAIST) offers full tuition, monthly living allowance ($1,000/mo), and national health insurance.',
      category: 'scholarship',
      urgency: 'urgent',
      badgeText: 'Full Fellowship',
      actionLabelTi: 'ስኮላርሺፕ ተመልከት',
      actionLabelEn: 'View Scholarship',
      targetTab: 'scholarships',
      scholarshipId: 'kaust-fellowship'
    }
  },
  {
    id: 'system_alerts',
    tagKey: 'sub_system_alerts',
    prefKey: 'enableSystemUpdates',
    nameEn: 'System Alerts & Maintenance',
    nameTi: 'ናይ ስርዓት መጠንቀቕታን ድሕንነትን',
    descEn: 'Critical infrastructure notices, AI model upgrades, server maintenance, and security advisories.',
    descTi: 'ናይ AI ሞዴል ምምሕያሽ፡ ናይ ሰርቨር ኩነታት፡ ድሕንነትን ቴክኒካዊ ሓበሬታታትን።',
    badgeEn: 'System Alerts',
    badgeTi: 'ናይ ስርዓት መጠንቀቕታ',
    accentColor: '#0EA5E9',
    iconEmoji: '⚙️',
    defaultSubscribed: true,
    sampleNotification: {
      titleTi: '⚙️ ናይ ስርዓት ሓበሬታ፡ ናይ ትግርኛ ድምጺ AI 2.0 ሞዴል ተኸፊቱ',
      titleEn: '⚙️ System Alert: Tigrinya Neural TTS v2.0 Ultra-Crisp Voice Activated',
      bodyTi: 'ሓድሽ ናይ ትግርኛ ንባብን ድምጺ ምድላውን ሞዴል ብዝለዓለ ጽሬት ኣብ ኩሉ ናይ ቻትን ትርጉምን ክፍሊ ተተኺሉ ኣሎ።',
      bodyEn: 'Upgraded Tigrinya natural voice synthesis engine is now active across voice assistance, translation, and welcome greetings.',
      category: 'system_update',
      urgency: 'important',
      badgeText: 'Audio Engine v2',
      actionLabelTi: 'ድምጺ ፈትን',
      actionLabelEn: 'Try Voice Engine',
      targetTab: 'system-status'
    }
  },
  {
    id: 'weekly_summary',
    tagKey: 'sub_weekly_summary',
    prefKey: 'enableWeeklySummary',
    nameEn: 'Weekly Intelligence Summary',
    nameTi: 'ናይ ሰሙን ጸብጻብን ናይ ትምህርቲ ዕቋርን',
    descEn: 'Automated weekly performance digests, study hours logs, token mining rewards, and certified PDF exports.',
    descTi: 'ናይ ሰሙን ናይ ትምህርቲ ሰዓታት፡ ዝተቐመጠ ገንዘብን ናይ PDF ጸብጻባትን።',
    badgeEn: 'Weekly Summary',
    badgeTi: 'ናይ ሰሙን ጸብጻብ',
    accentColor: '#10B981',
    iconEmoji: '📊',
    defaultSubscribed: true,
    sampleNotification: {
      titleTi: '📊 ናይ ሰሙን ጸብጻብኩም ተዳልዩ ኣሎ (Weekly Performance Digest)',
      titleEn: '📊 Weekly Intelligence Summary: 14.8 hrs Logged, $245.50 Saved',
      bodyTi: 'ኣብዚ ዝሓለፈ ሰሙን 14.8 ሰዓታት ተማሂርኩም፡ 7 ኣርእስታት ኣማዕቢልኩም፡ ከምኡውን $245.50 ናይ ትምህርቲ ወጻኢታት ኣድሒንኩም ኣለኹም።',
      bodyEn: 'Your weekly intelligence summary is ready: 14.8 hrs logged across 7 topics, with $245.50 estimated educational cost savings.',
      category: 'weekly_summary',
      urgency: 'important',
      badgeText: 'Weekly Digest',
      actionLabelTi: 'ናይ ሰሙን ጸብጻብ ርአ',
      actionLabelEn: 'View Weekly Digest',
      targetTab: 'weekly_summary'
    }
  },
  {
    id: 'payment_alerts',
    tagKey: 'sub_payment_alerts',
    prefKey: 'enablePaymentAlerts',
    nameEn: 'Payments & Financial Alerts',
    nameTi: 'ናይ ክፍሊትን ቴሌብርን ሓበሬታታት',
    descEn: 'Telebirr payment receipts, CBE Birr deposits, subscription renewals, and billing safety alerts.',
    descTi: 'ናይ ቴሌብር ምስግጋር፡ ደረሰኝን ናይ ኣባልነት ምሕዳስ መጠንቀቕታታትን።',
    badgeEn: 'Payments & Vault',
    badgeTi: 'ክፍሊትን ዋሌትን',
    accentColor: '#F43F5E',
    iconEmoji: '💳',
    defaultSubscribed: true,
    sampleNotification: {
      titleTi: '💳 ቴሌብር፡ ክፍሊት ብዓወት ተፈጺሙ (Payment Confirmed)',
      titleEn: '💳 Telebirr: Mobile Money Received (750.00 ETB)',
      bodyTi: '750.00 ETB ካብ CBE Birr ተቐቢልኩም። ሓድሽ ዝተረፈ ናይ ዋሌት ሚዛን፡ 5,600.75 ETB።',
      bodyEn: 'Received 750.00 ETB from CBE Birr. Current Telebirr Sovereign Vault Balance: 5,600.75 ETB.',
      category: 'payment',
      urgency: 'info',
      badgeText: 'Telebirr 750 ETB',
      actionLabelTi: 'ዋሌት ተመልከት',
      actionLabelEn: 'Open Vault',
      targetTab: 'payment-management'
    }
  },
  {
    id: 'cultural_heritage',
    tagKey: 'sub_cultural_heritage',
    prefKey: 'enableCulturalHeritage',
    nameEn: 'Cultural Heritage & Proverbs',
    nameTi: 'ዕለታዊ ጥበብን ባህላዊ ቅርሲ ኣክሱምን',
    descEn: 'Ancient Ge\'ez quote of the day, Tigrinya idioms, King Ezana monumental inscriptions, and calligraphy drops.',
    descTi: 'ናይ ጥንቲ ግእዝ ምስላታት፡ ናይ ትግርኛ ሱረ-ቃላትን ታሪኻዊ ቅርስታትን።',
    badgeEn: 'Culture & Lexicon',
    badgeTi: 'ባህላዊ ቅርሲ',
    accentColor: '#A855F7',
    iconEmoji: '👑',
    defaultSubscribed: true,
    sampleNotification: {
      titleTi: '✨ ዕለታዊ ጥበብ ኣክሱም (Daily Sovereign Wisdom)',
      titleEn: '✨ Daily Ge\'ez Sovereign Proverb & Lexical Study',
      bodyTi: '«ዘኢተማህረ አይነግሥ፡ ዘኢተጋደለ አይከብር» — ዘይተማህረ ኣይንግስን፡ ዘይተቓለሰ ኣይከብርን። ሎሚ ሓድሽ ቃል ንመሃር!',
      bodyEn: '"He who does not learn will not reign; he who does not struggle will not achieve honor." — Explore today\'s ancient Ge\'ez proverb.',
      category: 'feature',
      urgency: 'info',
      badgeText: 'Ge\'ez Wisdom',
      actionLabelTi: 'ምስላታት ተመልከት',
      actionLabelEn: 'Explore Lexicon',
      targetTab: 'heritage'
    }
  },
  {
    id: 'ai_insights',
    tagKey: 'sub_ai_insights',
    prefKey: 'enableAiInsights',
    nameEn: 'AI Insights & Socratic Prompts',
    nameTi: 'ናይ AI ረዳኢ ሓሳባትን ዝርርብን',
    descEn: 'Real-time AI tutoring suggestions, manuscript OCR translation discoveries, and offline LLM prompts.',
    descTi: 'ናይ AI መምሃሪ ሓሳባት፡ ናይ ካመራ OCR ጽሑፍ ምንባብን ሓደስቲ ሞዴላትን።',
    badgeEn: 'AI Intelligence',
    badgeTi: 'AI ሓበሬታ',
    accentColor: '#6366F1',
    iconEmoji: '⚡',
    defaultSubscribed: true,
    sampleNotification: {
      titleTi: '⚡ ሓድሽ ናይ ትግርኛ LLM ሞዴል ተጻዒኑ (Offline Model Update)',
      titleEn: '⚡ Tigrinya 1.2B Quantized Model v3.8 Ready for Offline Mode',
      bodyTi: 'ናይ ኤርትራን ኢትዮጵያን ላህጃታት ዘጠቓለለ ድምጺ ሞዴል ኣብ ኦፍላይን ተኸፊቱ ኣሎ።',
      bodyEn: 'Offline acoustic speech models updated for ultra-low latency inference without network dependency.',
      category: 'feature',
      urgency: 'info',
      badgeText: 'Offline LLM',
      actionLabelTi: 'ቻት ጀምር',
      actionLabelEn: 'Open Assistant',
      targetTab: 'chat'
    }
  }
];

/**
 * Generate a complete dictionary of OneSignal tags representing current user preferences and segment metadata
 */
export function generateOneSignalTagsPayload(
  prefs: NotificationPreferences,
  user?: Partial<UserProfile>
): Record<string, string> {
  const tags: Record<string, string> = {
    onesignal_app_id: ONESIGNAL_APP_ID,
    sub_scholarships: prefs.enableScholarships !== false ? '1' : '0',
    sub_system_alerts: prefs.enableSystemUpdates !== false ? '1' : '0',
    sub_weekly_summary: prefs.enableWeeklySummary !== false ? '1' : '0',
    sub_payment_alerts: prefs.enablePaymentAlerts !== false ? '1' : '0',
    sub_cultural_heritage: prefs.enableCulturalHeritage !== false ? '1' : '0',
    sub_ai_insights: prefs.enableAiInsights !== false ? '1' : '0',
    pref_language: prefs.preferredLanguage || 'bilingual',
    audio_chime_enabled: prefs.enableAudioChime ? '1' : '0',
    web_push_enabled: prefs.enableWebPush ? '1' : '0',
    user_tier: user?.role || 'Axumite Sovereign Scholar',
    platform: 'web_android_hybrid',
    engine: 'axumite_ai_v5',
    last_tag_sync_iso: new Date().toISOString()
  };

  return tags;
}

/**
 * Checks if a given notification category is currently subscribed according to user preferences
 */
export function isCategorySubscribed(
  categoryId: string,
  prefs: NotificationPreferences
): boolean {
  switch (categoryId) {
    case 'scholarships':
    case 'scholarship':
      return prefs.enableScholarships !== false;
    case 'system_alerts':
    case 'system_update':
    case 'system':
    case 'security':
      return prefs.enableSystemUpdates !== false;
    case 'weekly_summary':
      return prefs.enableWeeklySummary !== false;
    case 'payment_alerts':
    case 'payment':
    case 'payment_failed':
    case 'churn_alert':
      return prefs.enablePaymentAlerts !== false;
    case 'cultural_heritage':
    case 'heritage':
    case 'wisdom':
      return prefs.enableCulturalHeritage !== false;
    case 'ai_insights':
    case 'ai_chat':
    case 'feature':
      return prefs.enableAiInsights !== false;
    default:
      return true;
  }
}

/**
 * Synchronizes user category subscription tags directly with OneSignal Web SDK and local state
 */
export async function syncOneSignalCategoryTags(
  prefs: NotificationPreferences,
  user?: Partial<UserProfile>
): Promise<Record<string, string>> {
  const tags = generateOneSignalTagsPayload(prefs, user);

  // 1. Send tags to OneSignal Web SDK (v5 / v4 compatibility)
  if (typeof window !== 'undefined') {
    try {
      const win = window as any;
      if (win.OneSignal) {
        if (win.OneSignal.User && typeof win.OneSignal.User.addTags === 'function') {
          win.OneSignal.User.addTags(tags);
          console.log('[OneSignal v5] User category tags synced:', tags);
        } else if (typeof win.OneSignal.sendTags === 'function') {
          win.OneSignal.sendTags(tags);
          console.log('[OneSignal v4] User category tags synced:', tags);
        } else if (Array.isArray(win.OneSignal)) {
          win.OneSignal.push(() => {
            if (win.OneSignal.User?.addTags) {
              win.OneSignal.User.addTags(tags);
            } else if (win.OneSignal.sendTags) {
              win.OneSignal.sendTags(tags);
            }
          });
        }
      }
    } catch (err) {
      console.warn('[OneSignal] Could not sync tags directly to window.OneSignal:', err);
    }

    // 2. Dispatch custom event for UI reactivity
    try {
      const event = new CustomEvent(ONESIGNAL_TAG_EVENT, { detail: { tags, prefs } });
      window.dispatchEvent(event);
    } catch {
      // ignore
    }
  }

  return tags;
}

/**
 * Dispatches a simulated category test push notification adhering to OneSignal category payload standards
 */
export function createCategoryTestNotification(
  categoryId: OneSignalCategoryId
): AppNotification {
  const categoryConfig = ONESIGNAL_CATEGORY_SUBSCRIPTIONS.find(c => c.id === categoryId) 
    || ONESIGNAL_CATEGORY_SUBSCRIPTIONS[0];
  
  const sample = categoryConfig.sampleNotification;

  return {
    id: `notif_${categoryId}_${Date.now()}`,
    titleTi: sample.titleTi,
    titleEn: sample.titleEn,
    bodyTi: sample.bodyTi,
    bodyEn: sample.bodyEn,
    category: sample.category,
    urgency: sample.urgency,
    timestamp: 'ሕጂ • Just now',
    isoDate: new Date().toISOString(),
    read: false,
    badgeText: sample.badgeText,
    actionLabelTi: sample.actionLabelTi,
    actionLabelEn: sample.actionLabelEn,
    targetTab: sample.targetTab,
    scholarshipId: sample.scholarshipId,
  };
}
