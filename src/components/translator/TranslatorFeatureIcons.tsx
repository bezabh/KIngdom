import React from 'react';
import type { TranslatorFeatureId, FeatureCardsSurfaceVariant } from './TranslationFeatureCardsGrid';

interface FeatureIconProps {
  className?: string;
}

/**
 * 01. Conversation Translation — Interlocking dialogue bubbles with speech wave
 */
export const ConversationStudioIcon: React.FC<FeatureIconProps> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
    <path
      d="M5.5 9.5C5.5 7.291 7.291 5.5 9.5 5.5H19.5C21.709 5.5 23.5 7.291 23.5 9.5V15.5C23.5 17.709 21.709 19.5 19.5 19.5H12.2L7.2 23.2C6.54 23.69 5.6 23.22 5.6 22.4V19.2C5.53 18.67 5.5 18.1 5.5 17.5V9.5Z"
      fill="currentColor"
      fillOpacity="0.18"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path
      d="M17.5 21.5H23.5C25.433 21.5 27 19.933 27 18V13.5C27 12.1 26.2 10.9 25 10.3"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M22.5 21.5L26.2 24.6C26.8 25.1 27.7 24.67 27.7 23.89V20.5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M11 11V14" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
    <path d="M14.5 9.5V15.5" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
    <path d="M18 11V14" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
  </svg>
);

/**
 * 02. Screen Translation — Display frame with OCR scan bar
 */
export const ScreenStudioIcon: React.FC<FeatureIconProps> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
    <rect
      x="4.5"
      y="6"
      width="23"
      height="16"
      rx="3.2"
      fill="currentColor"
      fillOpacity="0.18"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path d="M12 26.5H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M16 22V26.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M8.5 14H23.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="2.5 2.5" />
    <path d="M11.5 10.5H17.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M11.5 17.5H20.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

/**
 * 03. Call Translation — Handset with live audio translation arcs
 */
export const CallStudioIcon: React.FC<FeatureIconProps> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
    <path
      d="M9.4 7H11.6C12.42 7 13.12 7.59 13.28 8.39L13.9 11.45C14.03 12.1 13.78 12.77 13.26 13.19L11.75 14.4C12.92 16.85 14.95 18.88 17.4 20.05L18.61 18.54C19.03 18.02 19.7 17.77 20.35 17.9L23.41 18.52C24.21 18.68 24.8 19.38 24.8 20.2V22.4C24.8 23.69 23.7 24.71 22.42 24.58C14.62 23.82 8.18 17.38 7.42 9.58C7.29 8.3 8.31 7 9.4 7Z"
      fill="currentColor"
      fillOpacity="0.18"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path
      d="M19.5 9.5C21.71 9.5 23.5 11.29 23.5 13.5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M19.5 6C23.64 6 27 9.36 27 13.5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeOpacity="0.72"
    />
  </svg>
);

/**
 * 04. Camera OCR Translation — Viewfinder corners and optical lens
 */
export const CameraStudioIcon: React.FC<FeatureIconProps> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
    <path
      d="M5.5 10.5V8.5C5.5 6.84 6.84 5.5 8.5 5.5H10.5M21.5 5.5H23.5C25.16 5.5 26.5 6.84 26.5 8.5V10.5M26.5 21.5V23.5C26.5 25.16 25.16 26.5 23.5 26.5H21.5M10.5 26.5H8.5C6.84 26.5 5.5 25.16 5.5 23.5V21.5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <rect
      x="8.5"
      y="10.5"
      width="15"
      height="11"
      rx="2.8"
      fill="currentColor"
      fillOpacity="0.18"
      stroke="currentColor"
      strokeWidth="1.9"
    />
    <circle cx="16" cy="16" r="3.2" stroke="currentColor" strokeWidth="1.9" />
    <circle cx="16" cy="16" r="1.2" fill="currentColor" />
  </svg>
);

/**
 * 05. Voice Translation — Studio microphone with acoustic waves
 */
export const VoiceStudioIcon: React.FC<FeatureIconProps> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
    <rect
      x="12.2"
      y="5.5"
      width="7.6"
      height="12.5"
      rx="3.8"
      fill="currentColor"
      fillOpacity="0.18"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path
      d="M9 14.8C9 18.67 12.13 21.8 16 21.8C19.87 21.8 23 18.67 23 14.8"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path d="M16 21.8V26.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M12.2 26.2H19.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M5.8 12V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.8" />
    <path d="M26.2 12V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.8" />
  </svg>
);

