import { AppNotification, NotificationPreferences, WeeklySummaryData, UserProfile } from '../types';
import { dedupeNotifications, normalizeTextKey, safeWriteLocalStorage } from '../utils/dataOptimizer';

const STORAGE_KEY_NOTIFICATIONS = 'axumite_push_notifications';
const STORAGE_KEY_PREFS = 'axumite_notification_prefs';
const recentNotificationDispatchMap = new Map<string, number>();

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enableWebPush: true,
  enableScholarships: true,
  enableSystemUpdates: true,
  enableWeeklySummary: true,
  enablePaymentAlerts: true,
  enableCulturalHeritage: true,
  enableAiInsights: true,
  enableAudioChime: true,
  preferredLanguage: 'bilingual',
  oneSignalTags: {
    sub_scholarships: '1',
    sub_system_alerts: '1',
    sub_weekly_summary: '1',
    sub_payment_alerts: '1',
    sub_cultural_heritage: '1',
    sub_ai_insights: '1'
  }
};

export const NOTIFICATION_EVENT_NAME = 'axumite:new_notification';

export function getMockWeeklySummaryData(user?: Partial<UserProfile>): WeeklySummaryData {
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 3600 * 1000);
  
  const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const startDateStr = formatDate(weekAgo);
  const endDateStr = formatDate(today);

  return {
    periodLabel: 'Current Week',
    periodLabelTi: 'ናይዚ ሰሙን',
    startDate: startDateStr,
    endDate: endDateStr,
    totalStudyHours: 14.8,
    completedTasks: 26,
    topicsLearnedCount: 7,
    totalSavingsUSD: 245.50,
    tokenMiningEarningsUSD: 18.75,
    accuracyRate: 94,
    streakDays: 7,
    recentActivities: [
      {
        id: 'act-1',
        title: 'Ancient Ge\'ez Syntax & Morphology Interactive Drill',
        titleTi: 'ናይ ግዕዝ ሰዋስውን ድምጻዊ ስርዓትን ልምምድ',
        category: 'education',
        date: 'Today, 10:30 AM',
        durationOrCount: '45 mins • 100% Score',
        status: 'Mastered',
      },
      {
        id: 'act-2',
        title: 'Tigrinya Neural Document Translation & OCR Parsing',
        titleTi: 'ናይ ሰነድ ትርጉምን OCR ጽሑፍ ምንባብን',
        category: 'translation',
        date: 'Yesterday, 4:15 PM',
        durationOrCount: '12,400 Words processed',
        status: 'Completed',
      },
      {
        id: 'act-3',
        title: 'Ge\'ez Birana Calligraphy Studio 4K Illuminated Manuscript',
        titleTi: 'ናይ ብራና ማኅተም 4K ኪነ-ጽሕፈት ስቱድዮ',
        category: 'calligraphy',
        date: '2 days ago',
        durationOrCount: '3 Artwork Presets Exported',
        status: 'Completed',
      },
      {
        id: 'act-4',
        title: 'Socratic AI STEM Physics & Differential Equations Solver',
        titleTi: 'ናይ ፊዚክስን ካልኩለስን ናይ ገዛ ዕዮ ብAI ምፍታሕ',
        category: 'education',
        date: '3 days ago',
        durationOrCount: '8 Complex Equations Solved',
        status: 'Completed',
      },
      {
        id: 'act-5',
        title: 'Community Wisdom Contribution: Tigrinya Idioms & Lexicon',
        titleTi: 'ናይ ማሕበረሰብ ጥበብ ኣስተዋጽኦ፡ ምስላታትን ቃላትን',
        category: 'wisdom',
        date: '4 days ago',
        durationOrCount: '+150 Wisdom XP earned',
        status: 'Mastered',
      },
      {
        id: 'act-6',
        title: 'Axumite Pro Click Mining & Neural Reward Accumulation',
        titleTi: 'ናይ ፕሮ ክሊክ ማይኒንግን ቶከን ምእካብን',
        category: 'pro_click',
        date: '5 days ago',
        durationOrCount: '420 Clicks • +840 Tokens',
        status: 'Completed',
      },
    ],
    learnedTopics: [
      {
        id: 'top-1',
        topicName: 'Ge\'ez Verb Conjugation & Trilateral Roots',
        topicNameTi: 'ስርዓተ ግሲ ግዕዝን ሱረ-ቃላትን',
        field: 'Ancient Ge\'ez & Philology',
        fieldTi: 'ግዕዝን ጥንታዊ ጽሕፈትን',
        masteryScore: 96,
        hoursSpent: 3.5,
        keyTakeaway: 'Mastered 1st, 2nd, and 3rd order vocalic transformations in standard Fidel matrices.',
        keyTakeawayTi: 'ቀዳማይ፡ ካልኣይን ሳልሳይን ናይ ፊደላት ድምጻዊ ለውጢ ብዝግባእ ምልላይ ተገይሩ።',
      },
      {
        id: 'top-2',
        topicName: 'Neural Translation Latency & Embedding Spaces',
        topicNameTi: 'ናይ ኒውራል ትርጉም ኣሰራርሓን ሞዴልን',
        field: 'AI & Computational Linguistics',
        fieldTi: 'AIን ኮምፒዩተራይዝድ ስነ-ልሳንን',
        masteryScore: 92,
        hoursSpent: 4.0,
        keyTakeaway: 'Understood subword tokenization for Low-Resource Semitic languages.',
        keyTakeawayTi: 'ንትሑት ጸጋ ዘለዎም ቋንቋታት ሰሚቲክ ዝኸውን ናይ ቶከን ምፍላይ ስልቲ።',
      },
      {
        id: 'top-3',
        topicName: 'Axumite Numismatics & Stelae Architectural Geometry',
        topicNameTi: 'ናይ ኣክሱም ቅርጺ ሓወልትታትን ቅርሸታትን',
        field: 'Heritage & Archaeology',
        fieldTi: 'ታሪኽን ቅርሰ-መሬትን',
        masteryScore: 98,
        hoursSpent: 2.8,
        keyTakeaway: 'Analyzed the mathematical proportions of King Ezana\'s obelisk inscriptions.',
        keyTakeawayTi: 'ናይ ንጉስ ዔዛና ሓወልቲ ስነ-ቅርጻውን ጂኦሜትሪያውን ዓቐናት ምምርማር።',
      },
      {
        id: 'top-4',
        topicName: 'Advanced Tigrinya Formal & Legal Registers',
        topicNameTi: 'ናይ ሕግን ወግዓውን ትግርኛ መዝገበ-ቃላት',
        field: 'Tigrinya Linguistics',
        fieldTi: 'ስነ-ልሳን ትግርኛ',
        masteryScore: 90,
        hoursSpent: 2.5,
        keyTakeaway: 'Practiced formal terminology for scholarship statements and research abstracts.',
        keyTakeawayTi: 'ንናይ ስኮላርሺፕ ድርሳናት ዝኸውን ላዕለዋይ ደረጃ ወግዓዊ ቃላት ምጥቃም።',
      },
      {
        id: 'top-5',
        topicName: 'Socratic Differential Calculus & Optimization',
        topicNameTi: 'ናይ ካልኩለስን ዝለዓለ ውጽኢት ምንዳይን ፍልጠት',
        field: 'STEM Mathematics',
        fieldTi: 'ናይ STEM ሒሳብ',
        masteryScore: 94,
        hoursSpent: 2.0,
        keyTakeaway: 'Derived multi-variable gradient descent and loss curve optimizations.',
        keyTakeawayTi: 'ናይ ሒሳባዊ ቀመር ዝደቀቐ ፍታሕን ትንታነን ምስ AI ምፍጻም።',
      },
    ],
    savingsBreakdown: [
      {
        category: 'AI Socratic Tutoring',
        categoryTi: 'ናይ AI መምህር ስልጠና',
        description: '14.8 Hours of personalized 1-on-1 Socratic tutoring (equivalent commercial rate $35/hr)',
        descriptionTi: '14.8 ሰዓት ናይ ውልቂ Socratic መምህር ትምህርቲ',
        savingsUSD: 140.00,
        icon: 'GraduationCap',
      },
      {
        category: 'Document Translation & OCR',
        categoryTi: 'ትርጉም ሰነዳትን OCRን',
        description: '12,400 Words translated & parsed via Axumite Neural Model (vs. agency translation costs)',
        descriptionTi: '12,400 ቃላት ብነጻ ትርጉምን ንባብ ጽሑፍን',
        savingsUSD: 62.00,
        icon: 'Languages',
      },
      {
        category: 'Pro Mining & Wisdom Bonuses',
        categoryTi: 'ማይኒንግን ማሕበረሰብ ዓስብን',
        description: 'Direct earnings mined from Sovereign Pro Click and verified community knowledge shares',
        descriptionTi: 'ብቐጥታ ዝተረኽበ ናይ ቶከን ማይኒንግን ናይ ጥበብ ቦነስን',
        savingsUSD: 23.50,
        icon: 'Gift',
      },
      {
        category: 'Scholarship Application Insights',
        categoryTi: 'ስኮላርሺፕ መወከሲ ፍልጠት',
        description: 'Curated DAAD, Mastercard & Turkiye admission guidance kits and essay review',
        descriptionTi: 'ናይ ስኮላርሺፕ መመልከቲ ሞዴላትን ምኽርን',
        savingsUSD: 20.00,
        icon: 'Sparkles',
      },
    ],
    aiSocraticInsight: {
      summaryEn: 'Outstanding academic momentum! You exhibited exceptional mastery in Ge\'ez grammatical structures and Low-Resource AI models. Your daily consistency rate reached 100% with high engagement in STEM problem solving.',
      summaryTi: 'ንፉዕ ናይ ትምህርቲ ጻዕሪ! ኣብ ናይ ግዕዝ ሰዋስውን ኒውራል ሞዴልን ብሉጽ ውጽኢት ኣመዝጊብኩም ኣለኹም። ናይ መዓልታዊ ልምምድኩም 100% በጺሑ ኣሎ።',
      nextWeekGoalEn: 'Target 16 hours of study, complete the Classical Ge\'ez Intermediate Certificate, and export your next illuminated manuscript.',
      nextWeekGoalTi: 'ንዝመጽእ ሰሙን 16 ሰዓታት ምዕላም፡ ናይ ግዕዝ መካከላይ ምስክር ወረቐት ምውዳእን ሓድሽ ናይ ብራና ጽሕፈት ምፍጣርን ይምከር።',
    },
  };
}

