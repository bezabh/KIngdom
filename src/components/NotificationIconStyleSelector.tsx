import React, { useState, useEffect } from 'react';
import { 
  NOTIFICATION_CATEGORIES, 
  NotificationCategoryConfig, 
  NotificationIconStyleOption, 
  CategoryIconStyleMap,
  loadSavedNotificationStyles, 
  saveNotificationStyles, 
  getSelectedStyleForCategory,
  getDefaultNotificationStyles
} from '../data/notificationIconStyles';
import { 
  Sparkles, Cpu, Scroll, Landmark, PenTool, Wallet, Coins, Send, Lock, 
  Crown, BookOpen, Music, Shield, Fingerprint, Activity, Award, Flame, Radio,
  Check, RefreshCw, Smartphone, Bell, Layers, CheckCircle2, ChevronRight, Eye
} from 'lucide-react';

interface NotificationIconStyleSelectorProps {
  onStyleChange?: (styles: CategoryIconStyleMap) => void;
  onDispatchTestPush?: (category: NotificationCategoryConfig, style: NotificationIconStyleOption) => void;
  isCompact?: boolean;
}

export const NotificationIconStyleSelector: React.FC<NotificationIconStyleSelectorProps> = ({
  onStyleChange,
  onDispatchTestPush,
  isCompact = false
}) => {
  const [selectedStyles, setSelectedStyles] = useState<CategoryIconStyleMap>(loadSavedNotificationStyles);
  const [activeCategoryId, setActiveCategoryId] = useState<string>(NOTIFICATION_CATEGORIES[0].id);
  const [syncedNotificationToast, setSyncedNotificationToast] = useState<string | null>(null);

  useEffect(() => {
    saveNotificationStyles(selectedStyles);
    if (onStyleChange) {
      onStyleChange(selectedStyles);
    }
  }, [selectedStyles, onStyleChange]);

  const activeCategory = NOTIFICATION_CATEGORIES.find(c => c.id === activeCategoryId) || NOTIFICATION_CATEGORIES[0];
  const activeSelectedStyle = getSelectedStyleForCategory(activeCategory.id, selectedStyles);

  const handleSelectStyle = (categoryId: string, styleId: string) => {
    setSelectedStyles(prev => {
      const updated = { ...prev, [categoryId]: styleId };
      return updated;
    });

    const category = NOTIFICATION_CATEGORIES.find(c => c.id === categoryId);
    const style = category?.styles.find(s => s.id === styleId);
    if (style) {
      setSyncedNotificationToast(`Updated ${category?.name} icon to "${style.name}"`);
      setTimeout(() => setSyncedNotificationToast(null), 3000);
    }
  };

  const handleResetDefaults = () => {
    const defaults = getDefaultNotificationStyles();
    setSelectedStyles(defaults);
    setSyncedNotificationToast('Reset all notification icon styles to Imperial Defaults');
    setTimeout(() => setSyncedNotificationToast(null), 3000);
  };

  // Helper icon renderer
  const renderIconComponent = (iconName: string, className: string = 'w-4 h-4') => {
    switch (iconName) {
      case 'Sparkles': return <Sparkles className={className} />;
      case 'Cpu': return <Cpu className={className} />;
      case 'Scroll': return <Scroll className={className} />;
      case 'Landmark': return <Landmark className={className} />;
      case 'PenTool': return <PenTool className={className} />;
      case 'Wallet': return <Wallet className={className} />;
      case 'Coins': return <Coins className={className} />;
      case 'Send': return <Send className={className} />;
      case 'Lock': return <Lock className={className} />;
      case 'Crown': return <Crown className={className} />;
      case 'BookOpen': return <BookOpen className={className} />;
      case 'Music': return <Music className={className} />;
      case 'Shield': return <Shield className={className} />;
      case 'Fingerprint': return <Fingerprint className={className} />;
      case 'Activity': return <Activity className={className} />;
      case 'Award': return <Award className={className} />;
      case 'Flame': return <Flame className={className} />;
      case 'Radio': return <Radio className={className} />;
      default: return <Sparkles className={className} />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Reset Action */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white flex items-center space-x-1.5">
              <span>OneSignal Custom Icon Styles</span>
              <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-mono">
                Category-Based
              </span>
            </h3>
            <p className="text-[10px] text-slate-400">
              Customize status bar emblems &amp; notification drawer icons by event category
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleResetDefaults}
          className="px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-amber-300 text-[10px] font-mono flex items-center space-x-1 transition-colors cursor-pointer"
          title="Reset to Imperial defaults"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>

      {/* Category Pills Navigation */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-800">
        {NOTIFICATION_CATEGORIES.map(category => {
          const isCurrentActive = category.id === activeCategoryId;
          const currentStyle = getSelectedStyleForCategory(category.id, selectedStyles);

          return (
            <button
              key={category.id}
              type="button"
              onClick={() => setActiveCategoryId(category.id)}
              className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 cursor-pointer border ${
                isCurrentActive
                  ? 'bg-amber-500/20 border-amber-400/80 text-amber-200 shadow-sm'
                  : 'bg-[#120D24] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <span className="text-xs">{currentStyle.previewEmoji}</span>
              <span className="truncate max-w-[120px]">{category.name.split('&')[0]}</span>
              {isCurrentActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Category Details & Style Options Grid */}
      <div className="p-3.5 rounded-2xl bg-[#140F24] border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-amber-300 flex items-center space-x-1.5">
              <span>{activeCategory.name}</span>
              <span className="text-[10px] text-slate-400 font-normal">({activeCategory.nameTi})</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {activeCategory.description}
            </p>
          </div>
          <span className="text-[9px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
            {activeCategory.styles.length} Styles
          </span>
        </div>

        {/* Style Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {activeCategory.styles.map(style => {
            const isSelected = activeSelectedStyle.id === style.id;

            return (
              <div
                key={style.id}
                onClick={() => handleSelectStyle(activeCategory.id, style.id)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                  isSelected
                    ? 'bg-gradient-to-br from-[#24173D] to-[#170E2B] border-amber-400 shadow-md ring-1 ring-amber-400/30'
                    : 'bg-[#0E091B] border-slate-800 hover:border-slate-700 hover:bg-[#130D24]'
                }`}
              >
                <div className="flex items-start space-x-2.5">
                  {/* Style Icon Badge */}
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${style.badgeBg} ${style.badgeBorder} ${style.badgeTextColor}`}
                  >
                    {renderIconComponent(style.iconName, 'w-4 h-4')}
                  </div>

                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center space-x-1">
                      <span className="text-[11px] font-bold text-white truncate">
                        {style.name}
                      </span>
                    </div>
                    <div className="text-[9.5px] text-amber-300/80 font-serif truncate">
                      {style.nameTi}
                    </div>
                    <p className="text-[9px] text-slate-400 mt-1 leading-snug line-clamp-2">
                      {style.description}
                    </p>
                  </div>
                </div>

                {/* Android Resource & Color Footer */}
                <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[8.5px] font-mono text-slate-400">
                  <span className="truncate mr-1 text-slate-400">
                    res: <span className="text-amber-200">{style.drawableName}</span>
                  </span>
                  <div className="flex items-center space-x-1 shrink-0">
                    <span
                      className="w-2 h-2 rounded-full border border-black/40"
                      style={{ backgroundColor: style.accentColor }}
                    />
                    <span>{style.accentColor}</span>
                  </div>
                </div>

                {/* Selected Checkmark Badge */}
                {isSelected && (
                  <div className="absolute top-2 right-2 p-0.5 rounded-full bg-amber-400 text-slate-950">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Android 15 Notification Preview Card */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#120E21] to-[#0A0714] border border-amber-500/30 space-y-2.5 shadow-lg">
        <div className="flex items-center justify-between text-[11px] font-bold text-white">
          <div className="flex items-center space-x-1.5">
            <Smartphone className="w-3.5 h-3.5 text-amber-400" />
            <span>Android Status Bar &amp; Drawer Preview</span>
          </div>
          <span className="text-[9px] font-mono text-emerald-400 flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>OneSignal v5.x Payload</span>
          </span>
        </div>

        {/* Emulated Android Notification Card */}
        <div className="p-3 rounded-xl bg-[#1A142E] border border-slate-700/80 shadow-md space-y-2">
          {/* Status Bar Top Line */}
          <div className="flex items-center justify-between text-[10px]">
            <div className="flex items-center space-x-1.5">
              <div
                className={`w-4 h-4 rounded-md flex items-center justify-center text-[9px] font-bold ${activeSelectedStyle.badgeBg} ${activeSelectedStyle.badgeTextColor}`}
              >
                {renderIconComponent(activeSelectedStyle.iconName, 'w-2.5 h-2.5')}
              </div>
              <span className="font-bold text-slate-200">Axumite AI</span>
              <span className="text-slate-500">•</span>
              <span className="text-[9px] font-mono text-slate-400">{activeCategory.name}</span>
            </div>
            <span className="text-[9px] text-slate-400 font-mono">now</span>
          </div>

          {/* Notification Body Content */}
          <div className="flex items-start space-x-2.5 pl-0.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border shadow-sm"
              style={{
                backgroundColor: `${activeSelectedStyle.accentColor}20`,
                borderColor: `${activeSelectedStyle.accentColor}60`,
                color: activeSelectedStyle.accentColor
              }}
            >
              {renderIconComponent(activeSelectedStyle.iconName, 'w-4 h-4')}
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-bold text-white flex items-center space-x-1">
                <span>{activeSelectedStyle.nameTi}</span>
                <span className="text-slate-400 font-normal text-[10px]">({activeCategory.name})</span>
              </div>
              <p className="text-[10px] text-slate-300 leading-snug mt-0.5">
                {activeCategory.id === 'ai_chat' && '«ናይ ትግርኛ ድምጺ ትእዛዝ ብትክክል ተተርጒሙ» — ዝርርብ ንምቕጻል ንካእ።'}
                {activeCategory.id === 'geez_ocr' && 'ጥንታዊ ናይ ዕዛና ጽሑፍ ተነቢቡ። ፪፻፶ ቃላት ተተርጒሞም ኣለዉ።'}
                {activeCategory.id === 'telebirr_finance' && '750.00 ETB ካብ ቴሌብር ተቐቢልኩም። ሓድሽ ዝተረፈ፡ 5,600.75 ETB።'}
                {activeCategory.id === 'cultural_heritage' && 'ዕለታዊ ምስላ ኣክሱም፡ «ዘኢተማህረ አይነግሥ፡ ዘኢተጋደለ አይከብር»'}
                {activeCategory.id === 'security_system' && 'Android 15 StrongBox TEE ባዮሜትሪክ መርመራ ብዓወት ሓሊፉ።'}
              </p>
            </div>
          </div>

          {/* Quick Action Buttons in Notification */}
          <div className="flex items-center space-x-2 pt-1 border-t border-slate-800/60 text-[9px] font-mono">
            <span
              className="px-2 py-0.5 rounded-lg border text-white font-bold"
              style={{
                backgroundColor: `${activeSelectedStyle.accentColor}30`,
                borderColor: `${activeSelectedStyle.accentColor}50`
              }}
            >
              Open In App
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-400">
              Dismiss
            </span>
          </div>
        </div>

        {/* Push Dispatcher Button for this Category & Style */}
        {onDispatchTestPush && (
          <button
            type="button"
            onClick={() => onDispatchTestPush(activeCategory, activeSelectedStyle)}
            className="w-full py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-bold text-xs transition-all cursor-pointer shadow-md flex items-center justify-center space-x-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>
              Test Push Alert With &quot;{activeSelectedStyle.name}&quot; ({activeCategory.name.split('&')[0]})
            </span>
          </button>
        )}
      </div>

      {/* Sync Status Toast Feedback */}
      {syncedNotificationToast && (
        <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>{syncedNotificationToast}</span>
        </div>
      )}
    </div>
  );
};
