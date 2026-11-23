export type VoicePersonaId =
  | 'ancient_historian'
  | 'modern_advisor'
  | 'technical_consultant'
  | 'cultural_custodian'
  | 'concise_executive';

export type GeminiPrebuiltVoiceName = 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr' | 'Puck';

export interface VoicePersona {
  id: VoicePersonaId;
  name: string;
  nameTi: string;
  badge: string;
  tagline: string;
  taglineTi: string;
  toneDescription: string;
  toneDescriptionTi: string;
  avatarIcon: string;
  accentColor: string;
  borderAccent: string;
  glowColor: string;
  speechPitch: number;
  speechRate: number;
  geminiVoiceName: GeminiPrebuiltVoiceName;
  speechStylePrompt: string;
  sampleGreetingEn: string;
  sampleGreetingTi: string;
  systemPromptModifierEn: string;
  systemPromptModifierTi: string;
}

export interface VoicePersonaSettings {
  personaId: VoicePersonaId;
  pitchMultiplier: number;
  rateMultiplier: number;
}

export const VOICE_PERSONA_STORAGE_KEY = 'axumite_voice_persona';
export const VOICE_PERSONA_TUNING_STORAGE_KEY = 'axumite_voice_persona_tuning';
export const VOICE_PERSONA_UPDATED_EVENT = 'axumite:voice_persona_updated';

