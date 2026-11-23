export interface OfflineLexiconEntry {
  en: string;
  ti: string;
  am?: string;
  de?: string;
  ar?: string;
  fr?: string;
  es?: string;
  it?: string;
  pt?: string;
  zh?: string;
  gez?: string;
  kun?: string;
  irob?: string;
  category: 'greeting' | 'travel' | 'medical' | 'emergency' | 'business' | 'numbers' | 'everyday';
  phoneticTi?: string;
}

export interface OfflinePackMetadata {
  code: string;
  name: string;
  nativeName: string;
  version: string;
  coverageTier: 'full-neural' | 'community-validated';
  entryCount: number;
  estimatedBytes: number;
  checksum: string;
}

export const OFFLINE_LEXICON_ENTRIES: OfflineLexiconEntry[] = [
  // Greetings & Everyday
  { en: 'hello', ti: 'ሰላም', am: 'ሰላም', de: 'hallo', ar: 'مرحبا', fr: 'bonjour', es: 'hola', it: 'ciao', pt: 'olá', zh: '你好', gez: 'ሰላም', kun: 'naako', irob: 'nagaya', category: 'greeting', phoneticTi: 'selam' },
  { en: 'good morning', ti: 'ከመይ ሓዲርኩም', am: 'እንደምን አደሩ', de: 'guten morgen', ar: 'صباح الخير', fr: 'bonjour', es: 'buenos días', it: 'buongiorno', pt: 'bom dia', zh: '早上好', gez: 'ሰላም ለክሙ', kun: 'abina naako', irob: 'maaci gura', category: 'greeting', phoneticTi: 'kemey hadirkum' },
  { en: 'good evening', ti: 'ከመይ ኣምሲኹም', am: 'እንደምን አመሹ', de: 'guten abend', ar: 'مساء الخير', fr: 'bonsoir', es: 'buenas noches', it: 'buonasera', pt: 'boa noite', zh: '晚上好', gez: 'ምሴት ሰላም', kun: 'kasha naako', irob: 'kassi nagaya', category: 'greeting', phoneticTi: 'kemey amsikum' },
  { en: 'how are you', ti: 'ከመይ ኣለኻ', am: 'እንደምን ነህ', de: 'wie geht es dir', ar: 'كيف حالك', fr: 'comment allez-vous', es: 'cómo estás', it: 'come stai', pt: 'como vai você', zh: '你好吗', gez: 'እፎ ሀሎከ', kun: 'naako nake', irob: 'maacin haddo', category: 'greeting', phoneticTi: 'kemey alekha' },
  { en: 'i am fine', ti: 'ጽቡቕ ኣለኹ', am: 'ደህና ነኝ', de: 'mir geht es gut', ar: 'أنا بخير', fr: 'je vais bien', es: 'estoy bien', it: 'sto bene', pt: 'estou bem', zh: '我很好', gez: 'በሰላም ሀሎኩ', kun: 'naako abiya', irob: 'mece haddo', category: 'greeting', phoneticTi: 'tsubuq alekhu' },
  { en: 'thank you', ti: 'የቐንየለይ', am: 'አመሰግናለሁ', de: 'danke', ar: 'شكرا', fr: 'merci', es: 'gracias', it: 'grazie', pt: 'obrigado', zh: '谢谢', gez: 'አእኵተከ', kun: 'shukriya / kaba', irob: 'gadda gey', category: 'greeting', phoneticTi: 'yeqenyeley' },
  { en: 'please', ti: 'በጃኻ', am: 'እባክህ', de: 'bitte', ar: 'من فضلك', fr: "s'il vous plaît", es: 'por favor', it: 'per favore', pt: 'por favor', zh: '请', gez: 'ስምዐኒ', kun: 'fada', irob: 'ayyo', category: 'greeting', phoneticTi: 'bejakha' },
  { en: 'yes', ti: 'እወ', am: 'አዎ', de: 'ja', ar: 'نعم', fr: 'oui', es: 'sí', it: 'sì', pt: 'sim', zh: '是', gez: 'እወ', kun: 'iya', irob: 'yeey', category: 'everyday', phoneticTi: 'ewe' },
  { en: 'no', ti: 'ኣይፋል', am: 'አይ', de: 'nein', ar: 'لا', fr: 'non', es: 'no', it: 'no', pt: 'não', zh: '不', gez: 'አልቦ', kun: 'malla', irob: 'male', category: 'everyday', phoneticTi: 'ayfal' },
  { en: 'excuse me', ti: 'ይቕሬታ', am: 'ይቅርታ', de: 'entschuldigung', ar: 'عذرا', fr: 'excusez-moi', es: 'disculpe', it: 'mi scusi', pt: 'com licença', zh: '打扰一下', gez: 'ስርየት', kun: 'afara', irob: 'afuw', category: 'greeting', phoneticTi: 'yiqreta' },
  { en: 'goodbye', ti: 'ደሓን ኩን', am: 'ደህና ሁን', de: 'auf wiedersehen', ar: 'مع السلامة', fr: 'au revoir', es: 'adiós', it: 'arrivederci', pt: 'adeus', zh: '再见', gez: 'ሑር በሰላም', kun: 'naako ko', irob: 'nagaya gex', category: 'greeting', phoneticTi: 'dehan kun' },
  { en: 'welcome', ti: 'እንቋዕ ብደሓን መጻእኩም', am: 'እንኳን ደህና መጡ', de: 'willkommen', ar: 'أهلا وسهلا', fr: 'bienvenue', es: 'bienvenido', it: 'benvenuto', pt: 'bem-vindo', zh: '欢迎', gez: 'ቡሩክ ምጽአት', kun: 'naako mata', irob: 'nagaya temeete', category: 'greeting', phoneticTi: 'enqua bdehan metsakum' },

  // Travel & Directions
  { en: 'where is', ti: 'ኣበይ ኣሎ', am: 'የት ነው', de: 'wo ist', ar: 'أين هو', fr: 'où est', es: 'dónde está', it: 'dov’è', pt: 'onde está', zh: '在哪里', gez: 'አይቴ ሀሎ', kun: 'aana kishke', irob: 'alle yan', category: 'travel', phoneticTi: 'abey alo' },
  { en: 'airport', ti: 'መዓርፎ ነፈርቲ', am: 'አየር ማረፊያ', de: 'flughafen', ar: 'مطار', fr: 'aéroport', es: 'aeropuerto', it: 'aeroporto', pt: 'aeroporto', zh: '机场', gez: 'ምዕራፍ', kun: 'eroport', irob: 'arport', category: 'travel', phoneticTi: 'mearfo neferti' },
  { en: 'hotel', ti: 'ሆቴል', am: 'ሆቴል', de: 'hotel', ar: 'فندق', fr: 'hôtel', es: 'hotel', it: 'albergo', pt: 'hotel', zh: '酒店', gez: 'ማኅደር', kun: 'hotel', irob: 'hotel', category: 'travel', phoneticTi: 'hotel' },
  { en: 'water', ti: 'ማይ', am: 'ውሃ', de: 'wasser', ar: 'ماء', fr: 'eau', es: 'agua', it: 'acqua', pt: 'água', zh: '水', gez: 'ማይ', kun: 'bia', irob: 'lay', category: 'everyday', phoneticTi: 'may' },
  { en: 'food', ti: 'መግቢ', am: 'ምግብ', de: 'essen', ar: 'طعام', fr: 'nourriture', es: 'comida', it: 'cibo', pt: 'comida', zh: '食物', gez: 'መብልዕ', kun: 'itina', irob: 'maa', category: 'everyday', phoneticTi: 'megbi' },
  { en: 'coffee', ti: 'ቡን', am: 'ቡና', de: 'kaffee', ar: 'قهوة', fr: 'café', es: 'café', it: 'caffè', pt: 'café', zh: '咖啡', gez: 'ቡን', kun: 'buna', irob: 'buna', category: 'everyday', phoneticTi: 'bun' },
  { en: 'bread', ti: 'ባኒ', am: 'ዳቦ', de: 'brot', ar: 'خبز', fr: 'pain', es: 'pan', it: 'pane', pt: 'pão', zh: '面包', gez: 'ኅብስት', kun: 'kisha', irob: 'kitta', category: 'everyday', phoneticTi: 'bani' },
  { en: 'how much is this', ti: 'ዋጋኡ ክንደይ እዩ', am: 'ዋጋው ስንት ነው', de: 'wie viel kostet das', ar: 'كم سعر هذا', fr: 'combien coûte ceci', es: 'cuánto cuesta esto', it: 'quanto costa questo', pt: 'quanto custa isso', zh: '这个多少钱', gez: 'አይ መጠን ዝንቱ', kun: 'kasha aana', irob: 'kimeke ya', category: 'travel', phoneticTi: 'wagau kindey eyu' },
  { en: 'i need help', ti: 'ሓገዝ የድልየኒ ኣሎ', am: 'እርዳታ እፈልጋለሁ', de: 'ich brauche hilfe', ar: 'أحتاج إلى مساعدة', fr: "j'ai besoin d'aide", es: 'necesito ayuda', it: 'ho bisogno di aiuto', pt: 'preciso de ajuda', zh: '我需要帮助', gez: 'ርድአኒ', kun: 'kaba fada', irob: 'gargaar faxa', category: 'emergency', phoneticTi: 'hagez yedliyeni alo' },
  { en: 'hospital', ti: 'ሆስፒታል', am: 'ሆስፒታል', de: 'krankenhaus', ar: 'مستشفى', fr: 'hôpital', es: 'hospital', it: 'ospedale', pt: 'hospital', zh: '医院', gez: 'ቤተ ፈውስ', kun: 'hospital', irob: 'hakim bita', category: 'medical', phoneticTi: 'hospital' },
  { en: 'doctor', ti: 'ሓኪም', am: 'ዶክተር', de: 'arzt', ar: 'طبيب', fr: 'médecin', es: 'médico', it: 'dottore', pt: 'médico', zh: '医生', gez: 'ዐቃቤ ሥራይ', kun: 'hakim', irob: 'hakim', category: 'medical', phoneticTi: 'hakim' },
  { en: 'police', ti: 'ፖሊስ', am: 'ፖሊስ', de: 'polizei', ar: 'شرطة', fr: 'police', es: 'policía', it: 'polizia', pt: 'polícia', zh: '警察', gez: 'ዐቃቢ', kun: 'polis', irob: 'polis', category: 'emergency', phoneticTi: 'polis' },

  // Business, Study & Language
  { en: 'peace', ti: 'ሰላም', am: 'ሰላም', de: 'frieden', ar: 'سلام', fr: 'paix', es: 'paz', it: 'pace', pt: 'paz', zh: '和平', gez: 'ሰላም', kun: 'naako', irob: 'nagaya', category: 'everyday', phoneticTi: 'selam' },
  { en: 'love', ti: 'ፍቕሪ', am: 'ፍቅር', de: 'liebe', ar: 'حب', fr: 'amour', es: 'amor', it: 'amore', pt: 'amor', zh: '爱', gez: 'ፍቅር', kun: 'fada', irob: 'kacala', category: 'everyday', phoneticTi: 'fiqri' },
  { en: 'wisdom', ti: 'ጥበብ', am: 'ጥበብ', de: 'weisheit', ar: 'حكمة', fr: 'sagesse', es: 'sabiduría', it: 'saggezza', pt: 'sabedoria', zh: '智慧', gez: 'ጥበብ', kun: 'tibe', irob: 'xikma', category: 'everyday', phoneticTi: 'tibeb' },
  { en: 'knowledge', ti: 'ፍልጠት', am: 'እውቀት', de: 'wissen', ar: 'معرفة', fr: 'connaissance', es: 'conocimiento', it: 'conoscenza', pt: 'conhecimento', zh: '知识', gez: 'አእምሮ', kun: 'ara', irob: 'ixiga', category: 'business', phoneticTi: 'filtet' },
  { en: 'today', ti: 'ሎሚ', am: 'ዛሬ', de: 'heute', ar: 'اليوم', fr: "aujourd'hui", es: 'hoy', it: 'oggi', pt: 'hoje', zh: '今天', gez: 'ዮም', kun: 'ella', irob: 'asa', category: 'everyday', phoneticTi: 'lomi' },
  { en: 'tomorrow', ti: 'ጽባሕ', am: 'ነገ', de: 'morgen', ar: 'غدا', fr: 'demain', es: 'mañana', it: 'domani', pt: 'amanhã', zh: '明天', gez: 'ጌሰም', kun: 'abina', irob: 'bera', category: 'everyday', phoneticTi: 'tsibah' },
  { en: 'work', ti: 'ስራሕ', am: 'ስራ', de: 'arbeit', ar: 'عمل', fr: 'travail', es: 'trabajo', it: 'lavoro', pt: 'trabalho', zh: '工作', gez: 'ግብር', kun: 'sira', irob: 'taama', category: 'business', phoneticTi: 'sirah' },
  { en: 'agreement', ti: 'ውዕል', am: 'ስምምነት', de: 'vereinbarung', ar: 'اتفاقية', fr: 'accord', es: 'acuerdo', it: 'accordo', pt: 'acordo', zh: '协议', gez: 'ኪዳን', kun: 'walia', irob: 'mali', category: 'business', phoneticTi: 'wiil' },
  { en: 'price', ti: 'ዋጋ', am: 'ዋጋ', de: 'preis', ar: 'سعر', fr: 'prix', es: 'precio', it: 'prezzo', pt: 'preço', zh: '价格', gez: 'ሤጥ', kun: 'waga', irob: 'kima', category: 'business', phoneticTi: 'waga' },
  { en: 'family', ti: 'ስድራ ቤት', am: 'ቤተሰብ', de: 'familie', ar: 'عائلة', fr: 'famille', es: 'familia', it: 'famiglia', pt: 'família', zh: '家庭', gez: 'ቤተሰብ', kun: 'bita', irob: 'buxa', category: 'everyday', phoneticTi: 'sidra bet' },
  { en: 'friend', ti: 'ዓርኪ', am: 'ጓደኛ', de: 'freund', ar: 'صديق', fr: 'ami', es: 'amigo', it: 'amico', pt: 'amigo', zh: '朋友', gez: 'ዐርክ', kun: 'kida', irob: 'saaxib', category: 'everyday', phoneticTi: 'arki' },
  { en: 'i understand', ti: 'ተረዲኡኒ ኣሎ', am: 'ገብቶኛል', de: 'ich verstehe', ar: 'أنا أفهم', fr: 'je comprends', es: 'entiendo', it: 'capisco', pt: 'eu entendo', zh: '我明白', gez: 'ለበውኩ', kun: 'naara', irob: 'ixxige', category: 'everyday', phoneticTi: 'terediuni alo' },
  { en: 'i do not understand', ti: 'ኣይተረደኣንን', am: 'አልገባኝም', de: 'ich verstehe nicht', ar: 'لا أفهم', fr: 'je ne comprends pas', es: 'no entiendo', it: 'non capisco', pt: 'não entendo', zh: '我不明白', gez: 'ኢለበውኩ', kun: 'naamalla', irob: 'ma-ixxiginno', category: 'everyday', phoneticTi: 'ayteredaninn' },

  // Numbers
  { en: 'one', ti: 'ሓደ', am: 'አንድ', de: 'eins', ar: 'واحد', fr: 'un', es: 'uno', it: 'uno', pt: 'um', zh: '一', gez: 'አሐዱ', kun: 'ella', irob: 'inik', category: 'numbers', phoneticTi: 'hade' },
  { en: 'two', ti: 'ክልተ', am: 'ሁለት', de: 'zwei', ar: 'اثنان', fr: 'deux', es: 'dos', it: 'due', pt: 'dois', zh: '二', gez: 'ክልኤቱ', kun: 'bare', irob: 'lamma', category: 'numbers', phoneticTi: 'kilte' },
  { en: 'three', ti: 'ሰለስተ', am: 'ሶስት', de: 'drei', ar: 'ثلاثة', fr: 'trois', es: 'tres', it: 'tre', pt: 'três', zh: '三', gez: 'ሠለስቱ', kun: 'satte', irob: 'adoh', category: 'numbers', phoneticTi: 'seleste' },
  { en: 'four', ti: 'ኣርባዕተ', am: 'አራት', de: 'vier', ar: 'أربعة', fr: 'quatre', es: 'cuatro', it: 'quattro', pt: 'quatro', zh: '四', gez: 'አርባዕቱ', kun: 'salle', irob: 'afar', category: 'numbers', phoneticTi: 'arbaete' },
  { en: 'five', ti: 'ሓሙሽተ', am: 'አምስት', de: 'fünf', ar: 'خمسة', fr: 'cinq', es: 'cinco', it: 'cinque', pt: 'cinco', zh: '五', gez: 'ኀምስቱ', kun: 'kussume', irob: 'koon', category: 'numbers', phoneticTi: 'hamushte' },
  { en: 'ten', ti: 'ዓሰርተ', am: 'አስር', de: 'zehn', ar: 'عشرة', fr: 'dix', es: 'diez', it: 'dieci', pt: 'dez', zh: '十', gez: 'ዐሠርቱ', kun: 'shabbe', irob: 'tamman', category: 'numbers', phoneticTi: 'aserte' },
  { en: 'hundred', ti: 'ሚእቲ', am: 'መቶ', de: 'hundert', ar: 'مئة', fr: 'cent', es: 'cien', it: 'cento', pt: 'cem', zh: '百', gez: 'ምእት', kun: 'mieti', irob: 'bol', category: 'numbers', phoneticTi: 'mieti' },
];