/**
 * 06. Offline Translation — Globe with local download package badge
 */
export const OfflineStudioIcon: React.FC<FeatureIconProps> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
    <circle
      cx="15"
      cy="15.5"
      r="9.5"
      fill="currentColor"
      fillOpacity="0.16"
      stroke="currentColor"
      strokeWidth="2"
    />
    <ellipse cx="15" cy="15.5" rx="4.2" ry="9.5" stroke="currentColor" strokeWidth="1.6" strokeOpacity="0.75" />
    <path d="M5.8 15.5H24.2" stroke="currentColor" strokeWidth="1.6" strokeOpacity="0.75" />
    <circle cx="23.5" cy="23" r="5" fill="currentColor" fillOpacity="0.22" stroke="currentColor" strokeWidth="1.8" />
    <path d="M23.5 20.6V24.8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    <path
      d="M21.7 23.2L23.5 25.1L25.3 23.2"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const FEATURE_CUSTOM_ICONS: Record<TranslatorFeatureId, React.FC<FeatureIconProps>> = {
  conversation: ConversationStudioIcon,
  'screen-capture': ScreenStudioIcon,
  'call-translation': CallStudioIcon,
  'camera-ocr': CameraStudioIcon,
  'voice-translation': VoiceStudioIcon,
  'offline-translation': OfflineStudioIcon,
};

interface TileIconPalette {
  box: string;
  titleColor: string;
  accentText: string;
  hoverTitle: string;
  watermark: string;
}

export type MedallionTone = 'gold' | 'indigo' | 'emerald' | 'crimson' | 'violet' | 'teal';

const MEDALLION_TONE_STYLES: Record<
  MedallionTone,
  { container: string; ringStroke: string }
> = {
  gold: {
    container: 'bg-gradient-to-br from-[#FBF2D8] to-[#F1DFAD] border border-[#DFC57E] text-[#9A6F09]',
    ringStroke: '#C99E32',
  },
  indigo: {
    container: 'bg-gradient-to-br from-[#EEF2FF] to-[#DBE4FF] border border-[#B4C6FC] text-[#1E40AF]',
    ringStroke: '#6B8AF2',
  },
  emerald: {
    container: 'bg-gradient-to-br from-[#ECFDF5] to-[#D1FAE5] border border-[#86EFAC] text-[#047857]',
    ringStroke: '#34D399',
  },
  crimson: {
    container: 'bg-gradient-to-br from-[#FFF1F2] to-[#FFE4E6] border border-[#FDA4AF] text-[#BE123C]',
    ringStroke: '#FB7185',
  },
  violet: {
    container: 'bg-gradient-to-br from-[#F5F3FF] to-[#EDE9FE] border border-[#C4B5FD] text-[#6D28D9]',
    ringStroke: '#A78BFA',
  },
  teal: {
    container: 'bg-gradient-to-br from-[#F0FDFA] to-[#CCFBF1] border border-[#5EEAD4] text-[#0F766E]',
    ringStroke: '#2DD4BF',
  },
};

const FEATURE_TONES: Record<TranslatorFeatureId, MedallionTone> = {
  conversation: 'indigo',
  'screen-capture': 'violet',
  'call-translation': 'teal',
  'camera-ocr': 'crimson',
  'voice-translation': 'emerald',
  'offline-translation': 'gold',
};

const FEATURE_TILE_PALETTES: Record<
  FeatureCardsSurfaceVariant,
  Record<TranslatorFeatureId, TileIconPalette>
