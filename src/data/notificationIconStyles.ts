export interface NotificationIconStyleOption {
  id: string;
  name: string;
  nameTi: string;
  iconName: 'Sparkles' | 'Cpu' | 'Scroll' | 'Landmark' | 'PenTool' | 'Wallet' | 'Coins' | 'Send' | 'Lock' | 'Crown' | 'BookOpen' | 'Music' | 'Shield' | 'Fingerprint' | 'Activity' | 'Award' | 'Flame' | 'Radio';
  drawableName: string;
  accentColor: string;
  badgeBg: string;
  badgeBorder: string;
  badgeTextColor: string;
  previewEmoji: string;
  description: string;
}

export interface NotificationCategoryConfig {
  id: string;
  name: string;
  nameTi: string;
  iconEmoji: string;
  description: string;
  defaultStyleId: string;
  styles: NotificationIconStyleOption[];
}

export type CategoryIconStyleMap = Record<string, string>;

export const NOTIFICATION_CATEGORIES: NotificationCategoryConfig[] = [
  {
    id: 'ai_chat',
    name: 'Obelisk AI Assistant & Chat',
    nameTi: 'ኦበሊስክ AI ረዳእን ዝርርብን',
    iconEmoji: '⚡',
    description: 'Inference completions, voice prompt replies, and conversational intelligence alerts.',
    defaultStyleId: 'imperial_obelisk',
    styles: [
      {
        id: 'imperial_obelisk',
        name: 'Imperial Gold Obelisk',
        nameTi: 'ወርቃዊ ናይ ኣክሱም ሓወልቲ',
        iconName: 'Sparkles',
        drawableName: 'ic_stat_onesignal_obelisk_gold',
        accentColor: '#C5A059',
        badgeBg: 'bg-amber-500/20',
        badgeBorder: 'border-amber-500/40',
        badgeTextColor: 'text-amber-300',
        previewEmoji: '🏆',
        description: 'Classical Aksumite monumental obelisk emblem rendered in imperial gold.'
      },
      {
        id: 'cyan_neural',
        name: 'Cyan Neural Core',
        nameTi: 'ሳይያን ኒውራል ሞተር',
        iconName: 'Cpu',
        drawableName: 'ic_stat_onesignal_neural_cyan',
        accentColor: '#06B6D4',
        badgeBg: 'bg-cyan-500/20',
        badgeBorder: 'border-cyan-500/40',
        badgeTextColor: 'text-cyan-300',
        previewEmoji: '⚡',
        description: 'Futuristic high-performance AI inference node with glowing cyan accents.'
      },
      {
        id: 'emerald_spark',
        name: 'Emerald Intelligence',
        nameTi: 'ኤመራልድ ልቦናን ጥበብን',
        iconName: 'Flame',
        drawableName: 'ic_stat_onesignal_spark_emerald',
        accentColor: '#10B981',
        badgeBg: 'bg-emerald-500/20',
        badgeBorder: 'border-emerald-500/40',
        badgeTextColor: 'text-emerald-300',
        previewEmoji: '✨',
        description: 'Vibrant emerald spark indicating sovereign AI completion and learning.'
      },
      {
        id: 'purple_oracle',
        name: 'Sovereign Oracle',
        nameTi: 'ኦራክል መለኮታዊ ጥበብ',
        iconName: 'Radio',
        drawableName: 'ic_stat_onesignal_oracle_purple',
        accentColor: '#8B5CF6',
        badgeBg: 'bg-purple-500/20',
        badgeBorder: 'border-purple-500/40',
        badgeTextColor: 'text-purple-300',
        previewEmoji: '🔮',
        description: 'Royal purple mystic oracle insignia for deep reasoning outputs.'
      }
    ]
  },
  {
    id: 'geez_ocr',
    name: "Ge'ez Manuscript & OCR Scanner",
    nameTi: 'ግእዝ ቅርስን መመርመሪ ካመራን',
    iconEmoji: '📜',
    description: 'Ancient inscription recognition, manuscript archiving, and Ge\'ez OCR translations.',
    defaultStyleId: 'ancient_scroll',
    styles: [
      {
        id: 'ancient_scroll',
        name: 'Ancient Parchment Scroll',
        nameTi: 'ጥንታዊ ናይ ቆርበት ብራና',
        iconName: 'Scroll',
        drawableName: 'ic_stat_onesignal_scroll_parchment',
        accentColor: '#D97706',
        badgeBg: 'bg-amber-600/20',
        badgeBorder: 'border-amber-600/40',
        badgeTextColor: 'text-amber-400',
        previewEmoji: '📜',
        description: 'Authentic calfskin parchment scroll with ancient Ge\'ez calligraphy.'
      },
      {
        id: 'stone_stela',
        name: 'Ezana Monument Stela',
        nameTi: 'ናይ ዕዛና ጽሑፍ ሓወልቲ',
        iconName: 'Landmark',
        drawableName: 'ic_stat_onesignal_stela_stone',
        accentColor: '#94A3B8',
        badgeBg: 'bg-slate-500/20',
        badgeBorder: 'border-slate-500/40',
        badgeTextColor: 'text-slate-300',
        previewEmoji: '🏛️',
        description: 'Chiseled trilingual stone stela honoring King Ezana\'s inscriptions.'
      },
      {
        id: 'quill_script',
        name: 'Royal Scribe Quill',
        nameTi: 'ናይ ቤተ-መንግሥቲ ብርዒ',
        iconName: 'PenTool',
        drawableName: 'ic_stat_onesignal_scribe_quill',
        accentColor: '#EAB308',
        badgeBg: 'bg-yellow-500/20',
        badgeBorder: 'border-yellow-500/40',
        badgeTextColor: 'text-yellow-300',
        previewEmoji: '✒️',
        description: 'Golden ink reed quill used by monastery scribes for sacred codices.'
      },
      {
        id: 'gold_tablet',
        name: 'Imperial Gold Tablet',
        nameTi: 'ወርቃዊ ንጉሣዊ ሰሌዳ',
        iconName: 'Coins',
        drawableName: 'ic_stat_onesignal_tablet_gold',
        accentColor: '#F59E0B',
        badgeBg: 'bg-amber-500/20',
        badgeBorder: 'border-amber-500/40',
        badgeTextColor: 'text-amber-200',
        previewEmoji: '🪙',
        description: 'Embossed gold tablet inscribed with early Ge\'ez vocalized abugida.'
      }
    ]
  },
  {
    id: 'telebirr_finance',
    name: 'Telebirr & Financial Vault',
    nameTi: 'ቴሌብርን ባንኪ ዋሌትን',
    iconEmoji: '💳',
    description: 'Instant mobile payments, merchant transfers, CBE Birr integrations, and receipts.',
    defaultStyleId: 'telebirr_vault',
    styles: [
      {
        id: 'telebirr_vault',
        name: 'Telebirr Digital Vault',
        nameTi: 'ቴሌብር ዲጂታል ካዝና',
        iconName: 'Wallet',
        drawableName: 'ic_stat_onesignal_vault_telebirr',
        accentColor: '#2563EB',
        badgeBg: 'bg-blue-500/20',
        badgeBorder: 'border-blue-500/40',
        badgeTextColor: 'text-blue-300',
        previewEmoji: '💳',
        description: 'Telebirr signature blue fintech wallet with real-time balance tracker.'
      },
      {
        id: 'axum_coin',
        name: 'Axumite Gold Coin',
        nameTi: 'ጥንታዊ ቅርሺ ኣክሱም',
        iconName: 'Coins',
        drawableName: 'ic_stat_onesignal_coin_axum',
        accentColor: '#EAB308',
        badgeBg: 'bg-yellow-500/20',
        badgeBorder: 'border-yellow-500/40',
        badgeTextColor: 'text-yellow-300',
        previewEmoji: '🪙',
        description: 'Historic Endubis gold solidus minted in Aksum, representing sovereign wealth.'
      },
      {
        id: 'emerald_transfer',
        name: 'Instant Emerald Pay',
        nameTi: 'ቅልጡፍ ናይ ብር ምስግጋር',
        iconName: 'Send',
        drawableName: 'ic_stat_onesignal_transfer_emerald',
        accentColor: '#059669',
        badgeBg: 'bg-emerald-600/20',
        badgeBorder: 'border-emerald-600/40',
        badgeTextColor: 'text-emerald-300',
        previewEmoji: '💸',
        description: 'Dynamic green transfer arrow signifying successful instant payment.'
      },
      {
        id: 'secure_strongbox',
        name: 'StrongBox TEE Encrypted',
        nameTi: 'ብሃርድዌር ዝተዓቀበ ክፍሊት',
        iconName: 'Lock',
        drawableName: 'ic_stat_onesignal_pay_locked',
        accentColor: '#6366F1',
        badgeBg: 'bg-indigo-500/20',
        badgeBorder: 'border-indigo-500/40',
        badgeTextColor: 'text-indigo-300',
        previewEmoji: '🔒',
        description: 'Hardware-backed TEE padlock indicating cryptographically signed settlement.'
      }
    ]
  },
  {
    id: 'cultural_heritage',
    name: 'Cultural Heritage & Lexicon',
    nameTi: 'ባህላዊ ቅርሲ፡ ምሳሌታትን መዝገበ-ቃላትን',
    iconEmoji: '👑',
    description: 'Proverbs of the day, Tigrinya linguistic roots, poetry recitals, and music archives.',
    defaultStyleId: 'royal_crown',
    styles: [
      {
        id: 'royal_crown',
        name: 'Imperial Ethiopian Crown',
        nameTi: 'ንጉሣዊ ዘውዲ ኢትዮጵያ',
        iconName: 'Crown',
        drawableName: 'ic_stat_onesignal_crown_royal',
        accentColor: '#FBBF24',
        badgeBg: 'bg-amber-400/20',
        badgeBorder: 'border-amber-400/40',
        badgeTextColor: 'text-amber-300',
        previewEmoji: '👑',
        description: 'Filigree golden crown symbolizing millenia of continuous civilization.'
      },
      {
        id: 'lion_crest',
        name: 'Lion of Judah Crest',
        nameTi: 'ኣርማ ኣንበሳ ዘእምነገደ ይሁዳ',
        iconName: 'Award',
        drawableName: 'ic_stat_onesignal_lion_crest',
        accentColor: '#F59E0B',
        badgeBg: 'bg-amber-500/20',
        badgeBorder: 'border-amber-500/40',
        badgeTextColor: 'text-amber-200',
        previewEmoji: '🦁',
        description: 'Imperial Lion of Judah heraldic crest holding the national pennant.'
      },
      {
        id: 'heritage_codex',
        name: 'Leatherbound Kebr Nagast',
        nameTi: 'ክብረ ነገሥት ብራና',
        iconName: 'BookOpen',
        drawableName: 'ic_stat_onesignal_codex_heritage',
        accentColor: '#B45309',
        badgeBg: 'bg-amber-700/20',
        badgeBorder: 'border-amber-700/40',
        badgeTextColor: 'text-amber-300',
        previewEmoji: '📖',
        description: 'Bound illuminated codex representing the Glory of Kings and heritage texts.'
      },
      {
        id: 'traditional_drum',
        name: 'Kebero Drum & Sistrum',
        nameTi: 'ከበሮን ጸናጽልን',
        iconName: 'Music',
        drawableName: 'ic_stat_onesignal_drum_kebero',
        accentColor: '#EA580C',
        badgeBg: 'bg-orange-600/20',
        badgeBorder: 'border-orange-600/40',
        badgeTextColor: 'text-orange-300',
        previewEmoji: '🥁',
        description: 'Traditional ceremonial Kebero drum and brass Sistrum for cultural broadcasts.'
      }
    ]
  },
  {
    id: 'security_system',
    name: 'Security & System Diagnostics',
    nameTi: 'ድሕንነትን ቴክኒካዊ ሓበሬታን',
    iconEmoji: '🛡️',
    description: 'Biometric authorization, KeyStore integrity, offline cache status, and network health.',
    defaultStyleId: 'sovereign_shield',
    styles: [
      {
        id: 'sovereign_shield',
        name: 'Sovereign Armor Shield',
        nameTi: 'ናይ ኣክሱም ዋልታ ድሕንነት',
        iconName: 'Shield',
        drawableName: 'ic_stat_onesignal_shield_gold',
        accentColor: '#D97706',
        badgeBg: 'bg-amber-600/20',
        badgeBorder: 'border-amber-600/40',
        badgeTextColor: 'text-amber-300',
        previewEmoji: '🛡️',
        description: 'Reinforced bronze and gold warrior shield guarding local keys.'
      },
      {
        id: 'biometric_key',
        name: 'Biometric StrongBox',
        nameTi: 'ባዮሜትሪክ መፍትሕ',
        iconName: 'Fingerprint',
        drawableName: 'ic_stat_onesignal_bio_fingerprint',
        accentColor: '#0D9488',
        badgeBg: 'bg-teal-600/20',
        badgeBorder: 'border-teal-600/40',
        badgeTextColor: 'text-teal-300',
        previewEmoji: '👆',
        description: 'Android 15 Class 3 BiometricPrompt verification key sensor.'
      },
      {
        id: 'pulse_heartbeat',
        name: 'Neural Pulse Monitor',
        nameTi: 'ናይ ሲስተም ህርመት',
        iconName: 'Activity',
        drawableName: 'ic_stat_onesignal_pulse_neural',
        accentColor: '#E11D48',
        badgeBg: 'bg-rose-600/20',
        badgeBorder: 'border-rose-600/40',
        badgeTextColor: 'text-rose-300',
        previewEmoji: '💓',
        description: 'Real-time telemetry pulse heartbeat tracking system diagnostics.'
      },
      {
        id: 'verified_seal',
        name: 'Imperial Seal of Authenticity',
        nameTi: 'ንጉሣዊ ናይ ምእማን ማሕተም',
        iconName: 'Award',
        drawableName: 'ic_stat_onesignal_seal_verified',
        accentColor: '#16A34A',
        badgeBg: 'bg-green-600/20',
        badgeBorder: 'border-green-600/40',
        badgeTextColor: 'text-green-300',
        previewEmoji: '🎖️',
        description: 'Certified cryptographic root-of-trust sovereign verification stamp.'
      }
    ]
  }
];

