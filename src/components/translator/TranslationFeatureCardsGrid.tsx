import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  AudioLines,
  Camera,
  Check,
  MessagesSquare,
  Monitor,
  PhoneCall,
  WifiOff,
} from 'lucide-react';
import { getDownloadedPacks } from '../../services/offlinePackService';
import { triggerTabTapHaptic } from '../../utils/haptics';
import {
  FEATURE_CUSTOM_ICONS,
  FeatureIconMedallion,
  getFeatureAccentText,
  getFeatureHoverTitleClass,
  getFeatureTitleColor,
  getFeatureWatermarkClass,
} from './TranslatorFeatureIcons';

export type TranslatorFeatureId =
  | 'conversation'
  | 'screen-capture'
  | 'call-translation'
  | 'camera-ocr'
  | 'voice-translation'
  | 'offline-translation';

export type TranslatorFeatureView = 'hub' | TranslatorFeatureId;
export type TranslatorUiLanguage = 'ti' | 'en';
export type FeatureDisplayMode = 'icons' | 'detailed';

export interface TranslationFeatureCardItem {
  id: TranslatorFeatureId;
  index: string;
  title: string;
  titleTi: string;
  taglineEn: string;
  taglineTi: string;
  capabilities: readonly string[];
  capabilitiesTi: readonly string[];
  actionLabel: string;
  actionLabelTi: string;
  icon: React.FC<{ className?: string }>;
}