> = {
  dark: {
    conversation: {
      box: 'bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 group-hover:bg-cyan-500/25 group-hover:border-cyan-400/70',
      titleColor: 'text-cyan-100',
      accentText: 'text-cyan-300',
      hoverTitle: 'group-hover:text-cyan-200',
      watermark: 'text-cyan-400/10',
    },
    'screen-capture': {
      box: 'bg-indigo-500/15 border border-indigo-400/40 text-indigo-300 group-hover:bg-indigo-500/25 group-hover:border-indigo-400/70',
      titleColor: 'text-indigo-100',
      accentText: 'text-indigo-300',
      hoverTitle: 'group-hover:text-indigo-200',
      watermark: 'text-indigo-400/10',
    },
    'call-translation': {
      box: 'bg-sky-500/15 border border-sky-400/40 text-sky-300 group-hover:bg-sky-500/25 group-hover:border-sky-400/70',
      titleColor: 'text-sky-100',
      accentText: 'text-sky-300',
      hoverTitle: 'group-hover:text-sky-200',
      watermark: 'text-sky-400/10',
    },
    'camera-ocr': {
      box: 'bg-pink-500/15 border border-pink-400/40 text-pink-300 group-hover:bg-pink-500/25 group-hover:border-pink-400/70',
      titleColor: 'text-pink-100',
      accentText: 'text-pink-300',
      hoverTitle: 'group-hover:text-pink-200',
      watermark: 'text-pink-400/10',
    },
    'voice-translation': {
      box: 'bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 group-hover:bg-emerald-500/25 group-hover:border-emerald-400/70',
      titleColor: 'text-emerald-100',
      accentText: 'text-emerald-300',
      hoverTitle: 'group-hover:text-emerald-200',
      watermark: 'text-emerald-400/10',
    },
    'offline-translation': {
      box: 'bg-amber-500/15 border border-amber-400/45 text-amber-300 group-hover:bg-amber-500/25 group-hover:border-amber-300/75',
      titleColor: 'text-amber-100',
      accentText: 'text-amber-300',
      hoverTitle: 'group-hover:text-amber-200',
      watermark: 'text-amber-400/10',
    },
  },
  premiere: {
    conversation: {
      box: MEDALLION_TONE_STYLES.indigo.container,
      titleColor: 'text-[#1E3A8A]',
      accentText: 'text-[#1D4ED8]',
      hoverTitle: 'group-hover:text-[#1D4ED8]',
      watermark: 'text-[#1E40AF]/[0.06]',
    },
    'screen-capture': {
      box: MEDALLION_TONE_STYLES.violet.container,
      titleColor: 'text-[#5B21B6]',
      accentText: 'text-[#6D28D9]',
      hoverTitle: 'group-hover:text-[#6D28D9]',
      watermark: 'text-[#6D28D9]/[0.06]',
    },
    'call-translation': {
      box: MEDALLION_TONE_STYLES.teal.container,
      titleColor: 'text-[#115E59]',
      accentText: 'text-[#0F766E]',
      hoverTitle: 'group-hover:text-[#0F766E]',
      watermark: 'text-[#0F766E]/[0.06]',
    },
    'camera-ocr': {
      box: MEDALLION_TONE_STYLES.crimson.container,
      titleColor: 'text-[#9F1239]',
      accentText: 'text-[#BE123C]',
      hoverTitle: 'group-hover:text-[#BE123C]',
      watermark: 'text-[#BE123C]/[0.06]',
    },
    'voice-translation': {
      box: MEDALLION_TONE_STYLES.emerald.container,
      titleColor: 'text-[#065F46]',
      accentText: 'text-[#047857]',
      hoverTitle: 'group-hover:text-[#047857]',
      watermark: 'text-[#047857]/[0.06]',
    },
    'offline-translation': {
      box: MEDALLION_TONE_STYLES.gold.container,
      titleColor: 'text-[#854D0E]',
      accentText: 'text-[#9A6F09]',
      hoverTitle: 'group-hover:text-[#9A6F09]',
      watermark: 'text-[#9A6F09]/[0.07]',
    },
  },
  cream: {
    conversation: {
      box: MEDALLION_TONE_STYLES.indigo.container,
      titleColor: 'text-[#1E3A8A]',
      accentText: 'text-[#1D4ED8]',
      hoverTitle: 'group-hover:text-[#1D4ED8]',
      watermark: 'text-[#1E40AF]/[0.06]',
    },
    'screen-capture': {
      box: MEDALLION_TONE_STYLES.violet.container,
      titleColor: 'text-[#5B21B6]',
      accentText: 'text-[#6D28D9]',
      hoverTitle: 'group-hover:text-[#6D28D9]',
      watermark: 'text-[#6D28D9]/[0.06]',
    },
    'call-translation': {
      box: MEDALLION_TONE_STYLES.teal.container,
      titleColor: 'text-[#115E59]',
      accentText: 'text-[#0F766E]',
      hoverTitle: 'group-hover:text-[#0F766E]',
      watermark: 'text-[#0F766E]/[0.06]',
    },
    'camera-ocr': {
      box: MEDALLION_TONE_STYLES.crimson.container,
      titleColor: 'text-[#9F1239]',
      accentText: 'text-[#BE123C]',
      hoverTitle: 'group-hover:text-[#BE123C]',
      watermark: 'text-[#BE123C]/[0.06]',
    },
    'voice-translation': {
      box: MEDALLION_TONE_STYLES.emerald.container,
      titleColor: 'text-[#065F46]',
      accentText: 'text-[#047857]',
      hoverTitle: 'group-hover:text-[#047857]',
      watermark: 'text-[#047857]/[0.06]',
    },
    'offline-translation': {
      box: MEDALLION_TONE_STYLES.gold.container,
      titleColor: 'text-[#854D0E]',
      accentText: 'text-[#9A6F09]',
      hoverTitle: 'group-hover:text-[#9A6F09]',
      watermark: 'text-[#9A6F09]/[0.07]',
    },
  },
};