export const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif_weekly_summary_latest',
    titleTi: '📊 ናይ ሰሙን ጸብጻብኩም ተዳልዩ ኣሎ (Weekly Performance & Savings Summary)',
    titleEn: '📊 Your Weekly Summary Report is Ready — Activity, Learning & Savings',
    bodyTi: 'ኣብዚ ዝሓለፈ ሰሙን 14.8 ሰዓታት ተማሂርኩም፡ 7 ኣርእስታት ኣማዕቢልኩም፡ ከምኡውን $245.50 ናይ ትምህርትን ትርጉምን ወጻኢታት ኣድሒንኩም ኣለኹም። ናይ PDF ጸብጻብኩም ኣውርዱ።',
    bodyEn: 'Review your personalized weekly digest: 14.8 study hours logged, 7 topics mastered, and $245.50 in estimated educational and translation savings compiled into a clean exportable PDF.',
    category: 'weekly_summary',
    timestamp: 'ሕጂ • Just now',
    isoDate: new Date().toISOString(),
    read: false,
    urgency: 'important',
    actionLabelTi: 'ናይ ሰሙን ጸብጻብን PDFን ርአ',
    actionLabelEn: 'View Weekly Summary & PDF',
    badgeText: 'Weekly Digest',
    actionType: 'open_weekly_summary',
    targetTab: 'weekly_summary',
    weeklySummary: getMockWeeklySummaryData(),
  },
  {
    id: 'notif_payment_failed_alert',
    titleTi: '⚠️ ናይ ኣባልነት ክፍሊት ኣይተሳኽዐን (Subscription Payment Failed)',
    titleEn: '⚠️ Subscription Payment Failed - Action Required',
    bodyTi: 'ናይ ልዑላዊ AI ፕሮ ኣባልነት ክፍሊትኩም ኣይተሳኽዐን (Card declined or insufficient funds)። ብኽብረትኩም ናብ ክፍሊት ምሕደራ ብምእታው ናይ ካርድ ወይ ናይ ባንክ ሓበሬታኹም ኣሐድሱ።',
    bodyEn: 'Your subscription recurring billing failed to process. Please visit Payment Management to update your billing info and maintain continuous AI Pro privileges.',
    category: 'payment_failed',
    timestamp: 'ቅድሚ 10 ደቒቕ • 10m ago',
    isoDate: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    read: false,
    urgency: 'urgent',
    actionLabelTi: 'ናይ ክፍሊት ሓበሬታ ኣሐድስ',
    actionLabelEn: 'Update Billing Info',
    badgeText: 'Payment Failed',
    actionType: 'open_payment',
    targetTab: 'payment',
    paymentDetails: {
      planName: 'ልዑላዊ AI ፕሮ (Sovereign Pro)',
      amount: 79.99,
      currency: 'USD',
      failureReason: 'Card issuer declined authorization / Insufficient funds.',
      invoiceNumber: 'INV-FAILED-2026',
      last4: '4242',
      paymentMethod: 'Stripe Credit Card (•••• 4242)',
    },
  },
  {
    id: 'notif_scholarship_daad_2026',
    titleTi: '🎓 ሓድሽ ዕድል ስኮላርሺፕ፡ DAAD ጀርመን 2026/27 ምሉእ ብምሉእ ዝተኸፍለ',
    titleEn: '🎓 New Scholarship Opportunity: DAAD Germany 2026/27 Intake Open',
    bodyTi: 'መንግስቲ ጀርመን ንተጋሩን ኣፍሪቃውያንን ተመሃሮ ምሉእ ናጻ ትምህርቲ፡ ናይ ወርሒ ኣበል (€934)፡ ናይ ነፋሪት ቲኬትን ናይ ጥዕና መድሕንን ይህብ ኣሎ።',
    bodyEn: 'German Academic Exchange Service (DAAD) opens fully-funded Master & PhD scholarships for Tigray & Global South scholars with monthly stipend (€934) and travel allowance.',
    category: 'scholarship',
    timestamp: 'ቅድሚ 15 ደቒቕ • 15m ago',
    isoDate: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    read: false,
    urgency: 'urgent',
    scholarshipId: 'daad',
    actionUrl: 'https://www.daad.de/en/',
    actionLabelTi: 'ስኮላርሺፕ ተመልከት',
    actionLabelEn: 'View Scholarship',
    badgeText: 'Closing Soon',
  },
  {
    id: 'notif_sys_update_v4',
    titleTi: '⚙️ ወሳኒ ናይ ስርዓት ምምሕያሽ፡ Axumite AI 4.0 Neural Engine ተዘርጊሑ',
    titleEn: '⚙️ System Update: Axumite AI 4.0 Neural Engine Deployed',
    bodyTi: 'ናይ ትግርኛ ድምጺ ምድላው (Neural TTS) ብ 40% ቅልጣፈ ወሲኹ፡ ናይ ግዕዝ ኪነ-ጽሕፈት ስቱድዮን 4K ድማ ብምሉእ ተኸፊቱ ኣሎ።',
    bodyEn: 'Major system update deployed: Tigrinya Neural Speech latency reduced by 40%, offline cache hit rate boosted, and 4K Ge\'ez Calligraphy Studio activated.',
    category: 'system_update',
    timestamp: 'ቅድሚ 1 ሰዓት • 1h ago',
    isoDate: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    read: false,
    urgency: 'important',
    actionLabelTi: 'ዝርዝር ምምሕያሽ ርአ',
    actionLabelEn: 'View System Status',
    badgeText: 'v4.0 Live',
  },
  {
    id: 'notif_scholarship_mastercard_2026',
    titleTi: '🎓 ማስተርካርድ ፋውንዴሽን፡ ናጻ ናይ ማስተርስ ትምህርቲ ኣብ ካናዳን UKን',
    titleEn: '🎓 Mastercard Foundation Scholars: Full Ride at McGill & Edinburgh',
    bodyTi: 'ናይ ትምህርቲ ክፍሊት፡ መዕረፊ፡ ናይ መነባበሮ ወጻኢታትን ላፕቶፕን ዘጠቓለለ ምሉእ ናጻ ዕድል ትምህርቲ ንመንእሰያት መራሕቲ።',
    bodyEn: 'Comprehensive full-ride funding covering tuition, housing, flights, living stipend, and research mentorship for transformative African leaders.',
    category: 'scholarship',
    timestamp: 'ቅድሚ 3 ሰዓታት • 3h ago',
    isoDate: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    read: false,
    urgency: 'urgent',
    scholarshipId: 'mastercard',
    actionLabelTi: 'ዝርዝር ሓበሬታ ርአ',
    actionLabelEn: 'View Opportunity',
    badgeText: 'Fully Funded',
  },
  {
    id: 'notif_feature_calligraphy_studio',
    titleTi: '🎨 ሓድሽ መሳርሒ፡ ናይ ግዕዝ ኪነ-ጽሕፈት ስቱድዮ ብ 4K ውጽኢት',
    titleEn: '🎨 New Feature Launch: Ge\'ez Calligraphy Studio with 4K Export',
    bodyTi: 'ጥንታዊ ማኅተም ኣክሱም፡ ናይ ብራና ሓረግ ስነ-ጥበብን 4K ፎቶታትን ብቐጥታ ምፍጣርን ምዕቃብን ተኸፊቱ ኣሎ።',
    bodyEn: 'Generate illuminated Birana manuscripts, Axumite talismanic seals, and export ultra-high-resolution 4K Ge\'ez wallpapers directly.',
    category: 'feature',
    timestamp: 'ትማሊ • Yesterday',
    isoDate: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    read: true,
    urgency: 'info',
    actionLabelTi: 'ስቱድዮ ክፈት',
    actionLabelEn: 'Open Studio',
    badgeText: 'New Studio',
  },
  {
    id: 'notif_scholarship_turkiye_2026',
    titleTi: '🎓 ቱርክዬ ቡርስላሪ (Türkiye Bursları) 2026 ምሉእ ስኮላርሺፕ',
    titleEn: '🎓 Turkiye Burslari Government Scholarships 2026',
    bodyTi: 'ናይ ባችለር፡ ማስተርስን ዶክተርነትን ምሉእ ብምሉእ ዝተኸፍለ ናይ ቱርኪ መንግስቲ ስኮላርሺፕ ንዓለምለኸ ተመሃሮ።',
    bodyEn: 'Fully funded scholarship by the Turkish Government covering university placement, tuition, monthly allowance, accommodation, and flights.',
    category: 'scholarship',
    timestamp: 'ቅድሚ 2 መዓልቲ • 2d ago',
    isoDate: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    read: true,
    urgency: 'important',
    scholarshipId: 'turkiye',
    actionLabelTi: 'ስኮላርሺፕ ተመልከት',
    actionLabelEn: 'View Scholarship',
    badgeText: 'Full Grant',
  },
  {
    id: 'notif_security_idle_guard',
    titleTi: '🛡️ ናይ ድሕንነት ሓበሬታ፡ ናይ 30 ደቒቕ ዕረፍቲ ኣውቶማቲክ መከላኸሊ ተተኺሉ',
    titleEn: '🛡️ Security Notice: 30-Minute Idle Auto-Protection Active',
    bodyTi: 'ናይ ሕሳብኩም ድሕንነት ንምሕላው፡ ድሕሪ 30 ደቒቕ ዘይምንቅስቓስ ብውሕስነት ሎግ-ኣውት ዝገብር መከላኸሊ ብዕሊ ተተኺሉ ኣሎ።',
    bodyEn: 'Your account is safeguarded with 30-minute inactivity auto-logout protection and encrypted local session persistence.',
    category: 'security',
    timestamp: 'ቅድሚ 3 መዓልቲ • 3d ago',
    isoDate: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
    read: true,
    urgency: 'info',
    actionLabelTi: 'ናይ ድሕንነት ቅጥዕታት ርአ',
    actionLabelEn: 'Security Settings',
    badgeText: 'Protected',
  },
];