export const TRANSLATION_FEATURE_CARDS: readonly TranslationFeatureCardItem[] = [
  {
    id: 'conversation',
    index: '01',
    title: 'Conversation Translation',
    titleTi: 'ትርጉም ዕላል',
    taglineEn: 'Live two-person dialogue & subtitles',
    taglineTi: 'ክልተ ሰባት ብቐጥታ ዝዘራረብሉ ትርጉም ዕላል',
    capabilities: [
      'Real-time two-person conversations.',
      'Automatic speech recognition.',
      'Two-language conversation mode.',
      'Live translated subtitles.',
    ],
    capabilitiesTi: [
      'ናይ ክልተ ሰባት ቀጥታዊ ዕላል።',
      'ባዕሉ ዝፈልጥ ምልላይ ድምጺ።',
      'ብኽልተ ቋንቋ ዝሰርሕ መስርሕ ዕላል።',
      'ቀጥታዊ ዝተተርጎመ ጽሑፍ (Subtitles)።',
    ],
    actionLabel: 'Open conversation',
    actionLabelTi: 'ዕላል ክፈት',
    icon: MessagesSquare,
  },
  {
    id: 'screen-capture',
    index: '02',
    title: 'Screen Translation',
    titleTi: 'ትርጉም ስክሪን',
    taglineEn: 'Capture & translate on-screen OCR',
    taglineTi: 'ኣብ ስክሪን ዘሎ ጽሑፍ ብOCR ቅጽበታዊ ትርጉም',
    capabilities: [
      'Capture and translate screen content.',
      'Translate text from supported applications.',
      'OCR technology.',
    ],
    capabilitiesTi: [
      'ኣብ ስክሪን ዘሎ ትሕዝቶ ቀሪጽካ ተርጉም።',
      'ካብ ዝተፈላለዩ ኣፕሊኬሽናት ጽሑፍ ተርጉም።',
      'ዘመናዊ OCR ቴክኖሎጂ ምንባብ ጽሑፍ።',
    ],
    actionLabel: 'Capture screen',
    actionLabelTi: 'ስክሪን ቅረጽ',
    icon: Monitor,
  },
  {
    id: 'call-translation',
    index: '03',
    title: 'Call Translation',
    titleTi: 'ትርጉም ጻውዒት',
    taglineEn: 'In-app voice calls & live subtitles',
    taglineTi: 'ቀጥታዊ ጻውዒት ድምጺ ምስ ትርጉም ጽሑፍ',
    capabilities: [
      'In-app voice calls.',
      'Real-time speech translation.',
      'Live subtitles for both participants.',
    ],
    capabilitiesTi: [
      'ኣብ ውሽጢ ኣፕ ዝግበር ጻውዒት ድምጺ።',
      'ቀጥታዊ ናይ ዘረባ ትርጉም።',
      'ንኽልቲኦም ተዛረብቲ ቀጥታዊ ትርጉም ጽሑፍ።',
    ],
    actionLabel: 'Start voice call',
    actionLabelTi: 'ጻውዒት ጀምር',
    icon: PhoneCall,
  },
  {
    id: 'camera-ocr',
    index: '04',
    title: 'Camera Translation',
    titleTi: 'ትርጉም ካሜራ',
    taglineEn: 'Scan signs, menus & documents',
    taglineTi: 'ሰነዳትን ምልክታትን ብካሜራ ስካን ትርጉም',
    capabilities: [
      'Scan documents and signs.',
      'Extract text using OCR.',
      'Translate text directly from photographs.',
    ],
    capabilitiesTi: [
      'ሰነዳት፡ ጽሑፋትን ምልክታትን ቅረጽ።',
      'ብ OCR ቴክኖሎጂ ጽሑፍ ብትኽክል ኣውጽእ።',
      'ካብ ስእልታት ብቐጥታ ናብ ትግርኛ ተርጉም።',
    ],
    actionLabel: 'Open camera OCR',
    actionLabelTi: 'ካሜራ OCR ክፈት',
    icon: Camera,
  },
  {
    id: 'voice-translation',
    index: '05',
    title: 'Voice Translation',
    titleTi: 'ትርጉም ድምጺ',
    taglineEn: 'Speech-to-text & natural AI voice',
    taglineTi: 'ድምጺ ናብ ጽሑፍን ጽሑፍ ናብ AI ድምጽን',
    capabilities: [
      'Speech-to-text conversion.',
      'Text-to-speech output.',
      'Natural AI voices.',
      'Voice pronunciation.',
    ],
    capabilitiesTi: [
      'ድምጺ ናብ ጽሑፍ ምቕያር (Speech-to-Text)።',
      'ጽሑፍ ናብ ድምጺ ምንባብ (Text-to-Speech)።',
      'ባህርያውን ንጹርን AI ድምጽታት።',
      'ልክዕ ኣደማምጻ ቃላትን ፊደላትን።',
    ],
    actionLabel: 'Launch voice studio',
    actionLabelTi: 'ስቱድዮ ድምጺ ክፈት',
    icon: AudioLines,
  },
  {
    id: 'offline-translation',
    index: '06',
    title: 'Offline Translation',
    titleTi: 'ብዘይ ኢንተርነት',
    taglineEn: 'Download packs for offline use',
    taglineTi: 'ናይ ቋንቋ ፓኬጃት ብዘይ ኔትዎርክ ምትርጓም',
    capabilities: [
      'Download language packages.',
      'Translate without internet.',
      'Manage downloaded languages.',
    ],
    capabilitiesTi: [
      'ናይ ቋንቋ ፓኬጃት ኣውርድ (Download)።',
      'ብዘይ ኢንተርነት ኣብ ዝኾነ ቦታ ተርጉም።',
      'ዝወረዱ ቋንቋታት ኣመሓድር።',
    ],
    actionLabel: 'Manage packages',
    actionLabelTi: 'ፓኬጃት ኣመሓድር',
    icon: WifiOff,
  },
] as const;

export type FeatureCardsSurfaceVariant = 'cream' | 'dark' | 'premiere';

interface TranslationFeatureCardsGridProps {
  onSelectFeature: (feature: TranslatorFeatureId) => void;
  variant?: FeatureCardsSurfaceVariant;
  isOfflineActive?: boolean;
  downloadedPacksCount?: number | null;
  compact?: boolean;
  seamless?: boolean;
  showHeader?: boolean;
  showTigrinyaSubtitles?: boolean;
  language?: TranslatorUiLanguage;
  defaultLanguage?: TranslatorUiLanguage;
  onLanguageChange?: (lang: TranslatorUiLanguage) => void;
  defaultViewMode?: FeatureDisplayMode;
  headerTitle?: string;
  headerSubtitle?: string;
  onOpenFullHub?: () => void;
}

