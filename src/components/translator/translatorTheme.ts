export type TranslatorThemeMode = 'cream' | 'dark';

export interface TranslatorThemeTokens {
  mode: TranslatorThemeMode;
  isLight: boolean;
  pageShell: string;
  cardBg: string;
  cardElevated: string;
  subCardBg: string;
  inputBg: string;
  border: string;
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  goldText: string;
  goldBadge: string;
  goldIconBox: string;
  primaryButton: string;
  secondaryButton: string;
  dangerButton: string;
}

export function getTranslatorThemeTokens(mode: TranslatorThemeMode): TranslatorThemeTokens {
  const isLight = mode === 'cream';

  if (isLight) {
    return {
      mode,
      isLight: true,
      pageShell:
        'bg-gradient-to-b from-[#FAF5EA] via-[#FBF7EE] to-[#F4EBDA] border border-[#D4AF37]/40 text-[#1C1917] shadow-[0_14px_44px_rgba(142,109,40,0.1)]',
      cardBg: 'bg-[#FFFDF8]/95 border border-[#D4AF37]/35 text-[#1C1917] shadow-[0_6px_24px_rgba(142,109,40,0.07)]',
      cardElevated: 'bg-[#F5EFE2] border border-[#C5A059]/45 text-[#1C1917]',
      subCardBg: 'bg-[#F8F3E8] border border-[#D4AF37]/25 text-[#1C1917]',
      inputBg: 'bg-white border border-[#C5A059]/40 text-[#1C1917] placeholder-[#78716C] focus:border-[#9A6F09]',
      border: 'border-[#D4AF37]/30',
      borderStrong: 'border-[#B8860B]/60',
      textPrimary: 'text-[#1C1917]',
      textSecondary: 'text-[#44403C]',
      textMuted: 'text-[#78716C]',
      goldText: 'text-[#8C6408]',
      goldBadge: 'bg-[#F3E5AB]/55 border border-[#C5A059]/60 text-[#6F4E04]',
      goldIconBox: 'bg-gradient-to-br from-[#F7E9B8] to-[#E6C973] border border-[#C5A059]/60 text-[#5C4103] shadow-sm',
      primaryButton:
        'bg-gradient-to-r from-[#9E7312] via-[#C59B27] to-[#B8860B] hover:brightness-105 text-white font-bold shadow-md',
      secondaryButton:
        'bg-[#FFFDF8] hover:bg-[#F3ECE0] border border-[#C5A059]/45 text-[#44403C] font-semibold',
      dangerButton:
        'bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-800 font-semibold',
    };
  }

  return {
    mode,
    isLight: false,
    pageShell:
      'bg-gradient-to-b from-[#08090E] via-[#0B0C13] to-[#07070A] border border-[#C5A059]/35 text-slate-100 shadow-[0_20px_56px_rgba(0,0,0,0.68)]',
    cardBg: 'bg-[#0D0F17]/95 border border-[#8E6D28]/35 text-slate-100 shadow-xl',
    cardElevated: 'bg-[#12131A] border border-[#C5A059]/40 text-slate-100',
    subCardBg: 'bg-[#090A0F] border border-[#8E6D28]/25 text-slate-200',
    inputBg: 'bg-[#07080C] border border-[#8E6D28]/35 text-slate-100 placeholder-gray-500 focus:border-[#D4AF37]',
    border: 'border-[#8E6D28]/25',
    borderStrong: 'border-[#C5A059]/60',
    textPrimary: 'text-slate-100',
    textSecondary: 'text-gray-300',
    textMuted: 'text-gray-400',
    goldText: 'text-[#F3E5AB]',
    goldBadge: 'bg-[#8E6D28]/20 border border-[#C5A059]/45 text-[#F3E5AB]',
    goldIconBox: 'bg-gradient-to-br from-[#8E6D28]/35 to-[#D4AF37]/20 border border-[#D4AF37]/50 text-[#FFF3B0]',
    primaryButton:
      'bg-gradient-to-r from-[#8E6D28] via-[#E1C47D] to-[#C5A059] hover:brightness-110 text-black font-extrabold shadow-lg',
    secondaryButton:
      'bg-[#12131A] hover:bg-[#1B1D26] border border-[#8E6D28]/40 text-gray-200 font-semibold',
    dangerButton:
      'bg-rose-950/60 hover:bg-rose-900/70 border border-rose-500/40 text-rose-200 font-semibold',
  };
}