export const STORAGE_KEY_NOTIFICATION_ICONS = 'axumite_onesignal_icon_styles';

export const getDefaultNotificationStyles = (): CategoryIconStyleMap => {
  const defaults: CategoryIconStyleMap = {};
  NOTIFICATION_CATEGORIES.forEach(cat => {
    defaults[cat.id] = cat.defaultStyleId;
  });
  return defaults;
};

export const loadSavedNotificationStyles = (): CategoryIconStyleMap => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_NOTIFICATION_ICONS);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...getDefaultNotificationStyles(), ...parsed };
    }
  } catch (e) {
    console.warn('Failed to parse saved notification icon styles:', e);
  }
  return getDefaultNotificationStyles();
};

export const saveNotificationStyles = (styles: CategoryIconStyleMap): void => {
  try {
    localStorage.setItem(STORAGE_KEY_NOTIFICATION_ICONS, JSON.stringify(styles));
  } catch (e) {
    console.warn('Failed to save notification icon styles to localStorage:', e);
  }
};

export const getSelectedStyleForCategory = (
  categoryId: string,
  currentStyles: CategoryIconStyleMap
): NotificationIconStyleOption => {
  const category = NOTIFICATION_CATEGORIES.find(c => c.id === categoryId);
  const selectedStyleId = currentStyles[categoryId] || category?.defaultStyleId;
  const style = category?.styles.find(s => s.id === selectedStyleId);
  return style || category?.styles[0] || NOTIFICATION_CATEGORIES[0].styles[0];
};