const SURFACE_PALETTES: Record<
  FeatureCardsSurfaceVariant,
  {
    tileCard: string;
    detailCard: string;
    title: string;
    subtitle: string;
    meta: string;
    bulletText: string;
    footerBorder: string;
  }
> = {
  dark: {
    tileCard:
      'bg-[#110D22]/95 hover:bg-[#171230] border border-[#8E6D28]/35 hover:border-[#C5A059]/75 shadow-md focus-visible:ring-[#E1C47D] focus-visible:ring-offset-[#07070A]',
    detailCard:
      'bg-[#110D22]/95 hover:bg-[#171230] border border-[#8E6D28]/35 hover:border-[#C5A059]/75 shadow-md focus-visible:ring-[#E1C47D] focus-visible:ring-offset-[#07070A]',
    title: 'text-white',
    subtitle: 'text-slate-400',
    meta: 'text-amber-300/75',
    bulletText: 'text-slate-300',
    footerBorder: 'border-[#8E6D28]/25',
  },
  premiere: {
    tileCard:
      'bg-[#FFFDF8]/95 hover:bg-white border border-[#E5D7B6] hover:border-[#C5A059] shadow-[0_6px_22px_rgba(30,22,8,0.06)] hover:shadow-[0_12px_30px_rgba(140,104,20,0.12)] hover:-translate-y-0.5 focus-visible:ring-[#C5A059] focus-visible:ring-offset-[#F4ECD8]',
    detailCard:
      'bg-[#FFFDF8]/95 hover:bg-white border border-[#E5D7B6] hover:border-[#C5A059] shadow-[0_6px_22px_rgba(30,22,8,0.06)] focus-visible:ring-[#C5A059] focus-visible:ring-offset-[#F4ECD8]',
    title: 'text-[#241C0F]',
    subtitle: 'text-[#524632]',
    meta: 'text-[#9A6F09]',
    bulletText: 'text-[#3F3524]',
    footerBorder: 'border-[#E6D9BB]',
  },
  cream: {
    tileCard:
      'bg-[#FFFDF8]/95 hover:bg-white border border-[#E5D7B6] hover:border-[#C5A059] shadow-[0_6px_22px_rgba(30,22,8,0.06)] hover:shadow-[0_12px_30px_rgba(140,104,20,0.12)] hover:-translate-y-0.5 focus-visible:ring-[#C5A059] focus-visible:ring-offset-[#FAF6EE]',
    detailCard:
      'bg-[#FFFDF8]/95 hover:bg-white border border-[#E5D7B6] hover:border-[#C5A059] shadow-[0_6px_22px_rgba(30,22,8,0.06)] focus-visible:ring-[#C5A059] focus-visible:ring-offset-[#FAF6EE]',
    title: 'text-[#241C0F]',
    subtitle: 'text-[#524632]',
    meta: 'text-[#8C6408]',
    bulletText: 'text-[#3F3524]',
    footerBorder: 'border-[#E6D9BB]',
  },
};