export function getFeatureAccentText(
  variant: FeatureCardsSurfaceVariant,
  featureId: TranslatorFeatureId
): string {
  return FEATURE_TILE_PALETTES[variant][featureId].accentText;
}

export function getFeatureTitleColor(
  variant: FeatureCardsSurfaceVariant,
  featureId: TranslatorFeatureId
): string {
  return FEATURE_TILE_PALETTES[variant][featureId].titleColor;
}

export function getFeatureHoverTitleClass(
  variant: FeatureCardsSurfaceVariant,
  featureId: TranslatorFeatureId
): string {
  return FEATURE_TILE_PALETTES[variant][featureId].hoverTitle;
}

export function getFeatureWatermarkClass(
  variant: FeatureCardsSurfaceVariant,
  featureId: TranslatorFeatureId
): string {
  return FEATURE_TILE_PALETTES[variant][featureId].watermark;
}

/**
 * Sacred-geometry jewel-toned emblem squircle container used across all parchment feature cards.
 */
export const SacredGeometryIconFrame: React.FC<{
  children: React.ReactNode;
  size?: 'lg' | 'md';
  tone?: MedallionTone;
  className?: string;
}> = ({ children, size = 'lg', tone = 'gold', className = '' }) => {
  const dims = size === 'lg' ? 'w-12 h-12 rounded-2xl' : 'w-10 h-10 rounded-xl';
  const toneStyle = MEDALLION_TONE_STYLES[tone];
  return (
    <div
      className={`relative ${dims} ${toneStyle.container} flex items-center justify-center shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] transition-transform duration-200 group-hover:scale-105 ${className}`}
    >
      <svg
        viewBox="0 0 48 48"
        fill="none"
        className="absolute inset-0 w-full h-full pointer-events-none opacity-45"
        aria-hidden="true"
      >
        <circle cx="24" cy="24" r="18" stroke={toneStyle.ringStroke} strokeWidth="1" />
        <rect
          x="13"
          y="13"
          width="22"
          height="22"
          rx="3"
          stroke={toneStyle.ringStroke}
          strokeWidth="0.9"
          transform="rotate(45 24 24)"
        />
      </svg>
      <div className="relative z-10 flex items-center justify-center">{children}</div>
    </div>
  );
};

interface FeatureIconMedallionProps {
  featureId: TranslatorFeatureId;
  variant: FeatureCardsSurfaceVariant;
  size?: 'lg' | 'md';
}

/**
 * Icon medallion matching either the Parchment Sacred-Geometry jewel squircles
 * or Sovereign Obsidian-Gold dark rounded tiles.
 */
export const FeatureIconMedallion: React.FC<FeatureIconMedallionProps> = ({
  featureId,
  variant,
  size = 'lg',
}) => {
  const Icon = FEATURE_CUSTOM_ICONS[featureId];
  const palette = FEATURE_TILE_PALETTES[variant][featureId];
  const iconSize = size === 'lg' ? 'w-5 h-5' : 'w-[18px] h-[18px]';

  if (variant === 'premiere' || variant === 'cream') {
    return (
      <SacredGeometryIconFrame size={size} tone={FEATURE_TONES[featureId]}>
        <Icon className={iconSize} />
      </SacredGeometryIconFrame>
    );
  }

  const boxSize = size === 'lg' ? 'w-10 h-10 rounded-xl' : 'w-9 h-9 rounded-xl';

  return (
    <div
      className={`flex items-center justify-center shrink-0 transition-all duration-200 group-hover:scale-105 ${boxSize} ${palette.box}`}
    >
      <Icon className={iconSize} />
    </div>
  );
};
