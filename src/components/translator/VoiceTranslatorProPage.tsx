import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRightLeft,
  Award,
  BookmarkPlus,
  Check,
  Download,
  Loader2,
  Mic,
  Send,
  Sparkles,
  Square,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { ALL_INTERNATIONAL_LANGUAGES } from '../../utils/languages';
import { SavedItem, UserProfile } from '../../types';
import {
  loadVoiceHistoryLogs,
  saveVoiceHistoryLog,
  VoiceTranslationLogRecord,
} from '../../services/voiceHistoryService';
import { TRANSLATOR_VOICE_OPTIONS } from '../../services/translationService';
import {
  useTranslationActions,
  useTranslationPlayback,
} from '../../context/TranslationServiceContext';
import { getTranslatorThemeTokens, TranslatorThemeMode } from './translatorTheme';

interface VoiceTranslatorProPageProps {
  theme: TranslatorThemeMode;
  user?: UserProfile;
  onBack: () => void;
  onSaveInsight: (item: Omit<SavedItem, 'id' | 'createdAt'>) => void;
  onOpenVoiceLoopDashboard: () => void;
}

const VOICE_PRO_PLAYBACK_ID = 'voice_translator_pro_output';

export const VoiceTranslatorProPage: React.FC<VoiceTranslatorProPageProps> = ({
  theme,
  user,
  onBack,
  onSaveInsight,
  onOpenVoiceLoopDashboard,
}) => {
  const t = getTranslatorThemeTokens(theme);
  const { playingAudioId } = useTranslationPlayback();
  const {
    translateVoice,
    playTranslatedSpeech,
    stopSpeechPlayback,
    checkPronunciation,
    getLanguageCapability,
  } = useTranslationActions();

  const [sourceLang, setSourceLang] = useState('Auto-Detect');
  const [targetLang, setTargetLang] = useState('Tigrinya');
  const [voiceId, setVoiceId] = useState('Kore');
  const [speechSpeed, setSpeechSpeed] = useState(1.0);
  const [recordingMode, setRecordingMode] = useState<'translate' | 'practice' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputPhrase, setInputPhrase] = useState('');
  const [currentResult, setCurrentResult] = useState<{
    detectedLanguage: string;
    targetLanguage: string;
    sourceTranscript: string;
    translatedText: string;
    spokenTargetText: string;
    transliteration: string;
    audioWavUrl?: string;
  } | null>(null);
  const [savedCurrent, setSavedCurrent] = useState(false);
  const [historyLogs, setHistoryLogs] = useState<VoiceTranslationLogRecord[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isPlaying = playingAudioId === VOICE_PRO_PLAYBACK_ID;

  // Pronunciation practice state
  const [practiceTranscript, setPracticeTranscript] = useState('');
  const [isCheckingPronunciation, setIsCheckingPronunciation] = useState(false);
  const [pronunciationFeedback, setPronunciationFeedback] = useState<{
    accuracyScore: number;
    transcribedSpeech: string;
    phoneticTip: string;
    encouragement: string;
  } | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const recordingModeRef = useRef<'translate' | 'practice' | null>(null);

  useEffect(() => {
    loadVoiceHistoryLogs(user).then(({ logs }) => setHistoryLogs(logs.slice(0, 12)));
    return () => {
      cleanupRecorder();
      stopSpeechPlayback();
    };
  }, [user?.id, user?.email, stopSpeechPlayback]);

  const cleanupRecorder = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    mediaRecorderRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
    }
  };

  const synthesizeAndPlay = async (text: string, langName: string): Promise<string | undefined> => {
    if (!text.trim()) return undefined;
    const { wavDataUrl } = await playTranslatedSpeech(text, langName, VOICE_PRO_PLAYBACK_ID, {
      voice: voiceId,
      rate: speechSpeed,
      maxChars: 320,
    });
    return wavDataUrl;
  };

  const runVoiceTranslate = async (payload: {
    audioBase64?: string;
    mimeType?: string;
    prompt?: string;
  }) => {
    setIsProcessing(true);
    setErrorMsg(null);
    setSavedCurrent(false);

    try {
      const data = await translateVoice({
        prompt: payload.prompt,
        audioBase64: payload.audioBase64,
        mimeType: payload.mimeType,
        sourceLanguage: sourceLang,
        targetLanguage: targetLang,
        autoDetectPair: false,
      });

      if (data.noSpeechDetected || !data.translatedText) {
        setErrorMsg('No clear speech detected. Speak clearly or type a phrase below.');
        return;
      }

      const resolvedTarget = data.effectiveTargetLanguage;
      const resolvedSource = data.detectedSourceLanguage;
      const spoken = data.spokenTargetText;
      const wavUrl = await synthesizeAndPlay(spoken, resolvedTarget);

      setCurrentResult({
        detectedLanguage: resolvedSource,
        targetLanguage: resolvedTarget,
        sourceTranscript: data.sourceTranscript,
        translatedText: data.translatedText,
        spokenTargetText: spoken,
        transliteration: data.transliteration,
        audioWavUrl: wavUrl,
      });

      const logItem: VoiceTranslationLogRecord = {
        id: `vp_${Date.now()}`,
        speaker: 'A',
        sourceLanguage: resolvedSource,
        targetLanguage: resolvedTarget,
        sourceTranscript: data.sourceTranscript,
        translatedText: data.translatedText,
        spokenTargetText: spoken,
        transliteration: data.transliteration,
        scriptName: data.scriptName,
        wordBreakdown: data.wordBreakdown,
        culturalContext: data.culturalContext,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: new Date().toISOString(),
      };
      setHistoryLogs((prev) => [logItem, ...prev.slice(0, 11)]);
      saveVoiceHistoryLog(logItem, user);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to translate voice.');
    } finally {
      setIsProcessing(false);
    }
  };

  const evaluatePronunciation = async (payload: {
    audioBase64?: string;
    mimeType?: string;
    spokenTranscript?: string;
  }) => {
    if (!currentResult?.translatedText) return;
    setIsCheckingPronunciation(true);
    setErrorMsg(null);
    try {
      const feedback = await checkPronunciation({
        audioBase64: payload.audioBase64,
        mimeType: payload.mimeType,
        spokenTranscript: payload.spokenTranscript,
        targetPhrase: currentResult.translatedText,
        targetLanguage: currentResult.targetLanguage,
      });
      setPronunciationFeedback(feedback);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Pronunciation practice check failed.');
    } finally {
      setIsCheckingPronunciation(false);
    }
  };

  const toggleRecording = async (mode: 'translate' | 'practice') => {
    if (recordingMode) {
      const activeMode = recordingModeRef.current || recordingMode;
      const rec = mediaRecorderRef.current;
      recordingModeRef.current = null;
      setRecordingMode(null);
      if (rec && rec.state !== 'inactive') {
        rec.onstop = () => {
          const mime = rec.mimeType || 'audio/webm';
          const blob = new Blob(chunksRef.current, { type: mime });
          chunksRef.current = [];
          cleanupRecorder();
          if (blob.size < 120) {
            setErrorMsg('No clear audio captured. Speak for a moment before stopping or type a phrase below.');
            return;
          }
          const reader = new FileReader();
          reader.onloadend = () => {
            const dataUrl = typeof reader.result === 'string' ? reader.result : '';
            if (!dataUrl) return;
            if (activeMode === 'practice') {
              evaluatePronunciation({ audioBase64: dataUrl, mimeType: mime });
            } else {
              runVoiceTranslate({ audioBase64: dataUrl, mimeType: mime });
            }
          };
          reader.readAsDataURL(blob);
        };
        rec.stop();
      } else {
        cleanupRecorder();
      }
      return;
    }

    recordingModeRef.current = mode;
    setErrorMsg(null);
    chunksRef.current = [];
    if (!navigator.mediaDevices?.getUserMedia) {
      recordingModeRef.current = null;
      setErrorMsg('Microphone unavailable. Type text below to test voice translation or pronunciation.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const rec = new MediaRecorder(stream, { mimeType: mime });
      mediaRecorderRef.current = rec;
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.start(250);
      setRecordingMode(mode);
    } catch (err: any) {
      recordingModeRef.current = null;
      setErrorMsg(
        err?.name === 'NotAllowedError'
          ? 'Microphone permission denied. Grant mic permission or use text input below.'
          : err?.message || 'Unable to access microphone.'
      );
    }
  };

  const targetCap = getLanguageCapability(targetLang);

  return (
    <div className={`rounded-3xl p-4 sm:p-6 space-y-5 ${t.pageShell}`}>
      {/* Header */}
      <div className={`flex flex-wrap items-center justify-between gap-3 pb-4 border-b ${t.border}`}>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className={`min-h-[42px] px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer ${t.secondaryButton}`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <div>
            <h2 className={`text-base sm:text-lg font-extrabold tracking-tight ${t.textPrimary}`}>
              Voice Translation
            </h2>
            <p className={`text-xs ${t.textMuted}`}>
              Speech-to-text conversion, text-to-speech output, natural AI voices, and voice pronunciation
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenVoiceLoopDashboard}
          className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer ${t.goldBadge}`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Open Live Voice Loop</span>
        </button>
      </div>

      {/* Controls Grid */}
      <div className={`rounded-2xl p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 ${t.cardBg}`}>
        <div className="space-y-1">
          <label className={`text-[11px] font-bold uppercase ${t.goldText}`}>Spoken Language</label>
          <select
            value={sourceLang}
            onChange={(e) => setSourceLang(e.target.value)}
            className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none ${t.inputBg}`}
          >
            <option value="Auto-Detect">✨ Auto-Detect Spoken Language</option>
            {ALL_INTERNATIONAL_LANGUAGES.map((l) => (
              <option key={`vs-${l.code}`} value={l.name}>
                {l.flag ? `${l.flag} ` : ''}{l.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className={`text-[11px] font-bold uppercase ${t.goldText}`}>Target Speech Language</label>
          <div className="flex gap-1.5">
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className={`flex-1 rounded-xl px-3 py-2 text-xs focus:outline-none ${t.inputBg}`}
            >
              {ALL_INTERNATIONAL_LANGUAGES.map((l) => (
                <option key={`vt-${l.code}`} value={l.name}>
                  {l.flag ? `${l.flag} ` : ''}{l.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                if (sourceLang === 'Auto-Detect') {
                  const detectedMatch = currentResult?.detectedLanguage
                    ? ALL_INTERNATIONAL_LANGUAGES.find(
                        (l) => l.name.toLowerCase() === currentResult.detectedLanguage.toLowerCase()
                      )?.name
                    : undefined;
                  const fallbackTarget =
                    detectedMatch && detectedMatch !== targetLang
                      ? detectedMatch
                      : targetLang === 'English'
                        ? 'Tigrinya'
                        : 'English';
                  setSourceLang(targetLang);
                  setTargetLang(fallbackTarget);
                  return;
                }
                const prevSrc = sourceLang;
                setSourceLang(targetLang);
                setTargetLang(prevSrc);
              }}
              className={`px-2.5 rounded-xl cursor-pointer ${t.secondaryButton}`}
              title="Swap languages"
            >
              <ArrowRightLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <label className={`text-[11px] font-bold uppercase ${t.goldText}`}>Voice Profile</label>
          <select
            value={voiceId}
            onChange={(e) => setVoiceId(e.target.value)}
            className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none ${t.inputBg}`}
          >
            {TRANSLATOR_VOICE_OPTIONS.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className={`text-[11px] font-bold uppercase ${t.goldText}`}>
            Speech Speed ({speechSpeed.toFixed(2)}x)
          </label>
          <input
            type="range"
            min="0.75"
            max="1.4"
            step="0.05"
            value={speechSpeed}
            onChange={(e) => setSpeechSpeed(parseFloat(e.target.value))}
            className="w-full accent-[#B8860B] cursor-pointer mt-2"
          />
        </div>
      </div>

      {!targetCap.voiceOutput && (
        <div className={`rounded-2xl p-3 text-xs ${t.subCardBg} ${t.textMuted}`}>
          Note: <strong className={t.textPrimary}>{targetLang}</strong> uses community-validated phonetic fallback rather than native neural TTS audio.
        </div>
      )}

      {/* Speak Button + Text Input */}
      <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-3 items-center">
        <button
          type="button"
          disabled={isProcessing || recordingMode === 'practice'}
          onClick={() => toggleRecording('translate')}
          className={`min-h-[50px] px-6 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition disabled:opacity-50 ${
            recordingMode === 'translate'
              ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
              : t.primaryButton
          }`}
        >
          {recordingMode === 'translate' ? (
            <>
              <Square className="w-4 h-4 fill-current" />
              <span>Stop & Translate</span>
            </>
          ) : (
            <>
              <Mic className="w-4 h-4" />
              <span>Speak Now</span>
            </>
          )}
        </button>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!inputPhrase.trim() || isProcessing) return;
            const txt = inputPhrase.trim();
            setInputPhrase('');
            runVoiceTranslate({ prompt: txt });
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={inputPhrase}
            onChange={(e) => setInputPhrase(e.target.value)}
            placeholder="Or type a phrase to synthesize & evaluate pronunciation..."
            className={`flex-1 rounded-2xl px-4 py-3 text-xs focus:outline-none ${t.inputBg}`}
          />
          <button
            type="submit"
            disabled={!inputPhrase.trim() || isProcessing}
            className={`min-h-[46px] px-4 rounded-2xl text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40 ${t.secondaryButton}`}
          >
            <Send className="w-4 h-4" />
            <span>Translate</span>
          </button>
        </form>
      </div>

      {isProcessing && (
        <div className={`rounded-2xl p-4 flex items-center justify-center gap-2 text-xs font-semibold ${t.cardElevated}`}>
          <Loader2 className="w-4 h-4 animate-spin text-[#B8860B]" />
          <span>Recognizing spoken language & generating natural voice translation...</span>
        </div>
      )}

      {errorMsg && (
        <div className={`rounded-2xl p-3 text-xs font-semibold text-rose-600 ${t.cardBg}`}>
          {errorMsg}
        </div>
      )}

      {/* Translated Output & Pronunciation Practice */}
      {currentResult && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className={`rounded-2xl p-4 space-y-3 ${t.cardBg}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className={`text-xs font-bold ${t.goldText}`}>
                {currentResult.detectedLanguage} ➔ {currentResult.targetLanguage}
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    isPlaying
                      ? stopSpeechPlayback()
                      : synthesizeAndPlay(currentResult.spokenTargetText, currentResult.targetLanguage)
                  }
                  className={`px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 cursor-pointer ${t.secondaryButton}`}
                >
                  {isPlaying ? <VolumeX className="w-3.5 h-3.5 text-rose-500" /> : <Volume2 className="w-3.5 h-3.5" />}
                  <span>{isPlaying ? 'Stop' : 'Play Voice'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSaveInsight({
                      title: `Voice (${currentResult.detectedLanguage} ➔ ${currentResult.targetLanguage})`,
                      type: 'translation',
                      content: `${currentResult.sourceTranscript}\n➔ ${currentResult.translatedText}${
                        currentResult.transliteration ? `\nPhonetic: ${currentResult.transliteration}` : ''
                      }`,
                      tags: ['voice-translator', currentResult.targetLanguage],
                    });
                    setSavedCurrent(true);
                    setTimeout(() => setSavedCurrent(false), 2000);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 cursor-pointer ${t.secondaryButton}`}
                >
                  {savedCurrent ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <BookmarkPlus className="w-3.5 h-3.5" />}
                  <span>{savedCurrent ? 'Saved' : 'Save'}</span>
                </button>
                {currentResult.audioWavUrl && (
                  <a
                    href={currentResult.audioWavUrl}
                    download={`axumite-voice-${currentResult.targetLanguage.toLowerCase()}.wav`}
                    className={`px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 ${t.primaryButton}`}
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Audio</span>
                  </a>
                )}
              </div>
            </div>
            <p className={`text-xs ${t.textMuted}`}>Spoken: “{currentResult.sourceTranscript}”</p>
            <p className={`text-xl font-bold font-ethiopic leading-relaxed ${t.textPrimary}`}>
              {currentResult.translatedText}
            </p>
            {currentResult.transliteration && (
              <p className={`text-xs font-mono italic ${t.textMuted}`}>
                Phonetic Guide: {currentResult.transliteration}
              </p>
            )}
          </div>

          {/* Pronunciation Practice Card */}
          <div className={`rounded-2xl p-4 space-y-3 ${t.cardBg}`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${t.goldText}`}>
                <Award className="w-4 h-4" />
                <span>Pronunciation Practice</span>
              </span>
            </div>
            <p className={`text-xs ${t.textMuted}`}>
              Repeat <strong className={t.textPrimary}>“{currentResult.translatedText}”</strong> aloud or type what you pronounced to receive an AI articulation score.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={isCheckingPronunciation || recordingMode === 'translate'}
                onClick={() => toggleRecording('practice')}
                className={`min-h-[40px] px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                  recordingMode === 'practice'
                    ? 'bg-rose-600 text-white animate-pulse'
                    : t.primaryButton
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
                <span>
                  {recordingMode === 'practice' ? 'Finish Attempt' : 'Record Pronunciation'}
                </span>
              </button>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!practiceTranscript.trim()) return;
                  evaluatePronunciation({ spokenTranscript: practiceTranscript.trim() });
                }}
                className="flex flex-1 gap-1.5 min-w-[200px]"
              >
                <input
                  type="text"
                  value={practiceTranscript}
                  onChange={(e) => setPracticeTranscript(e.target.value)}
                  placeholder="Or type spoken attempt..."
                  className={`flex-1 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none ${t.inputBg}`}
                />
                <button
                  type="submit"
                  disabled={!practiceTranscript.trim() || isCheckingPronunciation}
                  className={`px-3 rounded-xl text-xs cursor-pointer ${t.secondaryButton}`}
                >
                  Check
                </button>
              </form>
            </div>

            {isCheckingPronunciation && (
              <p className={`text-xs flex items-center gap-1.5 ${t.goldText}`}>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Evaluating pronunciation clarity...</span>
              </p>
            )}

            {pronunciationFeedback && (
              <div className={`rounded-xl p-3 space-y-1 text-xs ${t.subCardBg}`}>
                <div className="flex items-center justify-between">
                  <span className={`font-bold ${t.textPrimary}`}>
                    Accuracy Score: {pronunciationFeedback.accuracyScore}%
                  </span>
                  <span className={`font-mono ${t.goldText}`}>{pronunciationFeedback.transcribedSpeech}</span>
                </div>
                <p className={t.textSecondary}>{pronunciationFeedback.phoneticTip}</p>
                <p className={`italic ${t.textMuted}`}>{pronunciationFeedback.encouragement}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Voice History */}
      {historyLogs.length > 0 && (
        <div className="space-y-2 pt-2">
          <h3 className={`text-xs font-bold uppercase tracking-wider ${t.goldText}`}>
            Recent Voice Translations ({historyLogs.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {historyLogs.slice(0, 6).map((log) => (
              <div key={log.id} className={`rounded-2xl p-3 space-y-1 text-xs ${t.subCardBg}`}>
                <div className="flex items-center justify-between">
                  <span className={`font-bold ${t.goldText}`}>
                    {log.sourceLanguage} ➔ {log.targetLanguage}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onSaveInsight({
                        title: `Voice: ${log.sourceTranscript.slice(0, 28)}`,
                        type: 'translation',
                        content: `${log.sourceTranscript}\n➔ ${log.translatedText}`,
                        tags: ['voice-translator', log.targetLanguage],
                      })
                    }
                    className={`px-2 py-0.5 rounded text-[11px] cursor-pointer ${t.secondaryButton}`}
                  >
                    Save
                  </button>
                </div>
                <p className={`truncate ${t.textMuted}`}>{log.sourceTranscript}</p>
                <p className={`font-bold font-ethiopic truncate ${t.textPrimary}`}>{log.translatedText}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