export const TranslationFeatureCardsGrid: React.FC<TranslationFeatureCardsGridProps> = ({
  onSelectFeature,
  variant = 'dark' as FeatureCardsSurfaceVariant,
  isOfflineActive = false,
  downloadedPacksCount,
  compact = false,
  seamless = false,
  language,
  defaultLanguage = 'ti' as TranslatorUiLanguage,
  defaultViewMode = 'icons' as FeatureDisplayMode,
  headerTitle,
}) => {
  const activeLang: TranslatorUiLanguage = language ?? defaultLanguage;
  const isTi = activeLang === 'ti';
  const viewMode: FeatureDisplayMode = defaultViewMode;

  const [resolvedPackCount, setResolvedPackCount] = useState<number | null>(
    downloadedPacksCount !== undefined ? downloadedPacksCount : null
  );

  useEffect(() => {
    if (downloadedPacksCount !== undefined) {
      setResolvedPackCount(downloadedPacksCount);
      return;
    }

    let active = true;
    getDownloadedPacks()
      .then((packs) => {
        if (active) setResolvedPackCount(packs.length);
      })
      .catch(() => {
        if (active) setResolvedPackCount(0);
      });

    return () => {
      active = false;
    };
  }, [downloadedPacksCount]);

  const s = SURFACE_PALETTES[variant];

  const resolvedTitle =
    headerTitle ?? (isTi ? 'ቀንዲ ናይ ትርጉም ባህርያት' : 'Main Translation Features');

  const getDescriptionLine = (card: TranslationFeatureCardItem): string => {
    if (card.id === 'offline-translation') {
      if (isOfflineActive) {
        return isTi
          ? 'ብዘይ ኢንተርነት ኣብ ስራሕ ኣሎ (Offline Active)'
          : 'Offline translation engine active';
      }
      if (typeof resolvedPackCount === 'number' && resolvedPackCount > 0) {
        return isTi
          ? `${resolvedPackCount} ናይ ቋንቋ ${resolvedPackCount === 1 ? 'ፓኬጅ' : 'ፓኬጃት'} ተዳልዩ ኣሎ`
          : `${resolvedPackCount} offline ${resolvedPackCount === 1 ? 'pack' : 'packs'} ready`;
      }
    }
    return isTi ? card.taglineTi : card.taglineEn;
  };

  const getRightMetaLabel = (card: TranslationFeatureCardItem): string => {
    if (card.id === 'offline-translation') {
      if (isOfflineActive) return isTi ? 'ብዘይ ኢንተርነት' : 'Offline Active';
      if (typeof resolvedPackCount === 'number' && resolvedPackCount > 0) {
        return isTi
          ? `${resolvedPackCount} ፓኬጅ`
          : `${resolvedPackCount} ${resolvedPackCount === 1 ? 'pack' : 'packs'}`;
      }
    }
    return card.index;
  };

  const renderIconCards = () =>
    TRANSLATION_FEATURE_CARDS.map((card) => {
      const primaryTitle = isTi ? card.titleTi : card.title;
      const descriptionLine = getDescriptionLine(card);
      const WatermarkIcon = FEATURE_CUSTOM_ICONS[card.id];
      const titleColorClass = getFeatureTitleColor(variant, card.id);
      const hoverTitleClass = getFeatureHoverTitleClass(variant, card.id);
      const watermarkClass = getFeatureWatermarkClass(variant, card.id);
      const isParchment = variant === 'premiere' || variant === 'cream';

      const cardDims = isParchment
        ? 'rounded-3xl min-h-[144px] p-4 sm:p-5'
        : compact
          ? 'rounded-2xl min-h-[126px] p-3.5'
          : 'rounded-2xl min-h-[132px] p-3.5 sm:p-4';

      return (
        <button
          key={card.id}
          type="button"
          onClick={() => {
            triggerTabTapHaptic();
            onSelectFeature(card.id);
          }}
          aria-label={`${primaryTitle} — ${descriptionLine}`}
          className={`group text-left relative overflow-hidden cursor-pointer flex flex-col justify-between transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${cardDims} ${s.tileCard}`}
        >
          {isParchment && (
            <div
              className="absolute inset-0 pointer-events-none opacity-55 bg-[repeating-linear-gradient(45deg,rgba(181,137,27,0.025)_0px,rgba(181,137,27,0.025)_1px,transparent_1px,transparent_14px)]"
              aria-hidden="true"
            />
          )}

          <div
            className={`absolute right-0 bottom-0 select-none pointer-events-none translate-x-1 translate-y-1 ${watermarkClass}`}
            aria-hidden="true"
          >
            <WatermarkIcon className="w-16 h-16" />
          </div>

          <div className="relative z-10">
            <FeatureIconMedallion
              featureId={card.id}
              variant={variant}
              size="lg"
            />
          </div>

          <div className="space-y-1 relative z-10 mt-3">
            <h4
              className={`font-extrabold text-[15px] leading-snug transition-colors ${
                isTi ? 'font-ethiopic' : ''
              } ${titleColorClass} ${hoverTitleClass}`}
            >
              {primaryTitle}
            </h4>
            <p
              className={`text-[11.5px] leading-snug ${
                isTi ? 'font-ethiopic' : ''
              } ${s.subtitle}`}
            >
              {descriptionLine}
            </p>
          </div>
        </button>
      );
    });

  if (viewMode === 'icons') {
    if (seamless) {
      return <>{renderIconCards()}</>;
    }

    return (
      <section
        aria-label={resolvedTitle}
        className={
          variant === 'premiere'
            ? 'grid grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-4'
            : compact
              ? 'grid grid-cols-2 gap-3.5'
              : 'grid grid-cols-2 lg:grid-cols-3 gap-3'
        }
      >
        {renderIconCards()}
      </section>
    );
  }

  return (
    <section
      aria-label={resolvedTitle}
      className={
        compact
          ? 'grid grid-cols-1 gap-3'
          : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5'
      }
    >
      {TRANSLATION_FEATURE_CARDS.map((card) => {
        const titleText = isTi ? card.titleTi : card.title;
        const secondaryTitle = isTi ? card.taglineTi : card.taglineEn;
        const capabilitiesList = isTi ? card.capabilitiesTi : card.capabilities;
        const actionText = isTi ? card.actionLabelTi : card.actionLabel;
        const metaLabel = getRightMetaLabel(card);
        const accentClass = getFeatureAccentText(variant, card.id);
        const isOfflineMetaAccent =
          card.id === 'offline-translation' &&
          (isOfflineActive || (typeof resolvedPackCount === 'number' && resolvedPackCount > 0));

        return (
          <button
            key={card.id}
            type="button"
            onClick={() => {
              triggerTabTapHaptic();
              onSelectFeature(card.id);
            }}
            aria-label={`${titleText}: ${capabilitiesList.join(' ')}`}
            className={`group text-left rounded-2xl p-4 sm:p-5 h-full min-h-[44px] flex flex-col justify-between gap-4 transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.99] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${s.detailCard}`}
          >
            <div className="space-y-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <FeatureIconMedallion featureId={card.id} variant={variant} size="md" />
                  <div className="min-w-0">
                    <h3
                      className={`text-sm font-bold tracking-tight leading-snug ${
                        isTi ? 'font-ethiopic' : ''
                      } ${s.title}`}
                    >
                      {titleText}
                    </h3>
                    <p
                      className={`text-[11px] leading-snug mt-0.5 ${
                        isTi ? 'font-ethiopic' : ''
                      } ${s.subtitle}`}
                    >
                      {secondaryTitle}
                    </p>
                  </div>
                </div>

                <span
                  className={`font-mono tabular-nums text-[11px] font-semibold shrink-0 pt-0.5 ${
                    isOfflineMetaAccent ? accentClass : s.meta
                  }`}
                >
                  {metaLabel}
                </span>
              </div>

              <ul className="space-y-1.5" aria-label={titleText}>
                {capabilitiesList.map((point) => (
                  <li
                    key={point}
                    className={`flex items-start gap-2 text-xs leading-relaxed ${
                      isTi ? 'font-ethiopic' : ''
                    } ${s.bulletText}`}
                  >
                    <Check
                      className={`w-3.5 h-3.5 shrink-0 mt-0.5 stroke-[2.5] ${accentClass}`}
                      aria-hidden="true"
                    />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div
              className={`pt-3 border-t flex items-center justify-between text-xs font-bold ${
                isTi ? 'font-ethiopic' : ''
              } ${s.footerBorder} ${accentClass}`}
            >
              <span>{actionText}</span>
              <ArrowRight
                className="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </div>
          </button>
        );
      })}
    </section>
  );
};