// Play Golden Chime Synthesizer Tone via Web Audio API
export function playGoldenNotificationChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const now = ctx.currentTime;
    const notes = [587.33, 880.00, 1174.66]; // D5, A5, D6 golden chord

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);

      gain.gain.setValueAtTime(0.001, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.12, now + i * 0.08 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.5);
    });
  } catch {
    // Graceful fallback if audio is not permitted by browser
  }
}

// Retrieve stored notifications from localStorage (automatically deduplicated)
export function getStoredNotifications(): AppNotification[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_NOTIFICATIONS);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const deduped = dedupeNotifications(parsed);
        if (deduped.length !== parsed.length) {
          saveStoredNotifications(deduped);
        }
        return deduped;
      }
    }
  } catch (err) {
    console.error('Failed to load notifications from localStorage:', err);
  }
  // Default seed
  const seeded = dedupeNotifications(INITIAL_NOTIFICATIONS);
  saveStoredNotifications(seeded);
  return seeded;
}

// Save notifications to localStorage (deduplicated & dirty-checked)
export function saveStoredNotifications(notifs: AppNotification[]): void {
  try {
    const deduped = dedupeNotifications(notifs);
    safeWriteLocalStorage(STORAGE_KEY_NOTIFICATIONS, deduped);
  } catch (err) {
    console.error('Failed to save notifications to localStorage:', err);
  }
}

