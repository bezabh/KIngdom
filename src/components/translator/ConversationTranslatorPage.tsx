import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRightLeft,
  BookmarkPlus,
  Check,
  Copy,
  Download,
  History,
  Loader2,
  Mic,
  Send,
  Sparkles,
  Square,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { ALL_INTERNATIONAL_LANGUAGES } from '../../utils/languages';
import { SavedItem, UserProfile } from '../../types';
import type {
  ConversationSessionRecord,
  ConversationTurnItem,
} from '../../services/translatorSuiteService';
import { TRANSLATOR_VOICE_OPTIONS } from '../../services/translationService';
import {
  useTranslationActions,
  useTranslationPlayback,
} from '../../context/TranslationServiceContext';
import { getTranslatorThemeTokens, TranslatorThemeMode } from './translatorTheme';
import { triggerSwipeTransitionHaptic, triggerTabTapHaptic } from '../../utils/haptics';

interface ConversationTranslatorPageProps {
  theme: TranslatorThemeMode;
  user?: UserProfile;
  onBack: () => void;
  onSaveInsight: (item: Omit<SavedItem, 'id' | 'createdAt'>) => void;
}

export const ConversationTranslatorPage: React.FC<ConversationTranslatorPageProps> = ({
  theme,
  user,
  onBack,
  onSaveInsight,
}) => {
  const t = getTranslatorThemeTokens(theme);
  const { playingAudioId: playingId } = useTranslationPlayback();
  const {
    translateConversationTurn,
    playTranslatedSpeech: playSpeechFromService,
    stopSpeechPlayback,
    resolveSpeechCode,
    getLanguageCapability,
    loadConversationSessions,
    saveConversationSession,
    deleteConversationSession,
  } = useTranslationActions();

  const [personALang, setPersonALang] = useState('Tigrinya');
  const [personBLang, setPersonBLang] = useState('English');
  const [autoDetect, setAutoDetect] = useState(true);
  const [voiceName, setVoiceName] = useState('Kore');
  const [speechRate, setSpeechRate] = useState(1.0);
  const [recordingSpeaker, setRecordingSpeaker] = useState<'A' | 'B' | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [liveCaption, setLiveCaption] = useState('');
  const [quickInputSpeaker, setQuickInputSpeaker] = useState<'A' | 'B'>('A');
  const [quickText, setQuickText] = useState('');
  const [turns, setTurns] = useState<ConversationTurnItem[]>([]);
  const [savedSessions, setSavedSessions] = useState<ConversationSessionRecord[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sessionSavedNotice, setSessionSavedNotice] = useState(false);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const speechRecRef = useRef<any>(null);
  const interimRef = useRef('');
  const activeSpeakerRef = useRef<'A' | 'B'>('A');

  useEffect(() => {
    loadConversationSessions().then(setSavedSessions);
    return () => {
      cleanupAudioCapture();
      stopSpeechPlayback();
    };
  }, [user?.id, user?.email, loadConversationSessions, stopSpeechPlayback]);

  const cleanupAudioCapture = () => {
    if (speechRecRef.current) {
      try {
        speechRecRef.current.stop();
      } catch {}
      speechRecRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try {
        recorderRef.current.stop();
      } catch {}
    }
    recorderRef.current = null;
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((tr) => tr.stop());
      mediaStreamRef.current = null;
    }
  };

  const playTranslatedSpeech = async (text: string, targetLang: string, turnId: string) => {
    await playSpeechFromService(text, targetLang, turnId, {
      voice: voiceName,
      rate: speechRate,
      maxChars: 320,
    });
  };

  const submitTurnTranslation = async (
    speaker: 'A' | 'B',
    payload: { audioBase64?: string; mimeType?: string; prompt?: string }
  ) => {
    setIsTranslating(true);
    setErrorMsg(null);

    try {
      const outcome = await translateConversationTurn({
        speaker,
        personALang,
        personBLang,
        autoDetect,
        prompt: payload.prompt,
        audioBase64: payload.audioBase64,
        mimeType: payload.mimeType,
        conversationHistory: turns.slice(-5).map((item) => ({
          sourceLanguage: item.sourceLanguage,
          targetLanguage: item.targetLanguage,
          sourceTranscript: item.originalText,
          translatedText: item.translatedText,
        })),
      });

      if (outcome.noSpeechDetected || !outcome.turn) {
        setErrorMsg('No clear speech detected. Speak close to your microphone or use the text input.');
        return;
      }

      setTurns((prev) => [...prev, outcome.turn!]);
      setLiveCaption('');
      playTranslatedSpeech(outcome.spokenTargetText, outcome.turn.targetLanguage, outcome.turn.id);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to translate speech.');
    } finally {
      setIsTranslating(false);
    }
  };

  const startPersonMic = async (speaker: 'A' | 'B') => {
    triggerTabTapHaptic();
    if (recordingSpeaker === speaker) {
      stopPersonMic();
      return;
    }
    cleanupAudioCapture();
    stopSpeechPlayback();
    setErrorMsg(null);
    setLiveCaption('');
    interimRef.current = '';
    chunksRef.current = [];
    activeSpeakerRef.current = speaker;

    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMsg('Microphone API not available in this browser. Type your message below.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      setRecordingSpeaker(speaker);

      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const rec = new MediaRecorder(stream, { mimeType: mime });
      recorderRef.current = rec;
      rec.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      rec.start(250);

      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const sr = new SpeechRecognition();
          sr.lang = resolveSpeechCode(speaker === 'A' ? personALang : personBLang);
          sr.continuous = true;
          sr.interimResults = true;
          sr.onresult = (e: any) => {
            let txt = '';
            for (let i = 0; i < e.results.length; i++) {
              txt += e.results[i][0]?.transcript || '';
            }
            if (txt.trim()) {
              interimRef.current = txt.trim();
              setLiveCaption(txt.trim());
            }
          };
          sr.onerror = () => {};
          sr.start();
          speechRecRef.current = sr;
        } catch {}
      }
    } catch (err: any) {
      setErrorMsg(
        err?.name === 'NotAllowedError'
          ? 'Microphone permission denied. Grant mic permission or type messages manually below.'
          : err?.message || 'Failed to access microphone.'
      );
      cleanupAudioCapture();
      setRecordingSpeaker(null);
    }
  };

  const stopPersonMic = () => {
    const speaker = activeSpeakerRef.current;
    const rec = recorderRef.current;
    const fallbackPrompt = interimRef.current.trim();
    setRecordingSpeaker(null);

    if (speechRecRef.current) {
      try {
        speechRecRef.current.stop();
      } catch {}
      speechRecRef.current = null;
    }

    if (rec && rec.state !== 'inactive') {
      rec.onstop = () => {
        const mime = rec.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mime });
        chunksRef.current = [];
        cleanupAudioCapture();

        if (blob.size >= 120) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const dataUrl = typeof reader.result === 'string' ? reader.result : '';
            if (dataUrl) {
              submitTurnTranslation(speaker, { audioBase64: dataUrl, mimeType: mime });
            } else if (fallbackPrompt) {
              submitTurnTranslation(speaker, { prompt: fallbackPrompt });
            } else {
              setErrorMsg('No clear speech captured. Speak close to your microphone or type a message below.');
            }
          };
          reader.readAsDataURL(blob);
        } else if (fallbackPrompt) {
          submitTurnTranslation(speaker, { prompt: fallbackPrompt });
        } else {
          setErrorMsg('No clear speech captured. Speak for a moment before stopping or type a message below.');
        }
      };
      rec.stop();
    } else {
      cleanupAudioCapture();
      if (fallbackPrompt) submitTurnTranslation(speaker, { prompt: fallbackPrompt });
    }
  };

  const handleQuickSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickText.trim() || isTranslating) return;
    const msg = quickText.trim();
    setQuickText('');
    await submitTurnTranslation(quickInputSpeaker, { prompt: msg });
  };

  const handleSaveSession = async () => {
    if (turns.length === 0) return;
    const now = new Date().toISOString();
    const record: ConversationSessionRecord = {
      id: `conv_sess_${Date.now()}`,
      personALang,
      personBLang,
      turnCount: turns.length,
      transcriptSummary: turns
        .map((item) => `[${item.speaker === 'A' ? 'Person A' : 'Person B'} • ${item.sourceLanguage}]: ${item.originalText} -> ${item.translatedText}`)
        .join('\n')
        .slice(0, 3900),
      turns,
      createdAt: now,
      updatedAt: now,
    };
    await saveConversationSession(record);
    setSavedSessions((prev) => [record, ...prev]);
    setSessionSavedNotice(true);
    setTimeout(() => setSessionSavedNotice(false), 2200);
    onSaveInsight({
      title: `Conversation: ${personALang} ⇄ ${personBLang} (${turns.length} turns)`,
      type: 'translation',
      content: record.transcriptSummary,
      tags: ['conversation-translator', personALang, personBLang],
    });
  };

  const handleExportTranscript = () => {
    if (turns.length === 0) return;
    const body = turns
      .map(
        (item, i) =>
          `${i + 1}. [${item.timestamp}] Person ${item.speaker} (${item.sourceLanguage} ➔ ${item.targetLanguage})\n` +
          `Original: ${item.originalText}\nTranslated: ${item.translatedText}` +
          (item.transliteration ? `\nPhonetic: ${item.transliteration}` : '')
      )
      .join('\n\n');
    const blob = new Blob([`AXUMITE LIVE CONVERSATION TRANSCRIPT\n${personALang} ⇄ ${personBLang}\n\n${body}`], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-${personALang}-${personBLang}-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const capA = getLanguageCapability(personALang);
  const capB = getLanguageCapability(personBLang);

  return (
    <div className={`rounded-3xl p-4 sm:p-6 space-y-5 ${t.pageShell}`}>
      {/* Header */}
      <div className={`flex flex-wrap items-center justify-between gap-3 pb-4 border-b ${t.border}`}>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className={`min-h-[42px] px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition ${t.secondaryButton}`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <div>
            <h2 className={`text-base sm:text-lg font-extrabold tracking-tight ${t.textPrimary}`}>
              Conversation Translation
            </h2>
            <p className={`text-xs ${t.textMuted}`}>
              Real-time two-person conversations with automatic speech recognition, two-language mode, and live translated subtitles
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setAutoDetect((v) => !v)}
            className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition ${
              autoDetect ? t.goldBadge : t.secondaryButton
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Auto-Detect: {autoDetect ? 'On' : 'Off'}</span>
          </button>

          {turns.length > 0 && (
            <>
              <button
                type="button"
                onClick={handleSaveSession}
                className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer ${t.secondaryButton}`}
              >
                {sessionSavedNotice ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <BookmarkPlus className="w-3.5 h-3.5" />}
                <span>{sessionSavedNotice ? 'Saved' : 'Save Session'}</span>
              </button>
              <button
                type="button"
                onClick={handleExportTranscript}
                className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer ${t.secondaryButton}`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTurns([]);
                  stopSpeechPlayback();
                }}
                className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer ${t.dangerButton}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Dual Speaker Controls */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-stretch">
        {/* Person A */}
        <div className={`rounded-2xl p-4 space-y-3 ${t.cardBg}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${t.goldText}`}>
              Person A
            </span>
            <span className={`text-[11px] ${t.textMuted}`}>
              {capA.coverageTier === 'community-validated' ? 'Community Glossary' : 'Full Neural'}
            </span>
          </div>
          <select
            value={personALang}
            onChange={(e) => setPersonALang(e.target.value)}
            className={`w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none ${t.inputBg}`}
          >
            {ALL_INTERNATIONAL_LANGUAGES.map((l) => (
              <option key={`pa-${l.code}`} value={l.name}>
                {l.flag ? `${l.flag} ` : ''}{l.name} ({l.nativeName})
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={isTranslating}
            onClick={() => startPersonMic('A')}
            className={`w-full min-h-[48px] rounded-2xl font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition ${
              recordingSpeaker === 'A'
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg animate-pulse'
                : t.primaryButton
            }`}
          >
            {recordingSpeaker === 'A' ? (
              <>
                <Square className="w-4 h-4 fill-current" />
                <span>Stop & Translate Person A</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                <span>Speak as Person A ({personALang})</span>
              </>
            )}
          </button>
        </div>

        {/* Swap */}
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={() => {
              triggerSwipeTransitionHaptic('left');
              const tmp = personALang;
              setPersonALang(personBLang);
              setPersonBLang(tmp);
            }}
            className={`p-3 rounded-2xl cursor-pointer ${t.secondaryButton}`}
            title="Swap languages"
          >
            <ArrowRightLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Person B */}
        <div className={`rounded-2xl p-4 space-y-3 ${t.cardBg}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${t.goldText}`}>
              Person B
            </span>
            <span className={`text-[11px] ${t.textMuted}`}>
              {capB.coverageTier === 'community-validated' ? 'Community Glossary' : 'Full Neural'}
            </span>
          </div>
          <select
            value={personBLang}
            onChange={(e) => setPersonBLang(e.target.value)}
            className={`w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none ${t.inputBg}`}
          >
            {ALL_INTERNATIONAL_LANGUAGES.map((l) => (
              <option key={`pb-${l.code}`} value={l.name}>
                {l.flag ? `${l.flag} ` : ''}{l.name} ({l.nativeName})
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={isTranslating}
            onClick={() => startPersonMic('B')}
            className={`w-full min-h-[48px] rounded-2xl font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition ${
              recordingSpeaker === 'B'
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg animate-pulse'
                : t.primaryButton
            }`}
          >
            {recordingSpeaker === 'B' ? (
              <>
                <Square className="w-4 h-4 fill-current" />
                <span>Stop & Translate Person B</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                <span>Speak as Person B ({personBLang})</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Speech Speed & Voice Settings */}
      <div className={`rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-4 ${t.subCardBg}`}>
        <div className="flex items-center gap-2.5">
          <span className={`text-xs font-bold ${t.goldText}`}>Playback Voice:</span>
          <select
            value={voiceName}
            onChange={(e) => setVoiceName(e.target.value)}
            className={`rounded-xl px-2.5 py-1.5 text-xs focus:outline-none ${t.inputBg}`}
          >
            {TRANSLATOR_VOICE_OPTIONS.map((v) => (
              <option key={v.id} value={v.id}>
                {v.shortLabel}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 flex-1 max-w-xs">
          <span className={`text-xs font-bold whitespace-nowrap ${t.goldText}`}>
            Speed: {speechRate.toFixed(2)}x
          </span>
          <input
            type="range"
            min="0.75"
            max="1.4"
            step="0.05"
            value={speechRate}
            onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
            className="w-full accent-[#B8860B] cursor-pointer"
          />
        </div>
      </div>

      {/* Live Speech Status / Caption / Error */}
      {(recordingSpeaker || isTranslating || liveCaption || errorMsg) && (
        <div className={`rounded-2xl p-3.5 text-xs space-y-1 ${t.cardElevated}`}>
          {recordingSpeaker && (
            <p className={`font-semibold ${t.goldText}`}>
              Listening to Person {recordingSpeaker} ({recordingSpeaker === 'A' ? personALang : personBLang})... Tap stop when finished.
            </p>
          )}
          {isTranslating && (
            <p className={`flex items-center gap-2 font-semibold ${t.textPrimary}`}>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Recognizing speech & translating...</span>
            </p>
          )}
          {liveCaption && <p className={`font-ethiopic text-sm ${t.textPrimary}`}>“{liveCaption}”</p>}
          {errorMsg && <p className="text-rose-600 font-semibold">{errorMsg}</p>}
        </div>
      )}

      {/* Quick Text Turn Fallback */}
      <form onSubmit={handleQuickSend} className={`rounded-2xl p-3 flex flex-col sm:flex-row gap-2 ${t.subCardBg}`}>
        <select
          value={quickInputSpeaker}
          onChange={(e) => setQuickInputSpeaker(e.target.value as 'A' | 'B')}
          className={`rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none ${t.inputBg}`}
        >
          <option value="A">Person A ({personALang})</option>
          <option value="B">Person B ({personBLang})</option>
        </select>
        <input
          type="text"
          value={quickText}
          onChange={(e) => setQuickText(e.target.value)}
          placeholder="Or type a spoken line directly to test instant conversation translation..."
          className={`flex-1 rounded-xl px-3 py-2 text-xs focus:outline-none ${t.inputBg}`}
        />
        <button
          type="submit"
          disabled={!quickText.trim() || isTranslating}
          className={`min-h-[40px] px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 ${t.primaryButton}`}
        >
          <Send className="w-3.5 h-3.5" />
          <span>Send</span>
        </button>
      </form>

      {/* Conversation Transcript */}
      <div className="space-y-2.5">
        <h3 className={`text-xs font-bold uppercase tracking-wider ${t.goldText}`}>
          Conversation Transcript ({turns.length})
        </h3>
        {turns.length === 0 ? (
          <div className={`rounded-2xl p-8 text-center text-xs ${t.subCardBg} ${t.textMuted}`}>
            Tap Person A or Person B microphone above to begin a two-way interpreted dialogue.
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {turns.map((turn) => (
              <div key={turn.id} className={`rounded-2xl p-3.5 space-y-2 ${t.cardBg}`}>
                <div className="flex items-center justify-between text-[11px]">
                  <span className={`font-bold ${t.goldText}`}>
                    Person {turn.speaker}: {turn.sourceLanguage} ➔ {turn.targetLanguage}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className={t.textMuted}>{turn.timestamp}</span>
                    <button
                      type="button"
                      onClick={() =>
                        playingId === turn.id
                          ? stopSpeechPlayback()
                          : playTranslatedSpeech(turn.translatedText, turn.targetLanguage, turn.id)
                      }
                      className={`p-1.5 rounded-lg cursor-pointer ${t.secondaryButton}`}
                      title="Play translated speech"
                    >
                      {playingId === turn.id ? <VolumeX className="w-3.5 h-3.5 text-rose-500" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`${turn.originalText}\n${turn.translatedText}`);
                        setCopiedId(turn.id);
                        setTimeout(() => setCopiedId(null), 1500);
                      }}
                      className={`p-1.5 rounded-lg cursor-pointer ${t.secondaryButton}`}
                      title="Copy turn"
                    >
                      {copiedId === turn.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <p className={`text-xs ${t.textSecondary}`}>“{turn.originalText}”</p>
                <p className={`text-sm font-bold font-ethiopic ${t.textPrimary}`}>{turn.translatedText}</p>
                {turn.transliteration && (
                  <p className={`text-[11px] font-mono italic ${t.textMuted}`}>
                    Phonetic: {turn.transliteration}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Saved Conversation History */}
      {savedSessions.length > 0 && (
        <div className="space-y-2 pt-2">
          <div className="flex items-center gap-1.5">
            <History className={`w-4 h-4 ${t.goldText}`} />
            <h3 className={`text-xs font-bold uppercase tracking-wider ${t.goldText}`}>
              Saved Conversation History ({savedSessions.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {savedSessions.slice(0, 6).map((sess) => (
              <div key={sess.id} className={`rounded-2xl p-3 flex items-start justify-between gap-2 ${t.subCardBg}`}>
                <button
                  type="button"
                  onClick={() => {
                    setPersonALang(sess.personALang);
                    setPersonBLang(sess.personBLang);
                    setTurns(sess.turns || []);
                  }}
                  className="text-left flex-1 cursor-pointer"
                >
                  <p className={`text-xs font-bold ${t.textPrimary}`}>
                    {sess.personALang} ⇄ {sess.personBLang}
                  </p>
                  <p className={`text-[11px] ${t.textMuted}`}>
                    {sess.turnCount} turns • {new Date(sess.createdAt).toLocaleDateString()}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await deleteConversationSession(sess.id);
                    setSavedSessions((prev) => prev.filter((s) => s.id !== sess.id));
                  }}
                  className={`p-1.5 rounded-lg cursor-pointer ${t.dangerButton}`}
                  title="Delete saved session"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