export const VOICE_PERSONAS: VoicePersona[] = [
  {
    id: 'ancient_historian',
    name: 'Ancient Historian',
    nameTi: 'ጥንታዊ ዛንታዊ መምህር',
    badge: 'Royal Scholar',
    tagline: 'Epic, Sovereign & Ancient Lore',
    taglineTi: 'ናይ ኣክሱምን ጥንታዊ ስልጣነን ፍልጠት',
    toneDescription:
      'Authoritative, majestic and historically rich. Infuses answers with timeless wisdom from the Kingdom of Aksum, ancient kings, and Ge’ez heritage.',
    toneDescriptionTi:
      'ክቡርን ግርማ ዝተላበሰን ኣዘራርባ። ታሪኽ ጥንታዊ ንግስነት ኣክሱም፡ ሓወልትታትን ግእዝን እናጠቐሰ ይምልስ።',
    avatarIcon: '👑',
    accentColor: '#D4AF37',
    borderAccent: 'border-amber-500/50',
    glowColor: 'rgba(212, 175, 55, 0.4)',
    speechPitch: 0.88,
    speechRate: 0.94,
    geminiVoiceName: 'Charon',
    speechStylePrompt: 'Measured, stately, resonant voice of an esteemed royal historian and classical scholar',
    sampleGreetingEn:
      'Greetings, seeker of truth. I am your Axumite Chronicler. Speak, and let the wisdom of the ancient stelae guide your path.',
    sampleGreetingTi:
      'ሰላም ንዓኻ፡ ደላይ ፍልጠት። ኣነ ናይ ኣክሱም ጥንታዊ ዛንታዊ እየ። ሕተት፡ ናይ ቀዳሞት ጥበብ ክመርሓካ እዩ።',
    systemPromptModifierEn:
      'Adopt the tone of an esteemed Ancient Axumite Royal Historian and Scholar. Speak with poetic dignity, referencing historical milestones, sovereign heritage, and timeless wisdom where relevant.',
    systemPromptModifierTi:
      'ከም ጥንታዊ ናይ ኣክሱም ሊቅን ዛንታውን ብኽቡርን ባህላውን መንገዲ ተዛረብ።',
  },
  {
    id: 'modern_advisor',
    name: 'Modern Advisor',
    nameTi: 'ዘመናዊ ስትራተጂካዊ ኣማኻሪ',
    badge: 'Executive',
    tagline: 'Strategic, Dynamic & Empowering',
    taglineTi: 'ንጹር፡ ስትራተጂካውን ንቕድሚት ዝጥምት መምርሒ',
    toneDescription:
      'Polished, energetic, and solution-focused. Delivers crisp strategic insights tailored for founders, creators, and modern visionaries.',
    toneDescriptionTi:
      'ንጹርን ውጽኢታዊን ኣዘራርባ። ንቢዝነስን መጻኢ ዕቤትን ዝሕግዙ ስትራተጂካዊ ምኽርታት ይህብ።',
    avatarIcon: '💼',
    accentColor: '#38BDF8',
    borderAccent: 'border-sky-500/50',
    glowColor: 'rgba(56, 189, 248, 0.4)',
    speechPitch: 1.0,
    speechRate: 1.04,
    geminiVoiceName: 'Kore',
    speechStylePrompt: 'Confident, articulate, modern executive advisor with crisp strategic clarity',
    sampleGreetingEn:
      'Hello! I am your Modern Strategic Advisor. Ready to optimize your workflow, accelerate business, and solve challenges.',
    sampleGreetingTi:
      'ሰላም! ኣነ ዘመናዊ ኣማኻሪኻ እየ። ንስራሕካን ሓሳባትካን ንምዕባይ ምሉእ ብምሉእ ድሉው እየ።',
    systemPromptModifierEn:
      'Adopt the tone of a high-level Modern Executive Advisor. Deliver clear, structured, strategic recommendations with confidence and actionable precision.',
    systemPromptModifierTi:
      'ከም ዘመናዊ መራሒ ስራሕ ንጹርን ተግባራውን ዝኾነ ምኽሪ ሃብ።',
  },
  {
    id: 'technical_consultant',
    name: 'Technical Consultant',
    nameTi: 'ቴክኒካዊ መሃንድስን ኣርኪቴክትን',
    badge: 'Architect',
    tagline: 'Analytical, High-Precision & Metrics-Driven',
    taglineTi: 'ቴክኒካዊ ትንተና፡ ጸጥታን መሃንድስነትን',
    toneDescription:
      'Precise, objective, and deeply technical. Breaks down complex algorithms, system architectures, cryptographic protocols, and data structures.',
    toneDescriptionTi:
      'ዓሚቝ ቴክኒካዊ ፍልጠት፡ ኮድ፡ ዳታን ናይ ሲስተም መሃንድስነትን ብልክዕነት ዘረድእ።',
    avatarIcon: '⚡',
    accentColor: '#10B981',
    borderAccent: 'border-emerald-500/50',
    glowColor: 'rgba(16, 185, 129, 0.4)',
    speechPitch: 1.05,
    speechRate: 1.1,
    geminiVoiceName: 'Fenrir',
    speechStylePrompt: 'Crisp, analytical, objective voice of a principal systems architect and technical consultant',
    sampleGreetingEn:
      'System online. I am your Technical Consultant. Specify parameters or ask for architecture analysis, debugging, and data schemas.',
    sampleGreetingTi:
      'ሲስተም ኣብ ስራሕ ኣሎ። ኣነ ቴክኒካዊ መሃንድስካ እየ። ኮድ፡ ኣርኪቴክቸር ወይ ዳታ ሕተቱ።',
    systemPromptModifierEn:
      'Adopt the tone of a Lead Systems Architect and Technical Consultant. Prioritize precision, algorithmic efficiency, exact metrics, and engineering best practices.',
    systemPromptModifierTi:
      'ከም ሊቅ መሃንድስ ኮምፒተርን ቴክኖሎጂን ብልክዕነትን መረዳእታን ተዛረብ።',
  },
  {
    id: 'cultural_custodian',
    name: 'Cultural Custodian',
    nameTi: 'ሓላው ቅርስን ባህልን',
    badge: 'Heritage',
    tagline: 'Warm, Lyrical & Community-Rooted',
    taglineTi: 'ሙዉቕ ባህላዊ ምትእስሳርን ምሳሌታትን',
    toneDescription:
      'Warm, respectful, and steeped in Tigrinya & Ge’ez proverbs. Bridges ancestral traditions with contemporary diaspora storytelling.',
    toneDescriptionTi:
      'ብኣኽብሮትን ብባህላዊ ምስላታትን ትግርኛ ዝተሰነየ ምዉቕ ናይ ማሕበረሰብ ቋንቋ።',
    avatarIcon: '🏛️',
    accentColor: '#F59E0B',
    borderAccent: 'border-amber-400/50',
    glowColor: 'rgba(245, 158, 11, 0.4)',
    speechPitch: 0.95,
    speechRate: 0.98,
    geminiVoiceName: 'Zephyr',
    speechStylePrompt: 'Warm, graceful, lyrical storytelling tone rich with hospitality and cultural care',
    sampleGreetingEn:
      'Selam and welcome. I am your Cultural Custodian. Let us celebrate our heritage, languages, and timeless stories together.',
    sampleGreetingTi:
      'ሰላም፡ እንቋዕ ብደሓን መጻእኹም። ኣነ ሓላው ባህልን ቋንቋን እየ። ታሪኽናን ሓድነትናን ብሓባር ነዕቢ።',
    systemPromptModifierEn:
      'Adopt the tone of a revered Cultural Custodian and Community Storyteller. Weave in respectful greetings, cultural appreciation, and rich linguistic nuance.',
    systemPromptModifierTi:
      'ከም ባህላዊ ኣቦ/ኣደ ማሕበረሰብ ብፍቕርን ኣኽብሮትን ተዛረብ።',
  },
  {
    id: 'concise_executive',
    name: 'Executive Brief',
    nameTi: 'ቀጥታዊ ሓጺር ጸብጻብ',
    badge: 'Ultra-Fast',
    tagline: 'Direct, Compact & Zero-Fluff',
    taglineTi: 'ቀጥታዊ፡ ሓጺርን ውጽኢታዊን ጸብጻብ',
    toneDescription:
      'Minimalist and ultra-rapid. Delivers core facts, decisive takeaways, and clear next actions with zero filler.',
    toneDescriptionTi:
      'ሓጺር፡ ቀጥታ ናብ ፍረ-ነገር ዝኸይድ፡ ንህጹጽ ውሳነታት ዝጠቅም መልሲ።',
    avatarIcon: '🎯',
    accentColor: '#A855F7',
    borderAccent: 'border-purple-500/50',
    glowColor: 'rgba(168, 85, 247, 0.4)',
    speechPitch: 1.02,
    speechRate: 1.18,
    geminiVoiceName: 'Puck',
    speechStylePrompt: 'Brisk, clear, high-efficiency executive briefing cadence with zero filler',
    sampleGreetingEn:
      'Ready for brief. Ask your question—delivering direct, actionable takeaways.',
    sampleGreetingTi:
      'ድሉው እየ። ሕቶኹም ኣቕርቡ—ቀጥታዊ ሓጺር መልሲ ክቐርብ እዩ።',
    systemPromptModifierEn:
      'Adopt an ultra-concise executive briefing persona. Use crisp direct sentences, eliminate pleasantries, and maximize informational density.',
    systemPromptModifierTi:
      'ብሓጺርን ብቑዕን ቃላት ጥራይ መልሲ ሃብ።',
  },
];