// Retrieve notification preferences
export function getStoredPreferences(): NotificationPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_PREFS);
    if (stored) {
      return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...JSON.parse(stored) };
    }
  } catch {
    // Ignore error
  }
  return DEFAULT_NOTIFICATION_PREFERENCES;
}

// Save notification preferences
export function saveStoredPreferences(prefs: NotificationPreferences): void {
  try {
    safeWriteLocalStorage(STORAGE_KEY_PREFS, prefs);
  } catch (err) {
    console.error('Failed to save notification preferences:', err);
  }
}

// Check Browser Push Permission Status
export function getBrowserPushPermissionStatus(): 'default' | 'granted' | 'denied' | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

// Request Browser Push Permission
export async function requestBrowserPushPermission(): Promise<'granted' | 'denied' | 'default' | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.error('Failed to request notification permission:', err);
    return 'denied';
  }
}

// Speak notification aloud localized in Tigrinya using Neural Speech Synthesis
export function speakNotificationInTigrinya(
  notif: AppNotification,
  dialect: 'ti' | 'ti_tg' | 'en' | 'de' | 'bilingual' = 'ti'
): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  try {
    window.speechSynthesis.cancel();

    const isTigrinya = dialect === 'ti' || dialect === 'ti_tg' || dialect === 'bilingual';
    const textToSpeak = isTigrinya
      ? `${notif.titleTi}። ${notif.bodyTi}`
      : `${notif.titleEn}. ${notif.bodyEn}`;

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = dialect === 'ti_tg' ? 'ti-ET' : isTigrinya ? 'ti-ER' : dialect === 'de' ? 'de-DE' : 'en-US';
    utterance.rate = 0.95;
    utterance.pitch = 1.05;

    const voices = window.speechSynthesis.getVoices();
    if (isTigrinya) {
      const hornVoice = voices.find(
        (v) =>
          v.lang.startsWith('ti') ||
          v.lang.startsWith('am') ||
          v.name.toLowerCase().includes('tigrinya') ||
          v.name.toLowerCase().includes('amharic') ||
          v.name.toLowerCase().includes('ethiopia') ||
          v.name.toLowerCase().includes('eritrea')
      );
      if (hornVoice) {
        utterance.voice = hornVoice;
      }
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Speech synthesis for notification failed:', err);
  }
}

