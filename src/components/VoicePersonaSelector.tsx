import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Check, Volume2, Play, Square, Sliders, Loader2 } from 'lucide-react';
import {
  VoicePersonaId,
  VoicePersona,
  VOICE_PERSONAS,
  getVoicePersona,
  getStoredVoicePersonaSettings,
  saveVoicePersonaSettings,
  VOICE_PERSONA_UPDATED_EVENT,
  VoicePersonaSettings,
} from '../types/voicePersona';
import { useLanguage } from '../context/LanguageContext';
import { playCommandSuccessChime } from '../utils/audioChime';
import { base64PcmToWavDataUrl } from '../utils/welcomeAudioService';

interface VoicePersonaSelectorProps {
  selectedPersonaId?: VoicePersonaId;
  onSelectPersona: (personaId: VoicePersonaId) => void;
  pitchMultiplier?: number;
  rateMultiplier?: number;
  onChangeTuning?: (tuning: { pitchMultiplier: number; rateMultiplier: number }) => void;
  compact?: boolean;
  theme?: 'dark' | 'light';
}

export const VoicePersonaSelector: React.FC<VoicePersonaSelectorProps> = ({
  selectedPersonaId = 'ancient_historian' as VoicePersonaId,
  onSelectPersona,
  pitchMultiplier,
  rateMultiplier,
  onChangeTuning,
  compact = false,
  theme = 'dark',
}) => {
  const { language } = useLanguage();
  const isTigrinya = language === 'ti' || language === 'ti_tg';

  const [playingPersonaId, setPlayingPersonaId] = useState<VoicePersonaId | null>(null);
  const [loadingPersonaId, setLoadingPersonaId] = useState<VoicePersonaId | null>(null);
  const [activeTab, setActiveTab] = useState<'personas' | 'fine-tune'>('personas');

  const initialSettings = getStoredVoicePersonaSettings();
  const [customPitch, setCustomPitch] = useState<number>(
    pitchMultiplier !== undefined ? pitchMultiplier : initialSettings.pitchMultiplier
  );
  const [customRate, setCustomRate] = useState<number>(
    rateMultiplier !== undefined ? rateMultiplier : initialSettings.rateMultiplier
  );

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const previewAbortRef = useRef<AbortController | null>(null);

  // Sync controlled tuning props if provided by parent
  useEffect(() => {
    if (pitchMultiplier !== undefined) setCustomPitch(pitchMultiplier);
  }, [pitchMultiplier]);

  useEffect(() => {
    if (rateMultiplier !== undefined) setCustomRate(rateMultiplier);
  }, [rateMultiplier]);

  // Listen to cross-component voice persona tuning updates
  useEffect(() => {
    const onPersonaUpdated = (evt: Event) => {
      const custom = evt as CustomEvent<VoicePersonaSettings>;
      if (!custom.detail) return;
      if (pitchMultiplier === undefined) setCustomPitch(custom.detail.pitchMultiplier);
      if (rateMultiplier === undefined) setCustomRate(custom.detail.rateMultiplier);
    };
    window.addEventListener(VOICE_PERSONA_UPDATED_EVENT, onPersonaUpdated);
    return () => window.removeEventListener(VOICE_PERSONA_UPDATED_EVENT, onPersonaUpdated);
  }, [pitchMultiplier, rateMultiplier]);

  const stopActivePreview = useCallback(() => {
    if (previewAbortRef.current) {
      previewAbortRef.current.abort();
      previewAbortRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (audioUrlRef.current && audioUrlRef.current.startsWith('blob:')) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setLoadingPersonaId(null);
    setPlayingPersonaId(null);
  }, []);

  useEffect(() => {
    return () => {
      stopActivePreview();
    };
  }, [stopActivePreview]);

  const activePersona = getVoicePersona(selectedPersonaId);

  const playBrowserSpeechPreview = useCallback(
    (persona: VoicePersona, sampleText: string) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        setPlayingPersonaId(null);
        setLoadingPersonaId(null);
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(sampleText);
      utterance.pitch = Math.max(0.5, Math.min(2.0, persona.speechPitch * customPitch));
      utterance.rate = Math.max(0.6, Math.min(1.8, persona.speechRate * customRate));
      utterance.lang = isTigrinya ? 'ti-ET' : 'en-US';

      utterance.onstart = () => {
        setLoadingPersonaId(null);
        setPlayingPersonaId(persona.id);
      };
      utterance.onend = () => {
        setPlayingPersonaId(null);
        setLoadingPersonaId(null);
      };
      utterance.onerror = () => {
        setPlayingPersonaId(null);
        setLoadingPersonaId(null);
      };

      setLoadingPersonaId(null);
      setPlayingPersonaId(persona.id);
      window.speechSynthesis.speak(utterance);
    },
    [customPitch, customRate, isTigrinya]
  );

  // Preview audio sample using Gemini 3.8 TTS persona voice with instant Web Speech fallback
  const handlePlaySample = async (persona: VoicePersona, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (playingPersonaId === persona.id || loadingPersonaId === persona.id) {
      stopActivePreview();
      return;
    }

    stopActivePreview();
    setLoadingPersonaId(persona.id);

    const sampleText = isTigrinya ? persona.sampleGreetingTi : persona.sampleGreetingEn;
    const controller = new AbortController();
    previewAbortRef.current = controller;

    try {
      const response = await fetch('/api/obelisk/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          text: sampleText,
          voice: persona.geminiVoiceName,
          personaId: persona.id,
          style: persona.speechStylePrompt,
          language: isTigrinya ? 'Tigrinya' : 'English',
        }),
      });

      if (controller.signal.aborted) return;

      const data = await response.json().catch(() => null);
      if (data?.audioBase64) {
        const audioUrl = base64PcmToWavDataUrl(data.audioBase64, data.sampleRate || 24000);
        audioUrlRef.current = audioUrl;
        const audio = new Audio(audioUrl);
        audio.playbackRate = Math.max(0.75, Math.min(1.5, customRate));
        audioRef.current = audio;

        audio.onplay = () => {
          setLoadingPersonaId(null);
          setPlayingPersonaId(persona.id);
        };
        audio.onended = () => {
          setPlayingPersonaId(null);
          setLoadingPersonaId(null);
        };
        audio.onerror = () => {
          playBrowserSpeechPreview(persona, sampleText);
        };

        await audio.play();
        return;
      }

      playBrowserSpeechPreview(persona, sampleText);
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      playBrowserSpeechPreview(persona, sampleText);
    }
  };

  const handleSelect = (id: VoicePersonaId) => {
    saveVoicePersonaSettings({
      personaId: id,
      pitchMultiplier: customPitch,
      rateMultiplier: customRate,
    });
    onSelectPersona(id);
    playCommandSuccessChime();
  };

  const handleUpdateTuning = (nextPitch: number, nextRate: number) => {
    setCustomPitch(nextPitch);
    setCustomRate(nextRate);
    saveVoicePersonaSettings({
      personaId: activePersona.id,
      pitchMultiplier: nextPitch,
      rateMultiplier: nextRate,
    });
    onChangeTuning?.({ pitchMultiplier: nextPitch, rateMultiplier: nextRate });
  };

  const isDark = theme === 'dark';

  return (
    <div className={`space-y-4 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5">
            <h3
              className={`text-sm sm:text-base font-serif font-bold tracking-tight ${
                isDark ? 'text-[#F3E5AB]' : 'text-slate-900'
              }`}
            >
              {isTigrinya ? 'ናይ ድምጺ ኣክሱማይት AI ፐርሶና' : 'AI Voice Persona'}
            </h3>
            <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`} aria-hidden="true">
              ·
            </span>
            <span
              className={`text-xs font-medium ${
                isDark ? 'text-[#D4AF37]' : 'text-amber-800'
              }`}
            >
              {isTigrinya ? activePersona.nameTi : activePersona.name}
            </span>
          </div>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            {isTigrinya
              ? 'ናይ ድምጻዊ ረዳኢ ቃና፡ ባህርን ፍጥነትን ምረጹ'
              : 'Choose the conversational tone, cadence, and voice character for your voice assistant'}
          </p>
        </div>

        {/* Segmented Control: Personas vs Voice Tuning */}
        {!compact && (
          <div
            className={`inline-flex items-center gap-1 p-1 rounded-lg border shrink-0 self-start sm:self-auto ${
              isDark
                ? 'bg-[#090B12] border-slate-800'
                : 'bg-stone-100 border-stone-200'
            }`}
          >
            <button
              type="button"
              onClick={() => setActiveTab('personas')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] ${
                activeTab === 'personas'
                  ? isDark
                    ? 'bg-[#D4AF37] text-[#110D04]'
                    : 'bg-white text-slate-900 shadow-xs'
                  : isDark
                    ? 'text-slate-400 hover:text-slate-100'
                    : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isTigrinya ? 'ፐርሶናታት' : 'Personas'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('fine-tune')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] ${
                activeTab === 'fine-tune'
                  ? isDark
                    ? 'bg-[#D4AF37] text-[#110D04]'
                    : 'bg-white text-slate-900 shadow-xs'
                  : isDark
                    ? 'text-slate-400 hover:text-slate-100'
                    : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{isTigrinya ? 'ቅጥዒ ድምጺ' : 'Voice Tuning'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Mode 1: Persona Cards Grid */}
      {activeTab === 'personas' && (
        <div
          role="radiogroup"
          aria-label={isTigrinya ? 'ናይ ድምጺ ፐርሶና ምረጹ' : 'Select AI Voice Persona'}
          className={`grid gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}
        >
          {VOICE_PERSONAS.map((persona) => {
            const isSelected = selectedPersonaId === persona.id;
            const isPlaying = playingPersonaId === persona.id;
            const isLoading = loadingPersonaId === persona.id;

            return (
              <div
                key={persona.id}
                role="radio"
                aria-checked={isSelected}
                tabIndex={0}
                onClick={() => handleSelect(persona.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelect(persona.id);
                  }
                }}
                className={`relative rounded-xl p-4 border transition-all duration-150 cursor-pointer select-none text-left flex flex-col justify-between gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] ${
                  isSelected
                    ? isDark
                      ? 'bg-[#151322] border-[#D4AF37] ring-1 ring-[#D4AF37]/40'
                      : 'bg-amber-50/70 border-[#B88928] ring-1 ring-[#B88928]/30'
                    : isDark
                      ? 'bg-[#0B0D16] hover:bg-[#111423] border-slate-800 hover:border-amber-500/40'
                      : 'bg-white hover:bg-stone-50 border-stone-200 hover:border-amber-400/60'
                }`}
              >
                {/* Top Row: Identity & Selection State */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
                      style={{
                        backgroundColor: isDark ? '#181B2C' : '#F5F3EE',
                        border: `1px solid ${isSelected ? persona.accentColor : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'}`,
                      }}
                    >
                      {persona.avatarIcon}
                    </div>
                    <div className="min-w-0">
                      <h4
                        className={`text-sm font-bold font-serif truncate ${
                          isSelected
                            ? isDark
                              ? 'text-[#FFF3B0]'
                              : 'text-amber-950'
                            : isDark
                              ? 'text-slate-100'
                              : 'text-slate-900'
                        }`}
                      >
                        {isTigrinya ? persona.nameTi : persona.name}
                      </h4>
                      <div
                        className={`flex items-center gap-1.5 text-[11px] truncate ${
                          isDark ? 'text-slate-400' : 'text-slate-500'
                        }`}
                      >
                        <span>{persona.badge}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">{persona.geminiVoiceName}</span>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-[#D4AF37] text-[#110D04]'
                        : isDark
                          ? 'border border-slate-700'
                          : 'border border-stone-300'
                    }`}
                    aria-hidden="true"
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>

                {/* Tone Description */}
                <p
                  className={`text-xs leading-relaxed ${
                    isDark ? 'text-slate-300' : 'text-slate-600'
                  }`}
                >
                  {isTigrinya ? persona.toneDescriptionTi : persona.toneDescription}
                </p>

                {/* Bottom Row: Unboxed Acoustic Specs & Sample Preview Button */}
                <div
                  className={`pt-2.5 border-t flex items-center justify-between gap-2 ${
                    isDark ? 'border-slate-800/80' : 'border-stone-200/80'
                  }`}
                >
                  <div
                    className={`flex items-center gap-1.5 text-[11px] font-mono tabular-nums ${
                      isDark ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    <span>Pitch {(persona.speechPitch * customPitch).toFixed(2)}x</span>
                    <span aria-hidden="true">·</span>
                    <span>Speed {(persona.speechRate * customRate).toFixed(2)}x</span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handlePlaySample(persona, e)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] ${
                      isPlaying
                        ? 'bg-rose-600 text-white'
                        : isDark
                          ? 'bg-slate-800 hover:bg-amber-500/20 text-[#F3E5AB] border border-slate-700 hover:border-amber-400/50'
                          : 'bg-stone-100 hover:bg-amber-100 text-amber-900 border border-stone-200 hover:border-amber-400/60'
                    }`}
                    aria-label={
                      isPlaying
                        ? `Stop ${persona.name} preview`
                        : `Preview ${persona.name} voice`
                    }
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>{isTigrinya ? 'ይዳሎ...' : 'Loading'}</span>
                      </>
                    ) : isPlaying ? (
                      <>
                        <Square className="w-3 h-3 fill-current" />
                        <span>{isTigrinya ? 'ደው ኣብል' : 'Stop'}</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3 fill-current" />
                        <span>{isTigrinya ? 'ፈትን' : 'Preview'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Mode 2: Persisted Fine-Tuning Sliders */}
      {activeTab === 'fine-tune' && (
        <div
          className={`p-4 rounded-xl border space-y-4 ${
            isDark ? 'bg-[#0B0D16] border-slate-800' : 'bg-white border-stone-200'
          }`}
        >
          <div className="space-y-0.5">
            <h4
              className={`text-sm font-semibold ${
                isDark ? 'text-[#F3E5AB]' : 'text-slate-900'
              }`}
            >
              {isTigrinya ? 'ፍጥነትን ቃናን ድምጺ (Voice Rate & Pitch)' : 'Voice Rate & Pitch Tuning'}
            </h4>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {isTigrinya
                ? 'ናይ ኩሎም ፐርሶናታት ፍጥነትን ቃናን ብቀጥታ ይዕቀብን ኣብ ድምጻዊ ረዳኢ ይሰርሕን።'
                : 'Adjustments save automatically and apply directly to your voice assistant responses.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Speed / Rate Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="voice-persona-rate-slider" className="font-semibold">
                  {isTigrinya ? 'ፍጥነት ዘረባ (Speech Rate)' : 'Speech Rate'}
                </label>
                <span
                  className={`font-mono tabular-nums font-semibold ${
                    isDark ? 'text-[#D4AF37]' : 'text-amber-800'
                  }`}
                >
                  {customRate.toFixed(2)}x
                </span>
              </div>
              <input
                id="voice-persona-rate-slider"
                type="range"
                min="0.75"
                max="1.35"
                step="0.05"
                value={customRate}
                onChange={(e) => handleUpdateTuning(customPitch, parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-700/40 rounded-lg appearance-none cursor-pointer accent-[#D4AF37]"
              />
              <div className="flex justify-between text-[11px] text-slate-500 font-mono tabular-nums">
                <span>0.75x Deliberate</span>
                <span>1.00x Standard</span>
                <span>1.35x Rapid</span>
              </div>
            </div>

            {/* Pitch Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="voice-persona-pitch-slider" className="font-semibold">
                  {isTigrinya ? 'ቃና ድምጺ (Voice Pitch)' : 'Voice Pitch'}
                </label>
                <span
                  className={`font-mono tabular-nums font-semibold ${
                    isDark ? 'text-[#D4AF37]' : 'text-amber-800'
                  }`}
                >
                  {customPitch.toFixed(2)}x
                </span>
              </div>
              <input
                id="voice-persona-pitch-slider"
                type="range"
                min="0.80"
                max="1.25"
                step="0.05"
                value={customPitch}
                onChange={(e) => handleUpdateTuning(parseFloat(e.target.value), customRate)}
                className="w-full h-2 bg-slate-700/40 rounded-lg appearance-none cursor-pointer accent-[#D4AF37]"
              />
              <div className="flex justify-between text-[11px] text-slate-500 font-mono tabular-nums">
                <span>0.80x Deeper</span>
                <span>1.00x Natural</span>
                <span>1.25x Brighter</span>
              </div>
            </div>
          </div>

          <div
            className={`flex flex-wrap items-center justify-between gap-2 pt-3 border-t ${
              isDark ? 'border-slate-800' : 'border-stone-200'
            }`}
          >
            <button
              type="button"
              onClick={() => handleUpdateTuning(1.0, 1.0)}
              className={`text-xs font-medium underline cursor-pointer ${
                isDark ? 'text-slate-400 hover:text-slate-100' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isTigrinya ? 'ናብ ንቡር ምለስ' : 'Reset'}
            </button>

            <button
              type="button"
              onClick={() => handlePlaySample(activePersona)}
              className="px-4 py-2 rounded-lg bg-[#D4AF37] hover:bg-[#E1C47D] text-[#110D04] font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              {playingPersonaId === activePersona.id ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>{isTigrinya ? 'ደው ኣብል' : 'Stop Sample'}</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{isTigrinya ? 'ድምጺ ፈትን' : 'Play Sample'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Active Persona Summary Strip */}
      <div
        className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          isDark
            ? 'bg-[#0E101A] border-[#D4AF37]/30'
            : 'bg-amber-50/50 border-amber-300/60'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xl shrink-0" aria-hidden="true">
            {activePersona.avatarIcon}
          </span>
          <div className="min-w-0">
            <div className="text-xs font-semibold flex items-center flex-wrap gap-x-1.5">
              <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>
                {isTigrinya ? 'ዝተመረጸ ፐርሶና:' : 'Active Voice Persona:'}
              </span>
              <span className={`font-serif font-bold ${isDark ? 'text-[#F3E5AB]' : 'text-amber-950'}`}>
                {isTigrinya ? activePersona.nameTi : activePersona.name}
              </span>
            </div>
            <div className={`text-xs truncate ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {isTigrinya ? activePersona.taglineTi : activePersona.tagline}
              <span className="mx-1.5" aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                {activePersona.geminiVoiceName} ({(activePersona.speechRate * customRate).toFixed(2)}x)
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => handlePlaySample(activePersona)}
          className="px-4 py-2 rounded-lg bg-[#D4AF37] hover:bg-[#E1C47D] text-[#110D04] font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
        >
          {loadingPersonaId === activePersona.id ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : playingPersonaId === activePersona.id ? (
            <Square className="w-3.5 h-3.5 fill-current" />
          ) : (
            <Volume2 className="w-3.5 h-3.5" />
          )}
          <span>
            {playingPersonaId === activePersona.id
              ? isTigrinya
                ? 'ደው ኣብል'
                : 'Stop'
              : isTigrinya
                ? 'ስምዑ'
                : 'Listen'}
          </span>
        </button>
      </div>
    </div>
  );
};