export const DEFAULT_VOICE_PERSONA_ID: VoicePersonaId = 'ancient_historian';

export function isValidVoicePersonaId(id: unknown): id is VoicePersonaId {
  return typeof id === 'string' && VOICE_PERSONAS.some((p) => p.id === id);
}

export function getVoicePersona(id?: string | null): VoicePersona {
  const found = VOICE_PERSONAS.find((p) => p.id === id);
  return found || VOICE_PERSONAS[0];
}

function clampMultiplier(val: unknown, min: number, max: number, fallback: number): number {
  const num = typeof val === 'number' ? val : Number(val);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, Math.round(num * 100) / 100));
}

/**
 * Read synchronized AI Voice Persona settings from UserProfile and/or localStorage.
 */
export function getStoredVoicePersonaSettings(user?: {
  voicePersona?: VoicePersonaId;
  voicePersonaPitch?: number;
  voicePersonaRate?: number;
} | null): VoicePersonaSettings {
  let storedId: VoicePersonaId = DEFAULT_VOICE_PERSONA_ID;
  let pitchMultiplier = 1.0;
  let rateMultiplier = 1.0;

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const rawId = localStorage.getItem(VOICE_PERSONA_STORAGE_KEY);
      if (isValidVoicePersonaId(rawId)) {
        storedId = rawId;
      }
      const rawTuning = localStorage.getItem(VOICE_PERSONA_TUNING_STORAGE_KEY);
      if (rawTuning) {
        const parsed = JSON.parse(rawTuning) as Partial<VoicePersonaSettings>;
        pitchMultiplier = clampMultiplier(parsed.pitchMultiplier, 0.8, 1.25, 1.0);
        rateMultiplier = clampMultiplier(parsed.rateMultiplier, 0.75, 1.35, 1.0);
      }
    } catch {
      // Ignore storage read errors
    }
  }

  return {
    personaId: isValidVoicePersonaId(user?.voicePersona) ? user.voicePersona : storedId,
    pitchMultiplier:
      user?.voicePersonaPitch !== undefined
        ? clampMultiplier(user.voicePersonaPitch, 0.8, 1.25, pitchMultiplier)
        : pitchMultiplier,
    rateMultiplier:
      user?.voicePersonaRate !== undefined
        ? clampMultiplier(user.voicePersonaRate, 0.75, 1.35, rateMultiplier)
        : rateMultiplier,
  };
}

/**
 * Persist AI Voice Persona settings locally and broadcast a live update event so every
 * mounted settings drawer and voice assistant updates immediately.
 */
export function saveVoicePersonaSettings(
  partial: Partial<VoicePersonaSettings>,
  options?: { silent?: boolean }
): VoicePersonaSettings {
  const current = getStoredVoicePersonaSettings();
  const next: VoicePersonaSettings = {
    personaId: isValidVoicePersonaId(partial.personaId) ? partial.personaId : current.personaId,
    pitchMultiplier:
      partial.pitchMultiplier !== undefined
        ? clampMultiplier(partial.pitchMultiplier, 0.8, 1.25, current.pitchMultiplier)
        : current.pitchMultiplier,
    rateMultiplier:
      partial.rateMultiplier !== undefined
        ? clampMultiplier(partial.rateMultiplier, 0.75, 1.35, current.rateMultiplier)
        : current.rateMultiplier,
  };

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(VOICE_PERSONA_STORAGE_KEY, next.personaId);
      localStorage.setItem(
        VOICE_PERSONA_TUNING_STORAGE_KEY,
        JSON.stringify({
          pitchMultiplier: next.pitchMultiplier,
          rateMultiplier: next.rateMultiplier,
        })
      );
    } catch {
      // Ignore storage write errors
    }
  }

  if (!options?.silent && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<VoicePersonaSettings>(VOICE_PERSONA_UPDATED_EVENT, { detail: next }));
  }

  return next;
}