// Speak any custom system audio response localized in Tigrinya
export function speakCustomTigrinyaAudio(
  message: string,
  dialect: 'ti' | 'ti_tg' | 'en' | 'de' | 'bilingual' = 'ti'
): void {
  if (typeof window === 'undefined' || !window.speechSynthesis || !message) return;

  try {
    window.speechSynthesis.cancel();
    const isTigrinya = dialect === 'ti' || dialect === 'ti_tg' || dialect === 'bilingual';
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = dialect === 'ti_tg' ? 'ti-ET' : isTigrinya ? 'ti-ER' : dialect === 'de' ? 'de-DE' : 'en-US';
    utterance.rate = 0.95;
    utterance.pitch = 1.05;

    const voices = window.speechSynthesis.getVoices();
    if (isTigrinya) {
      const hornVoice = voices.find(
        (v) =>
          v.lang.startsWith('ti') ||
          v.lang.startsWith('am') ||
          v.name.toLowerCase().includes('tigrinya') ||
          v.name.toLowerCase().includes('amharic') ||
          v.name.toLowerCase().includes('ethiopia') ||
          v.name.toLowerCase().includes('eritrea')
      );
      if (hornVoice) {
        utterance.voice = hornVoice;
      }
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Speech synthesis for system message failed:', err);
  }
}

// Trigger Web Push Notification if browser permission granted
export function triggerBrowserPushNotification(
  notif: AppNotification,
  language: 'ti' | 'ti_tg' | 'en' | 'de' | 'bilingual' = 'ti'
): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission !== 'granted') {
    return false;
  }

  try {
    const isTigrinya = language === 'ti' || language === 'ti_tg' || language === 'bilingual';
    const title = isTigrinya ? notif.titleTi : notif.titleEn;
    const body = isTigrinya ? notif.bodyTi : notif.bodyEn;

    const pushNotif = new Notification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: notif.id,
      data: {
        id: notif.id,
        category: notif.category,
        scholarshipId: notif.scholarshipId,
        actionUrl: notif.actionUrl,
        targetTab: notif.targetTab,
      },
    });

    pushNotif.onclick = () => {
      window.focus();
      if (notif.actionUrl) {
        window.open(notif.actionUrl, '_blank');
      }
      pushNotif.close();
    };

    return true;
  } catch (err) {
    console.error('Error triggering web push notification:', err);
    return false;
  }
}