export const AVAILABLE_OFFLINE_PACKS: OfflinePackMetadata[] = [
  { code: 'ti', name: 'Tigrinya', nativeName: 'ትግርኛ', version: '2.4.0', coverageTier: 'full-neural', entryCount: OFFLINE_LEXICON_ENTRIES.length, estimatedBytes: 184320, checksum: 'sha256:ti-2.4.0-axm' },
  { code: 'en', name: 'English', nativeName: 'English', version: '2.4.0', coverageTier: 'full-neural', entryCount: OFFLINE_LEXICON_ENTRIES.length, estimatedBytes: 163840, checksum: 'sha256:en-2.4.0-axm' },
  { code: 'am', name: 'Amharic', nativeName: 'አማርኛ', version: '2.4.0', coverageTier: 'full-neural', entryCount: OFFLINE_LEXICON_ENTRIES.length, estimatedBytes: 178176, checksum: 'sha256:am-2.4.0-axm' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', version: '2.4.0', coverageTier: 'full-neural', entryCount: OFFLINE_LEXICON_ENTRIES.length, estimatedBytes: 172032, checksum: 'sha256:de-2.4.0-axm' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', version: '2.4.0', coverageTier: 'full-neural', entryCount: OFFLINE_LEXICON_ENTRIES.length, estimatedBytes: 176128, checksum: 'sha256:ar-2.4.0-axm' },
  { code: 'fr', name: 'French', nativeName: 'Français', version: '2.4.0', coverageTier: 'full-neural', entryCount: OFFLINE_LEXICON_ENTRIES.length, estimatedBytes: 168960, checksum: 'sha256:fr-2.4.0-axm' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', version: '2.4.0', coverageTier: 'full-neural', entryCount: OFFLINE_LEXICON_ENTRIES.length, estimatedBytes: 166912, checksum: 'sha256:es-2.4.0-axm' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', version: '2.4.0', coverageTier: 'full-neural', entryCount: OFFLINE_LEXICON_ENTRIES.length, estimatedBytes: 165888, checksum: 'sha256:it-2.4.0-axm' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', version: '2.4.0', coverageTier: 'full-neural', entryCount: OFFLINE_LEXICON_ENTRIES.length, estimatedBytes: 165888, checksum: 'sha256:pt-2.4.0-axm' },
  { code: 'zh', name: 'Chinese (Simplified)', nativeName: '简体中文', version: '2.4.0', coverageTier: 'full-neural', entryCount: OFFLINE_LEXICON_ENTRIES.length, estimatedBytes: 192512, checksum: 'sha256:zh-2.4.0-axm' },
  { code: 'gez', name: "Ge'ez", nativeName: 'ግዕዝ', version: '2.4.0', coverageTier: 'community-validated', entryCount: OFFLINE_LEXICON_ENTRIES.length, estimatedBytes: 158720, checksum: 'sha256:gez-2.4.0-axm' },
  { code: 'kun', name: 'Kunama', nativeName: 'Kunama (ኩናማ)', version: '1.8.0', coverageTier: 'community-validated', entryCount: OFFLINE_LEXICON_ENTRIES.length, estimatedBytes: 142336, checksum: 'sha256:kun-1.8.0-axm' },
  { code: 'irob', name: 'Irob', nativeName: 'Saho-Irob (ኢሮብ)', version: '1.8.0', coverageTier: 'community-validated', entryCount: OFFLINE_LEXICON_ENTRIES.length, estimatedBytes: 141312, checksum: 'sha256:irob-1.8.0-axm' },
];