// Create a structured payment failed notification
export function createPaymentFailedNotification(params?: {
  planName?: string;
  amount?: number;
  currency?: string;
  failureReason?: string;
  invoiceNumber?: string;
  last4?: string;
  paymentMethod?: string;
}): AppNotification {
  const plan = params?.planName || 'ልዑላዊ AI ፕሮ (Sovereign Pro)';
  const amount = params?.amount !== undefined ? params.amount : 79.99;
  const currency = params?.currency || 'USD';
  const reason = params?.failureReason || 'Card declined or insufficient funds.';
  const last4 = params?.last4 || '4242';
  const method = params?.paymentMethod || `Card ending in •••• ${last4}`;
  const invNumber = params?.invoiceNumber || `INV-FAIL-${Date.now().toString().slice(-6)}`;

  return {
    id: `notif_pay_fail_${Date.now()}`,
    titleTi: '⚠️ ናይ ኣባልነት ክፍሊት ኣይተሳኽዐን (Subscription Payment Failed)',
    titleEn: '⚠️ Subscription Payment Failed - Action Required',
    bodyTi: `ናይ ${plan} (${currency} ${amount}) ክፍሊትኩም ኣይተሳኽዐን [${reason}]። በጃኹም ናብ ክፍሊት ምሕደራ ብምኻድ ናይ ክፍሊት ሓበሬታኹም ኣሐድሱ።`,
    bodyEn: `Your payment of ${currency} ${amount} for ${plan} failed (${reason}). Please update your billing method to prevent interruption of your Sovereign Pro benefits.`,
    category: 'payment_failed',
    timestamp: 'ሕጂ • Just now',
    isoDate: new Date().toISOString(),
    read: false,
    urgency: 'urgent',
    actionLabelTi: 'ናይ ክፍሊት ሓበሬታ ኣሐድስ',
    actionLabelEn: 'Update Billing Info',
    badgeText: 'Payment Action Required',
    actionType: 'open_payment',
    targetTab: 'payment',
    paymentDetails: {
      planName: plan,
      amount,
      currency,
      failureReason: reason,
      invoiceNumber: invNumber,
      last4,
      paymentMethod: method,
    },
  };
}

// Dispatch an in-app notification across active components and persistence
export function dispatchAppNotification(
  notif: AppNotification,
  options?: { speakAudio?: boolean; lang?: 'ti' | 'ti_tg' | 'en' | 'de' | 'bilingual' }
): void {
  // Prevent duplicate burst dispatches of the same notification within 3 seconds
  const burstKey = `${notif.category}|${normalizeTextKey(notif.titleEn || notif.titleTi)}|${normalizeTextKey(notif.bodyEn || notif.bodyTi).slice(0, 180)}`;
  const now = Date.now();
  const lastDispatchedAt = recentNotificationDispatchMap.get(burstKey);
  if (lastDispatchedAt && now - lastDispatchedAt < 3000) {
    return;
  }
  recentNotificationDispatchMap.set(burstKey, now);

  // 1. Store in localStorage (deduplicated)
  const existing = getStoredNotifications();
  const updated = dedupeNotifications([notif, ...existing]);
  saveStoredNotifications(updated);

  // 2. Play audio chime if enabled
  const prefs = getStoredPreferences();
  if (prefs.enableAudioChime) {
    playGoldenNotificationChime();
  }

  const activeLang = options?.lang || prefs.preferredLanguage || 'ti';

  // 3. Trigger Web Push if enabled
  if (prefs.enableWebPush) {
    triggerBrowserPushNotification(notif, activeLang);
  }

  // 4. Optionally speak audio in Tigrinya
  if (options?.speakAudio || (prefs.enableAudioChime && notif.urgency === 'urgent')) {
    speakNotificationInTigrinya(notif, activeLang);
  }

  // 5. Dispatch custom DOM event for active UI components
  if (typeof window !== 'undefined') {
    const event = new CustomEvent(NOTIFICATION_EVENT_NAME, { detail: notif });
    window.dispatchEvent(event);
  }
}

// Trigger payment failure alert
export function triggerPaymentFailedAlert(params?: {
  planName?: string;
  amount?: number;
  currency?: string;
  failureReason?: string;
  invoiceNumber?: string;
  last4?: string;
  paymentMethod?: string;
}): AppNotification {
  const notif = createPaymentFailedNotification(params);
  dispatchAppNotification(notif);
  return notif;
}

// Create a structured churn rate threshold breach alert notification
export function createChurnAlertNotification(params: {
  churnRate: number;
  threshold: number;
  period?: string;
  lostMRR?: number;
  affectedSubscribers?: number;
}): AppNotification {
  const rate = Number(params.churnRate.toFixed(1));
  const threshold = Number(params.threshold.toFixed(1));
  const period = params.period || 'Last 30 Days (Current Cycle)';
  const lostMRR = params.lostMRR !== undefined ? params.lostMRR : Math.round(rate * 145);
  const affected = params.affectedSubscribers !== undefined ? params.affectedSubscribers : Math.round(rate * 3.5);

  return {
    id: `notif_churn_alert_${Date.now()}`,
    titleTi: `⚠️ መጠንቀቕታ ምቁራጽ ኣባልነት (Churn Rate Alert: ${rate}%)`,
    titleEn: `⚠️ Subscription Churn Alert: ${rate}% (Threshold: ${threshold}%)`,
    bodyTi: `ናይ መድረኽ ተጠቃሚ ምቁራጽ ወይ ስረዛ (Churn Rate) ናብ ${rate}% በጺሑ ካብቲ ዝተመደበ ደረት (${threshold}%) በሊጹ ኣሎ። ግምታዊ ዝጎደለ ወርሓዊ እቶት (Lost MRR): $${lostMRR} (${affected} ኣባላት)።`,
    bodyEn: `Subscription churn rate has climbed to ${rate}%, surpassing your configured safety ceiling of ${threshold}% for ${period}. Estimated MRR impact: -$${lostMRR}/mo across ${affected} cancelled accounts.`,
    category: 'churn_alert',
    timestamp: 'ሕጂ • Just now',
    isoDate: new Date().toISOString(),
    read: false,
    urgency: 'urgent',
    actionLabelTi: 'ናይ MRR/Churn ሰሌዳ ርአ',
    actionLabelEn: 'View MRR & Churn Analytics',
    badgeText: `Churn ${rate}% > ${threshold}%`,
    actionType: 'open_admin_metrics',
    targetTab: 'payment-management',
    churnDetails: {
      churnRate: rate,
      threshold,
      period,
      lostMRR,
      affectedSubscribers: affected,
    },
  };
}

// Trigger and dispatch churn rate threshold alert
export function triggerChurnAlert(params: {
  churnRate: number;
  threshold: number;
  period?: string;
  lostMRR?: number;
  affectedSubscribers?: number;
}): AppNotification {
  const notif = createChurnAlertNotification(params);
  dispatchAppNotification(notif, { speakAudio: false });
  return notif;
}

// Create Weekly Summary Notification
export function createWeeklySummaryNotification(
  user?: Partial<UserProfile>,
  customData?: Partial<WeeklySummaryData>
): AppNotification {
  const baseData = getMockWeeklySummaryData(user);
  const data: WeeklySummaryData = {
    ...baseData,
    ...customData,
  };

  return {
    id: `notif_weekly_summary_${Date.now()}`,
    titleTi: '📊 ናይ ሰሙን ጸብጻብኩም ተዳልዩ ኣሎ (Weekly Performance & Savings Summary)',
    titleEn: `📊 Weekly Performance & Savings Report (${data.startDate} – ${data.endDate})`,
    bodyTi: `ኣብዚ ዝሓለፈ ሰሙን ${data.totalStudyHours} ሰዓታት ተማሂርኩም፡ ${data.topicsLearnedCount} ኣርእስታት ኣማዕቢልኩም፡ ከምኡውን $${data.totalSavingsUSD.toFixed(2)} ናይ ትምህርትን ትርጉምን ወጻኢታት ኣድሒንኩም ኣለኹም። ናይ PDF ጸብጻብኩም ኣውርዱ።`,
    bodyEn: `Your weekly intelligence summary is ready: ${data.totalStudyHours} hrs logged across ${data.topicsLearnedCount} topics, with $${data.totalSavingsUSD.toFixed(2)} estimated savings. Export the certified PDF report anytime.`,
    category: 'weekly_summary',
    timestamp: 'ሕጂ • Just now',
    isoDate: new Date().toISOString(),
    read: false,
    urgency: 'important',
    actionLabelTi: 'ናይ ሰሙን ጸብጻብን PDFን ርአ',
    actionLabelEn: 'View Weekly Summary & PDF',
    badgeText: 'Weekly Report',
    actionType: 'open_weekly_summary',
    targetTab: 'weekly_summary',
    weeklySummary: data,
  };
}

// Trigger and dispatch Weekly Summary Notification
export function triggerWeeklySummaryNotification(
  user?: Partial<UserProfile>,
  customData?: Partial<WeeklySummaryData>
): AppNotification {
  const notif = createWeeklySummaryNotification(user, customData);
  dispatchAppNotification(notif);
  return notif;
}


