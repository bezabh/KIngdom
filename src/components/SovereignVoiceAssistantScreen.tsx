import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Mic, MicOff, ChevronDown, Volume2, VolumeX, Sparkles, 
  Radio, Zap, Shield, Globe, RefreshCw, X, Play, Square,
  CornerDownLeft, MessageSquare, Maximize2, Minimize2,
  Activity, Waves, Copy, Check, RotateCcw, AlertTriangle,
  Languages, ArrowRight, Sliders, Info
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { AppTab, UserProfile } from '../types';
import { 
  playVoiceTriggerChime, 
  playCommandSuccessChime, 
  playVoiceDeactivateChime 
} from '../utils/audioChime';
import {
  VoicePersonaId,
  VoicePersonaSettings,
  getVoicePersona,
  getStoredVoicePersonaSettings,
  saveVoicePersonaSettings,
  VOICE_PERSONA_UPDATED_EVENT,
} from '../types/voicePersona';
import { base64PcmToWavDataUrl } from '../utils/welcomeAudioService';
import { VoicePersonaSelector } from './VoicePersonaSelector';
import { RealtimeAudioWaveform } from './RealtimeAudioWaveform';
import { AiAssistantDailyLimitModal } from './AiAssistantDailyLimitModal';
import { useSubscription } from '../context/SubscriptionContext';
import { dedupeRecordsByIdAndContent, normalizeTextKey, safeWriteLocalStorage } from '../utils/dataOptimizer';

export interface ConversationTurn {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  textTi?: string;
  spokenText?: string;
  language?: string;
  timestamp: string;
  personaId?: VoicePersonaId;
}

export interface SovereignVoiceAssistantScreenProps {
  isOpen?: boolean;
  onClose?: () => void;
  onNavigateTab?: (tab: AppTab) => void;
  isAlwaysListening?: boolean;
  onToggleAlwaysListening?: () => void;
  standalone?: boolean;
  user?: UserProfile;
  onUpdateUser?: (updated: Partial<UserProfile>) => void;
}

export type VoiceLanguageCode = 'auto' | 'ti' | 'en' | 'de' | 'am';

interface VoiceLanguageOption {
  code: VoiceLanguageCode;
  label: string;
  nativeLabel: string;
  flag: string;
  bcp47: string;
}

const SUPPORTED_VOICE_LANGUAGES: VoiceLanguageOption[] = [
  { code: 'auto', label: 'Auto-Detect', nativeLabel: 'ባዕሉ ፈልጥ (Auto)', flag: '🌐', bcp47: 'en-US' },
  { code: 'ti', label: 'Tigrinya', nativeLabel: 'ትግርኛ (Tigrinya)', flag: '🇪🇷', bcp47: 'ti-ET' },
  { code: 'en', label: 'English', nativeLabel: 'English (US/UK)', flag: '🇺🇸', bcp47: 'en-US' },
  { code: 'de', label: 'German', nativeLabel: 'Deutsch (German)', flag: '🇩🇪', bcp47: 'de-DE' },
  { code: 'am', label: 'Amharic', nativeLabel: 'አማርኛ (Amharic)', flag: '🇪🇹', bcp47: 'am-ET' },
];

export const SovereignVoiceAssistantScreen: React.FC<SovereignVoiceAssistantScreenProps> = ({
  isOpen = true,
  onClose,
  onNavigateTab,
  isAlwaysListening = false,
  onToggleAlwaysListening,
  standalone = false,
  user,
  onUpdateUser,
}) => {
  const { language, t } = useLanguage();
  const isTigrinya = language === 'ti' || language === 'ti_tg';
  const { isProOrHigher } = useSubscription();

  // Daily Free Quota / PRO Upgrade Modal State
  const [isDailyLimitModalOpen, setIsDailyLimitModalOpen] = useState(false);
  const [dailyQueryCount, setDailyQueryCount] = useState<number>(() => {
    try {
      const todayKey = `axum_free_voice_${new Date().toISOString().slice(0, 10)}`;
      return parseInt(localStorage.getItem(todayKey) || '0', 10);
    } catch {
      return 0;
    }
  });
  const TOTAL_FREE_QUOTA = 5;

  // Core Voice Assistant States: 'idle' | 'listening' | 'processing' | 'speaking'
  const [statusState, setStatusState] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Transcripts & Replies
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [currentReply, setCurrentReply] = useState<string | null>(null);
  const [currentReplyTi, setCurrentReplyTi] = useState<string | null>(null);
  const [currentSpokenText, setCurrentSpokenText] = useState<string | null>(null);
  const [detectedLangName, setDetectedLangName] = useState<string>('English');
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([
    "Explain Axumite gold currency & ancient trade",
    "Translate this sentence to Ge'ez",
    "What is the system status?",
    "Open Business Hub & Invoices"
  ]);

  // Audio & Waveform Visualization
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [audioFrequencies, setAudioFrequencies] = useState<number[]>([12, 22, 35, 60, 85, 55, 40, 24, 15]);
  const [activeAnalyser, setActiveAnalyser] = useState<AnalyserNode | null>(null);

  // Settings & Controls
  const [selectedVoiceLang, setSelectedVoiceLang] = useState<VoiceLanguageCode>(() => {
    if (language === 'ti' || language === 'ti_tg') return 'ti';
    return 'auto';
  });
  const [speechFeedbackEnabled, setSpeechFeedbackEnabled] = useState(true);
  const [autoListenAfterResponse, setAutoListenAfterResponse] = useState(false);
  const [displayFrameMode, setDisplayFrameMode] = useState<'device' | 'fullscreen'>(standalone ? 'fullscreen' : 'device');
  const [micPermissionError, setMicPermissionError] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [lastFailedQuery, setLastFailedQuery] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [manualInput, setManualInput] = useState('');

  // Voice Persona & Tuning (synchronized with Settings & Firestore)
  const [activePersonaId, setActivePersonaId] = useState<VoicePersonaId>(
    () => getStoredVoicePersonaSettings(user).personaId
  );
  const [pitchMultiplier, setPitchMultiplier] = useState<number>(
    () => getStoredVoicePersonaSettings(user).pitchMultiplier
  );
  const [rateMultiplier, setRateMultiplier] = useState<number>(
    () => getStoredVoicePersonaSettings(user).rateMultiplier
  );
  const [isPersonaSelectorOpen, setIsPersonaSelectorOpen] = useState(false);
  const activePersona = useMemo(() => getVoicePersona(activePersonaId), [activePersonaId]);

  useEffect(() => {
    const synced = getStoredVoicePersonaSettings(user);
    setActivePersonaId(synced.personaId);
    setPitchMultiplier(synced.pitchMultiplier);
    setRateMultiplier(synced.rateMultiplier);
  }, [user?.voicePersona, user?.voicePersonaPitch, user?.voicePersonaRate]);

  useEffect(() => {
    const handlePersonaUpdated = (event: Event) => {
      const detail = (event as CustomEvent<VoicePersonaSettings>).detail;
      if (!detail) return;
      setActivePersonaId(detail.personaId);
      setPitchMultiplier(detail.pitchMultiplier);
      setRateMultiplier(detail.rateMultiplier);
    };
    window.addEventListener(VOICE_PERSONA_UPDATED_EVENT, handlePersonaUpdated);
    return () => {
      window.removeEventListener(VOICE_PERSONA_UPDATED_EVENT, handlePersonaUpdated);
    };
  }, []);

  // Conversation History (deduplicated on load)
  const [conversationHistory, setConversationHistory] = useState<ConversationTurn[]>(() => {
    try {
      const saved = localStorage.getItem('axumite_voice_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return dedupeRecordsByIdAndContent<ConversationTurn>(
            parsed as ConversationTurn[],
            (item: ConversationTurn) => item.id || '',
            (item: ConversationTurn) => `${item.role}|${normalizeTextKey(item.text)}`,
            20
          );
        }
      }
    } catch {}
    return [
      {
        id: 'init-1',
        role: 'assistant',
        text: 'Greetings. I am your Axumite Sovereign Voice Assistant. Tap the golden microphone to speak in English, German, Tigrinya (ትግርኛ), or Amharic (አማርኛ).',
        textTi: 'ሰላም። ኣነ ናይ ኣክሱማይት AI ድምጻዊ ረዳኢ እየ። ብእንግሊዝኛ፡ ጀርመንኛ፡ ትግርኛ ወይ ኣምሓርኛ ንምዝራብ ወርቃዊ ማይክሮፎን ጠውቑ።',
        spokenText: 'Greetings. I am your Axumite Sovereign Voice Assistant. Tap the golden microphone to begin.',
        language: 'English',
        timestamp: 'Just now',
        personaId: 'ancient_historian'
      }
    ];
  });

  // Save deduplicated history to localStorage safely
  useEffect(() => {
    const cleanHistory = dedupeRecordsByIdAndContent<ConversationTurn>(
      conversationHistory,
      (item: ConversationTurn) => item.id || '',
      (item: ConversationTurn) => `${item.role}|${normalizeTextKey(item.text)}`,
      20
    );
    safeWriteLocalStorage('axumite_voice_history', cleanHistory);
  }, [conversationHistory]);

  // Web Audio & Speech Recognition Refs
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const ttsAbortRef = useRef<AbortController | null>(null);
  const silenceTimerRef = useRef<any>(null);

  // Stop Audio Visualizer & clean streams
  const stopAudioVisualizer = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setActiveAnalyser(null);
    setAudioLevel(0);
    setAudioFrequencies([12, 18, 25, 30, 24, 18, 14, 10, 8]);
  }, []);

  // Live Audio Frequency Visualizer using Web Audio API
  const startAudioVisualizer = useCallback(async (stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      
      const audioCtx = new AudioCtx();
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.75;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;
      setActiveAnalyser(analyser);

      const freqDataArray = new Uint8Array(analyser.frequencyBinCount);
      const timeDataArray = new Uint8Array(analyser.fftSize);

      const updateWave = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(freqDataArray);
        analyserRef.current.getByteTimeDomainData(timeDataArray);

        let sum = 0;
        const sampled: number[] = [];
        const step = Math.max(1, Math.floor(freqDataArray.length / 9));

        for (let i = 0; i < 9; i++) {
          const val = freqDataArray[i * step] || 0;
          sampled.push(Math.max(8, Math.min(100, Math.round((val / 255) * 100))));
          sum += val;
        }

        // Calculate RMS amplitude from time-domain for responsive mic gain
        let rmsSum = 0;
        for (let i = 0; i < timeDataArray.length; i++) {
          const norm = (timeDataArray[i] - 128) / 128;
          rmsSum += norm * norm;
        }
        const rms = Math.sqrt(rmsSum / timeDataArray.length);
        const dynamicVol = Math.min(1.8, Math.max(rms * 3.5, sum / (freqDataArray.length * 80)));

        setAudioFrequencies(sampled);
        setAudioLevel(dynamicVol);

        animFrameRef.current = requestAnimationFrame(updateWave);
      };

      updateWave();
    } catch (e) {
      console.warn('Audio visualizer error:', e);
    }
  }, []);

  // Stop current text-to-speech (Gemini TTS audio & browser fallback)
  const handleStopSpeaking = useCallback(() => {
    if (ttsAbortRef.current) {
      ttsAbortRef.current.abort();
      ttsAbortRef.current = null;
    }
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current.src = '';
      ttsAudioRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setStatusState('idle');
  }, []);

  // Speak text using active AI Voice Persona (Gemini 3.8 TTS with Web Speech fallback)
  const speakWithActivePersona = useCallback(
    async (
      textToSpeak: string,
      options?: {
        langCode?: string;
        languageLabel?: string;
        onFinished?: () => void;
      }
    ) => {
      if (!textToSpeak || !textToSpeak.trim()) {
        setStatusState('idle');
        return;
      }

      if (ttsAbortRef.current) {
        ttsAbortRef.current.abort();
        ttsAbortRef.current = null;
      }
      if (ttsAudioRef.current) {
        ttsAudioRef.current.pause();
        ttsAudioRef.current.src = '';
        ttsAudioRef.current = null;
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }

      const clampedRate = Math.min(2.0, Math.max(0.5, (activePersona.speechRate || 1.0) * rateMultiplier));
      const clampedPitch = Math.min(2.0, Math.max(0.5, (activePersona.speechPitch || 1.0) * pitchMultiplier));

      const playBrowserFallback = () => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
          setIsSpeaking(false);
          setStatusState('idle');
          return;
        }
        try {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(textToSpeak);
          utterance.rate = clampedRate;
          utterance.pitch = clampedPitch;

          const voices = window.speechSynthesis.getVoices();
          if (voices && voices.length > 0) {
            const code = options?.langCode || (isTigrinya ? 'ti' : 'en');
            const matchingVoice = voices.find((v) => v.lang.startsWith(code));
            if (matchingVoice) utterance.voice = matchingVoice;
          }

          utterance.onstart = () => {
            setIsSpeaking(true);
            setStatusState('speaking');
          };
          utterance.onend = () => {
            setIsSpeaking(false);
            setStatusState('idle');
            options?.onFinished?.();
          };
          utterance.onerror = () => {
            setIsSpeaking(false);
            setStatusState('idle');
          };

          speechSynthRef.current = utterance;
          window.speechSynthesis.speak(utterance);
        } catch {
          setIsSpeaking(false);
          setStatusState('idle');
        }
      };

      const controller = new AbortController();
      ttsAbortRef.current = controller;
      setIsSpeaking(true);
      setStatusState('speaking');

      try {
        const res = await fetch('/api/obelisk/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            text: textToSpeak.slice(0, 600),
            voice: activePersona.geminiVoiceName,
            personaId: activePersonaId,
            style: activePersona.speechStylePrompt,
            language: options?.languageLabel || (isTigrinya ? 'Tigrinya' : 'English'),
          }),
        });

        if (!res.ok) {
          throw new Error(`TTS HTTP ${res.status}`);
        }

        const ttsData = await res.json();
        if (controller.signal.aborted) return;

        if (ttsData.audioBase64) {
          const audioUrl = base64PcmToWavDataUrl(ttsData.audioBase64, ttsData.sampleRate || 24000);
          const audio = new Audio(audioUrl);
          audio.playbackRate = Math.min(2.0, Math.max(0.5, rateMultiplier));
          ttsAudioRef.current = audio;

          audio.onended = () => {
            ttsAudioRef.current = null;
            setIsSpeaking(false);
            setStatusState('idle');
            options?.onFinished?.();
          };
          audio.onerror = () => {
            ttsAudioRef.current = null;
            playBrowserFallback();
          };

          await audio.play();
          return;
        }

        playBrowserFallback();
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        playBrowserFallback();
      }
    },
    [activePersona, activePersonaId, isTigrinya, pitchMultiplier, rateMultiplier]
  );

  // Send query to AI Voice Assistant server endpoint
  const sendVoiceQueryToAI = async (queryText: string, audioBlob?: Blob) => {
    const trimmedQuery = queryText.trim();
    const hasAudioBlob = Boolean(audioBlob && audioBlob.size >= 120);
    if (!trimmedQuery && !hasAudioBlob) {
      setStatusState('idle');
      return;
    }

    // Check Daily Free Limit for Non-PRO users
    if (!isProOrHigher && dailyQueryCount >= TOTAL_FREE_QUOTA) {
      setIsDailyLimitModalOpen(true);
      setStatusState('idle');
      stopAudioVisualizer();
      return;
    }

    setStatusState('processing');
    setNetworkError(null);
    if (trimmedQuery) {
      setLastFailedQuery(trimmedQuery);
    }
    stopAudioVisualizer();

    // Prepare audio base64 if available
    let audioBase64: string | undefined = undefined;
    let audioMimeType: string | undefined = undefined;
    if (hasAudioBlob && audioBlob) {
      try {
        audioMimeType = (audioBlob.type || 'audio/webm').split(';')[0];
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve((reader.result as string) || '');
          reader.readAsDataURL(audioBlob);
        });
        const base64Payload = dataUrl.split(',')[1] || '';
        if (base64Payload.trim().length > 0) {
          audioBase64 = dataUrl;
        }
      } catch (err) {
        console.warn("Blob conversion error:", err);
      }
    }

    if (!trimmedQuery && !audioBase64) {
      setStatusState('idle');
      setNetworkError(
        isTigrinya
          ? 'ዝተቀድሐ ድምጺ ወይ ጽሑፍ ኣይተረኽበን። በጃኹም ዳግማይ ፈትኑ።'
          : 'No audio or speech detected. Please speak clearly or type a prompt below.'
      );
      return;
    }

    try {
      const response = await fetch('/api/obelisk/voice-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: trimmedQuery,
          audioBase64,
          mimeType: audioMimeType,
          language: selectedVoiceLang,
          personaId: activePersonaId,
          conversationHistory: conversationHistory.slice(-5).map(c => ({
            role: c.role,
            content: c.text
          }))
        })
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => null);
        throw new Error(errBody?.error || errBody?.message || `Server returned HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.noSpeechDetected) {
        setStatusState('idle');
        setNetworkError(isTigrinya ? (data.replyTi || data.reply) : data.reply);
        return;
      }

      const userText = data.transcript || trimmedQuery || (isTigrinya ? 'ናይ ድምጺ መልእኽቲ' : 'Voice Message');
      const replyEn = data.reply || "Processed by Axumite Sovereign Voice Core.";
      const replyTi = data.replyTi || "ብኣክሱማይት AI ተሰሪሑ ኣሎ።";
      const spoken = data.spokenText || (isTigrinya && replyTi ? replyTi : replyEn);

      setCurrentReply(replyEn);
      setCurrentReplyTi(replyTi);
      setCurrentSpokenText(spoken);
      setDetectedLangName(data.detectedLanguage || 'English');

      if (Array.isArray(data.suggestedFollowUps) && data.suggestedFollowUps.length > 0) {
        setSuggestedPrompts(data.suggestedFollowUps);
      }

      // Add to conversation history
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const newTurns: ConversationTurn[] = [
        {
          id: `usr-${Date.now()}`,
          role: 'user',
          text: userText,
          language: data.detectedLanguage || 'English',
          timestamp: nowStr,
        },
        {
          id: `ast-${Date.now() + 1}`,
          role: 'assistant',
          text: replyEn,
          textTi: replyTi,
          spokenText: spoken,
          language: data.detectedLanguage || 'English',
          timestamp: nowStr,
          personaId: activePersonaId,
        }
      ];

      setConversationHistory(prev => [...newTurns, ...prev.slice(0, 18)]);
      playCommandSuccessChime();

      if (!isProOrHigher) {
        setDailyQueryCount(prev => {
          const updated = prev + 1;
          try {
            const todayKey = `axum_free_voice_${new Date().toISOString().slice(0, 10)}`;
            localStorage.setItem(todayKey, updated.toString());
          } catch {}
          return updated;
        });
      }

      // Trigger automatic navigation if user requested a specific applet tab
      if (data.action && onNavigateTab) {
        if (data.action === 'translator') onNavigateTab('translator');
        else if (data.action === 'business-hub') onNavigateTab('business-hub');
        else if (data.action === 'management') onNavigateTab('management');
        else if (data.action === 'education') onNavigateTab('education');
      }

      // Speak response aloud using active AI Voice Persona (Gemini 3.8 TTS + fallback)
      if (speechFeedbackEnabled) {
        const textToSpeak = isTigrinya && replyTi ? replyTi : spoken;
        speakWithActivePersona(textToSpeak, {
          langCode: data.detectedLanguageCode || (isTigrinya ? 'ti' : 'en'),
          languageLabel: data.detectedLanguage || (isTigrinya ? 'Tigrinya' : 'English'),
          onFinished: () => {
            if (autoListenAfterResponse) {
              setTimeout(() => {
                handleStartListening();
              }, 400);
            }
          },
        });
      } else {
        setStatusState('idle');
      }

    } catch (err: any) {
      console.error("Voice assistant query error:", err);
      setNetworkError(err.message || "Failed to reach Axumite Voice Server.");
      setStatusState('idle');
    }
  };

  // Start Real-Time Microphone Listening
  const handleStartListening = async () => {
    // If currently speaking, interrupt immediately and switch to listening!
    if (isSpeaking || statusState === 'speaking') {
      handleStopSpeaking();
    }

    setMicPermissionError(null);
    setNetworkError(null);
    setTranscript('');
    setInterimTranscript('');
    audioChunksRef.current = [];

    // Request actual microphone permissions
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setMicPermissionError("Audio recording not supported in this browser.");
      return;
    }

    try {
      playVoiceTriggerChime();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // Start live visualizer
      startAudioVisualizer(stream);

      // Start parallel MediaRecorder for reliable audio capture
      try {
        const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
        const recorder = new MediaRecorder(stream, { mimeType: mime });
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
        };
        recorder.start(250);
        mediaRecorderRef.current = recorder;
      } catch (recErr) {
        console.warn("MediaRecorder init fallback:", recErr);
      }

      // Initialize SpeechRecognition
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        
        // Match selected language
        const langObj = SUPPORTED_VOICE_LANGUAGES.find(l => l.code === selectedVoiceLang);
        recognition.lang = langObj && langObj.code !== 'auto' ? langObj.bcp47 : (isTigrinya ? 'ti-ET' : 'en-US');

        recognition.onstart = () => {
          setIsListening(true);
          setStatusState('listening');
        };

        recognition.onresult = (event: any) => {
          let interim = '';
          let finalStr = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              finalStr += event.results[i][0].transcript;
            } else {
              interim += event.results[i][0].transcript;
            }
          }

          setInterimTranscript(interim);
          if (finalStr) {
            setTranscript(finalStr);
            handleStopListening(finalStr);
          }
        };

        recognition.onerror = (event: any) => {
          console.warn("Speech recognition notice:", event.error);
          if (event.error === 'not-allowed' || event.error === 'permission-denied') {
            setMicPermissionError(
              isTigrinya
                ? 'ፍቓድ ማይክሮፎን ተኸልኪሉ ኣሎ። በጃኹም ኣብ ብራውዘር ሴቲንግ ፍቓድ ሃቡ።'
                : 'Microphone access denied. Please allow microphone permissions in browser settings.'
            );
            handleStopListening();
          }
        };

        recognition.onend = () => {
          // If no speech recognition result was produced, we can fallback to recorded audio chunks
          if (isListening && !transcript) {
            handleStopListening();
          }
        };

        recognition.start();
        recognitionRef.current = recognition;
      } else {
        // Browser without Web Speech Recognition: use direct audio recording
        setIsListening(true);
        setStatusState('listening');
      }

    } catch (err: any) {
      console.warn("Microphone access notice:", err?.name || err?.message || err);
      const isPermissionDenied = err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError' || (err?.message && err.message.toLowerCase().includes('permission'));
      
      setMicPermissionError(
        isPermissionDenied
          ? (isTigrinya 
              ? "ፍቓድ ማይክሮፎን ኣብዚ ብራውዘር ተኸልኪሉ ኣሎ። ኣብ ሓድሽ መስኮት ብምኽፋት ወይ ናይ ፈተነ ድምጻዊ ትእዛዝ ብምጥዋቕ ፈትኑ።" 
              : "Microphone access is restricted by browser or iframe permissions. You can open in a new window or try a demo voice prompt.")
          : (isTigrinya 
              ? "ማይክሮፎን ክርከብ ኣይከኣለን። በጃኹም ናይ ማይክሮፎን መሳርሒ ምትእስሳር ኣረጋግጹ።" 
              : "Could not access microphone hardware. Please check your audio input settings.")
      );
      setIsListening(false);
      setStatusState('idle');
      stopAudioVisualizer();
    }
  };

  // Stop listening and trigger AI query
  const handleStopListening = async (finalText?: string) => {
    setIsListening(false);
    playVoiceDeactivateChime();

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }

    const query = (finalText || transcript || interimTranscript || '').trim();

    // Flush MediaRecorder gracefully so final encoded audio chunks arrive before building the Blob
    let audioBlob: Blob | undefined = undefined;
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, 250);
        const prevOnStop = recorder.onstop;
        recorder.onstop = (ev) => {
          clearTimeout(timer);
          if (typeof prevOnStop === 'function') {
            try { prevOnStop.call(recorder, ev); } catch {}
          }
          resolve();
        };
        try {
          recorder.stop();
        } catch {
          clearTimeout(timer);
          resolve();
        }
      });
    }
    mediaRecorderRef.current = null;

    if (audioChunksRef.current.length > 0) {
      const recMime = recorder?.mimeType || 'audio/webm';
      const candidate = new Blob(audioChunksRef.current, { type: recMime });
      if (candidate.size >= 120) {
        audioBlob = candidate;
      }
    }

    stopAudioVisualizer();

    if (query || audioBlob) {
      sendVoiceQueryToAI(query, audioBlob);
    } else {
      setStatusState('idle');
    }
  };

  // Handle Interrupt Action
  const handleInterrupt = () => {
    handleStopSpeaking();
    handleStartListening();
  };

  // Retry last failed request
  const handleRetry = () => {
    if (lastFailedQuery) {
      sendVoiceQueryToAI(lastFailedQuery);
    } else {
      handleStartListening();
    }
  };

  // Replay a previous message with the active AI Voice Persona
  const handleReplayTurn = (turn: ConversationTurn) => {
    const text = turn.spokenText || turn.text;
    speakWithActivePersona(text, {
      languageLabel: turn.language || (isTigrinya ? 'Tigrinya' : 'English'),
    });
  };

  // Copy text to clipboard
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopAudioVisualizer();
      handleStopSpeaking();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, [stopAudioVisualizer, handleStopSpeaking]);

  if (!isOpen && !standalone) return null;

  return (
    <div className={`${standalone ? 'w-full min-h-screen' : 'fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/90 backdrop-blur-2xl'} select-none text-slate-100 font-sans`}>
      
      {/* Outer ambient glow & golden atmospheric dust */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-b from-[#C5A059]/12 via-[#8E6D28]/6 to-transparent rounded-full blur-[140px]" />
        <div className="absolute bottom-10 left-10 w-[400px] h-[400px] bg-[#0A192F]/20 rounded-full blur-[120px]" />
      </div>

      {/* Main Container / Device Frame */}
      <div 
        className={`relative transition-all duration-500 overflow-hidden ${
          displayFrameMode === 'device' && !standalone
            ? 'w-full max-w-[440px] h-[92vh] max-h-[880px] rounded-[48px] border-[6px] border-[#1C1814] shadow-[0_0_0_1px_rgba(212,175,55,0.4),0_25px_80px_rgba(0,0,0,0.95),0_0_50px_rgba(212,175,55,0.15)] ring-1 ring-[#D4AF37]/20 bg-[#06070B]'
            : 'w-full max-w-5xl min-h-[85vh] rounded-3xl border border-[#D4AF37]/35 shadow-[0_20px_70px_rgba(0,0,0,0.9),0_0_60px_rgba(212,175,55,0.12)] bg-[#07090E]/95'
        } flex flex-col justify-between`}
      >
        {/* Smartphone Hardware Notch (Device Mode) */}
        {displayFrameMode === 'device' && !standalone && (
          <>
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-4 bg-[#111] rounded-full z-40 flex items-center justify-center space-x-2 border border-white/5 shadow-inner">
              <div className="w-2.5 h-2.5 rounded-full bg-[#07080D] border border-blue-500/20" />
              <div className="w-10 h-1 bg-[#222] rounded-full" />
            </div>
            <div className="absolute inset-0 rounded-[42px] border border-white/5 pointer-events-none z-30" />
          </>
        )}

        {/* Ambient Top Light Flare */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-36 bg-gradient-to-b from-[#D4AF37]/15 to-transparent blur-2xl pointer-events-none" />

        {/* ========================================================================= */}
        {/* 1. TOP HEADER: "AI ASSISTANT", Back Button, Status Pill & Controls */}
        {/* ========================================================================= */}
        <header className="relative z-20 px-5 pt-8 pb-3 flex items-center justify-between border-b border-[#D4AF37]/15 bg-gradient-to-b from-[#0C0E17]/80 to-transparent backdrop-blur-md">
          
          {/* Left: Back / Close & Widescreen toggle */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose || (() => {})}
              className="w-10 h-10 rounded-full bg-[#12141F]/90 hover:bg-[#1C1F2E] border border-[#D4AF37]/40 hover:border-[#F3E5AB] text-[#D4AF37] hover:text-[#FFF3B0] flex items-center justify-center transition-all duration-300 shadow-[0_4px_16px_rgba(0,0,0,0.6)] cursor-pointer active:scale-90 group"
              title="Close Voice Assistant"
              aria-label="Back / Dismiss Voice Assistant"
            >
              <ChevronDown className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
            </button>

            {!standalone && (
              <button
                onClick={() => setDisplayFrameMode(m => m === 'device' ? 'fullscreen' : 'device')}
                className="w-8 h-8 rounded-full bg-[#10121C]/80 border border-slate-700/60 hover:border-[#D4AF37]/40 text-slate-400 hover:text-amber-300 hidden sm:flex items-center justify-center transition-all cursor-pointer text-xs"
                title={displayFrameMode === 'device' ? "Expand to Widescreen" : "Fit to Mobile Device Frame"}
              >
                {displayFrameMode === 'device' ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>
            )}

            {/* Conversation History Drawer Button */}
            <button
              onClick={() => setShowHistoryDrawer(!showHistoryDrawer)}
              className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all cursor-pointer text-xs ${
                showHistoryDrawer
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                  : 'bg-[#10121C]/80 border-slate-700/60 text-slate-400 hover:text-amber-300 hover:border-amber-400/40'
              }`}
              title="Conversation History"
            >
              <MessageSquare className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Centered Title */}
          <div className="text-center flex flex-col items-center">
            <h1 className="text-sm sm:text-base md:text-lg font-serif font-black tracking-[0.28em] uppercase bg-gradient-to-r from-[#D4AF37] via-[#FFF3B0] to-[#AA7C11] bg-clip-text text-transparent drop-shadow-[0_2px_12px_rgba(212,175,55,0.4)]">
              AI ASSISTANT
            </h1>
            <span className="text-[8px] font-mono tracking-widest text-[#D4AF37]/70 uppercase">
              SOVEREIGN VOICE INTELLIGENCE
            </span>
          </div>

          {/* Right: State Pill & Audio Mute Toggle */}
          <div className="flex items-center space-x-2">
            <div className={`px-3 py-1 rounded-full border shadow-[0_0_15px_rgba(212,175,55,0.15)] flex items-center space-x-1.5 backdrop-blur-md transition-all duration-300 ${
              statusState === 'listening'
                ? 'bg-amber-950/85 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                : statusState === 'speaking'
                ? 'bg-emerald-950/85 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                : 'bg-[#0D101B]/90 border-[#D4AF37]/40'
            }`}>
              {statusState === 'listening' ? (
                <div className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_#F59E0B] animate-ping" />
                  {/* Live mini equalizers */}
                  <div className="flex items-end space-x-0.5 h-3 px-0.5">
                    <span 
                      className="w-0.5 bg-amber-300 rounded-full transition-all duration-75"
                      style={{ height: `${Math.max(3, Math.min(12, 3 + (audioFrequencies[1] || 0) * 0.12))}px` }}
                    />
                    <span 
                      className="w-0.5 bg-amber-400 rounded-full transition-all duration-75"
                      style={{ height: `${Math.max(4, Math.min(12, 4 + (audioFrequencies[4] || 0) * 0.15))}px` }}
                    />
                    <span 
                      className="w-0.5 bg-amber-300 rounded-full transition-all duration-75"
                      style={{ height: `${Math.max(3, Math.min(12, 3 + (audioFrequencies[7] || 0) * 0.12))}px` }}
                    />
                  </div>
                </div>
              ) : (
                <span className={`w-2 h-2 rounded-full ${
                  statusState === 'processing'
                    ? 'bg-sky-400 shadow-[0_0_8px_#38BDF8] animate-spin'
                    : statusState === 'speaking'
                    ? 'bg-emerald-400 shadow-[0_0_8px_#10B981] animate-pulse'
                    : 'bg-[#D4AF37] shadow-[0_0_6px_#D4AF37]'
                }`} />
              )}
              <span className={`text-[9px] font-mono font-black tracking-widest uppercase ${
                statusState === 'listening' ? 'text-amber-200' : 'text-[#FFF3B0]'
              }`}>
                {statusState === 'listening' 
                  ? `REC • ${Math.round(Math.min(100, audioLevel * 70))}%` 
                  : statusState === 'processing' 
                  ? 'PROCESSING' 
                  : statusState === 'speaking' 
                  ? 'SPEAKING' 
                  : '● READY'}
              </span>
            </div>

            {/* LIVE / PRO Limit Badge (from mobile AI Assistant screen) */}
            <button
              type="button"
              onClick={() => setIsDailyLimitModalOpen(true)}
              className="px-2.5 py-1 rounded-full bg-[#10182E]/90 hover:bg-[#1A2544] border border-sky-400/40 text-sky-200 hover:text-white flex items-center space-x-1.5 backdrop-blur-md transition-all shadow-[0_0_12px_rgba(56,189,248,0.2)] cursor-pointer text-[10px] font-mono font-bold active:scale-95"
              title={isProOrHigher ? "PRO Active: Unlimited Access" : `Daily Free Limit: ${dailyQueryCount}/${TOTAL_FREE_QUOTA} used (Click to view limit)`}
            >
              <span className="w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_8px_#38BDF8] animate-pulse" />
              <span>LIVE</span>
              {!isProOrHigher && (
                <span className="text-[9px] text-amber-300 font-sans font-semibold">
                  {Math.max(0, TOTAL_FREE_QUOTA - dailyQueryCount)}/{TOTAL_FREE_QUOTA}
                </span>
              )}
            </button>

            {/* Mute/Unmute Audio Speech Feedback */}
            <button
              onClick={() => {
                if (isSpeaking) handleStopSpeaking();
                setSpeechFeedbackEnabled(!speechFeedbackEnabled);
              }}
              className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                speechFeedbackEnabled
                  ? 'bg-amber-500/15 border-amber-400/40 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                  : 'bg-slate-900/80 border-slate-700/60 text-slate-500'
              }`}
              title={speechFeedbackEnabled ? "Audio Output Enabled" : "Muted"}
            >
              {speechFeedbackEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* ========================================================================= */}
        {/* 2. MAIN CENTER BODY: Interactive Concentric Rings & Functional Mic Orb    */}
        {/* ========================================================================= */}
        <div className="relative z-10 flex-1 px-4 sm:px-6 py-3 flex flex-col items-center justify-between overflow-y-auto space-y-4">
          
          {/* Top Telemetry Bar & Language / Persona Selectors */}
          <div className="w-full flex items-center justify-between text-[9px] font-mono px-1">
            
            {/* Active Persona Pill */}
            <button
              type="button"
              onClick={() => setIsPersonaSelectorOpen(true)}
              className="px-2.5 py-1 rounded-full bg-[#121524] hover:bg-[#1C2138] border border-[#D4AF37]/40 hover:border-[#D4AF37] text-[#FFF3B0] flex items-center space-x-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
              title="Change Voice Persona Tone"
            >
              <span className="text-[10px]">{activePersona.avatarIcon}</span>
              <span className="font-bold uppercase tracking-wider">{activePersona.name}</span>
              <span className="text-[#D4AF37]">&bull; Tone</span>
            </button>

            {/* Multilingual Voice Input Dropdown */}
            <div className="flex items-center space-x-1">
              <Languages className="w-3 h-3 text-[#D4AF37]/80" />
              <select
                value={selectedVoiceLang}
                onChange={(e) => setSelectedVoiceLang(e.target.value as VoiceLanguageCode)}
                className="bg-[#121524] border border-[#D4AF37]/40 rounded-full px-2 py-0.5 text-[9px] font-mono text-[#FFF3B0] focus:outline-none cursor-pointer"
              >
                {SUPPORTED_VOICE_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code} className="bg-[#0B0D16] text-slate-200">
                    {l.flag} {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Error / Permission Banner */}
          {micPermissionError && (
            <div className="w-full max-w-md bg-[#181116]/95 border border-amber-500/40 rounded-2xl p-3.5 text-slate-200 text-xs shadow-xl animate-in fade-in space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start space-x-2">
                  <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                    <MicOff className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="font-bold text-amber-200">{micPermissionError}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {isTigrinya 
                        ? "ኣብ ውሽጢ iframe ንዝርከብ ፍቓድ ማይክሮፎን ብሓድሽ tab ወይ ብናይ ፈተነ ትእዛዝ ክትጥቀሙ ትኽእሉ ኢኹም።"
                        : "Browsers may restrict mic access inside embedded previews. You can open in a top-level tab or trigger a quick demo prompt."}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setMicPermissionError(null)}
                  className="text-slate-500 hover:text-slate-300 p-1 cursor-pointer"
                  title="Dismiss"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center flex-wrap gap-1.5 pt-1 border-t border-white/5">
                <button 
                  onClick={handleStartListening}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-black rounded-lg text-[10px] font-bold cursor-pointer transition-colors flex items-center space-x-1"
                >
                  <Mic className="w-3 h-3" />
                  <span>{isTigrinya ? "ደጊምካ ፍቐድ (Retry)" : "Retry Access"}</span>
                </button>

                <button
                  onClick={() => {
                    try {
                      window.open(window.location.href, '_blank');
                    } catch {}
                  }}
                  className="px-2.5 py-1 bg-[#221C28] hover:bg-[#2F2738] border border-amber-500/30 text-amber-300 rounded-lg text-[10px] font-medium cursor-pointer transition-colors flex items-center space-x-1"
                >
                  <Globe className="w-3 h-3" />
                  <span>{isTigrinya ? "ኣብ ሓድሽ Tab ክፈት" : "Open in New Tab"}</span>
                </button>

                <button
                  onClick={() => {
                    setMicPermissionError(null);
                    sendVoiceQueryToAI(
                      isTigrinya 
                        ? "ሰላም ኣክሱማይት AI፡ ታሪኽ ኣክሱም ብሓጺሩ ግለጸለይ።" 
                        : "Greetings Axumite AI, explain the golden heritage and trade of Axum."
                    );
                  }}
                  className="px-2.5 py-1 bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 rounded-lg text-[10px] font-medium cursor-pointer transition-colors flex items-center space-x-1"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{isTigrinya ? "ናይ ፈተነ ትእዛዝ ስራሕ" : "Try Demo Voice Command"}</span>
                </button>
              </div>
            </div>
          )}

          {networkError && (
            <div className="w-full max-w-md bg-amber-950/80 border border-amber-500/50 rounded-xl p-3 text-amber-200 text-xs flex items-center justify-between animate-in fade-in">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{networkError}</span>
              </div>
              <button
                onClick={handleRetry}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-black font-bold rounded text-[10px] flex items-center space-x-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retry</span>
              </button>
            </div>
          )}

          {/* Central Microphone Orb with Multiple Concentric Rings & Orbital Lines */}
          <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center my-auto">
            
            {/* Ambient Radial Golden Aura Glow */}
            <div 
              className={`absolute inset-0 rounded-full bg-gradient-to-tr from-[#D4AF37]/25 via-[#F3E5AB]/20 to-transparent blur-3xl transition-all duration-700 pointer-events-none ${
                statusState === 'listening' ? 'scale-125 opacity-100' : statusState === 'speaking' ? 'scale-115 opacity-80' : 'scale-90 opacity-40'
              }`} 
            />

            {/* Concentric Ring 1: Outer Dotted Orbital Geometry Ring with Degree Marks */}
            <div className={`absolute w-64 h-64 sm:w-72 sm:h-72 rounded-full border border-dashed border-[#D4AF37]/25 transition-transform duration-1000 ${
              statusState === 'listening' ? 'animate-[spin_20s_linear_infinite]' : statusState === 'speaking' ? 'animate-[spin_35s_linear_infinite]' : 'animate-[spin_60s_linear_infinite]'
            }`}>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-[#D4AF37] rounded-full shadow-[0_0_8px_#D4AF37]" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1.5 h-1.5 bg-[#D4AF37] rounded-full shadow-[0_0_8px_#D4AF37]" />
              <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#D4AF37] rounded-full shadow-[0_0_8px_#D4AF37]" />
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-1.5 h-1.5 bg-[#D4AF37] rounded-full shadow-[0_0_8px_#D4AF37]" />
            </div>

            {/* Concentric Ring 2: Precision Metric Degree HUD Ring */}
            <div className="absolute w-52 h-52 sm:w-60 sm:h-60 rounded-full border border-[#D4AF37]/35 flex items-center justify-center pointer-events-none">
              <span className="absolute top-1 text-[8px] font-mono text-[#D4AF37]/60 tracking-widest">000°</span>
              <span className="absolute right-1 text-[8px] font-mono text-[#D4AF37]/60 tracking-widest">090°</span>
              <span className="absolute bottom-1 text-[8px] font-mono text-[#D4AF37]/60 tracking-widest">180°</span>
              <span className="absolute left-1 text-[8px] font-mono text-[#D4AF37]/60 tracking-widest">270°</span>
            </div>

            {/* Concentric Ring 3: Sound-Reactive Golden Ripple Waves (Real mic amplitude reaction) */}
            {statusState === 'listening' && (
              <>
                <div 
                  className="absolute w-44 h-44 sm:w-48 sm:h-48 rounded-full border-2 border-amber-400/60 animate-ping pointer-events-none"
                  style={{ animationDuration: '2s' }}
                />
                <div 
                  className="absolute w-48 h-48 sm:w-56 sm:h-56 rounded-full border border-amber-400/30 pointer-events-none transition-transform duration-75"
                  style={{ 
                    transform: `scale(${1 + Math.min(0.6, audioLevel * 0.5)})`,
                    opacity: Math.min(1, 0.4 + audioLevel * 0.6)
                  }}
                />
                <div 
                  className="absolute w-40 h-40 sm:w-44 sm:h-44 rounded-full bg-gradient-to-r from-amber-500/30 via-yellow-400/20 to-amber-600/30 pointer-events-none transition-transform duration-75 shadow-[0_0_35px_rgba(245,158,11,0.4)]"
                  style={{ transform: `scale(${1 + Math.min(0.5, audioLevel * 0.4)})` }}
                />
              </>
            )}

            {/* Speaking Pulse Wave */}
            {statusState === 'speaking' && (
              <div className="absolute w-44 h-44 sm:w-48 sm:h-48 rounded-full border-2 border-emerald-400/50 animate-pulse pointer-events-none" />
            )}

            {/* Processing Neural Spinner */}
            {statusState === 'processing' && (
              <div className="absolute w-40 h-40 rounded-full border-2 border-t-amber-400 border-r-amber-300 border-b-transparent border-l-transparent animate-spin pointer-events-none" />
            )}

            {/* Concentric Ring 4: Thin High-Contrast Golden Edge Border */}
            <div className="absolute w-36 h-36 sm:w-40 sm:h-40 rounded-full border-2 border-[#D4AF37]/70 shadow-[0_0_30px_rgba(212,175,55,0.3)] pointer-events-none" />

            {/* THE PRIMARY GLOWING GOLD FUNCTIONAL MICROPHONE BUTTON */}
            <button
              type="button"
              onClick={() => {
                if (statusState === 'speaking') {
                  handleInterrupt();
                } else if (statusState === 'listening') {
                  handleStopListening();
                } else {
                  handleStartListening();
                }
              }}
              className={`relative z-20 w-28 h-28 sm:w-32 sm:h-32 rounded-full flex flex-col items-center justify-center transition-all duration-300 transform active:scale-95 cursor-pointer select-none group shadow-[0_12px_45px_rgba(0,0,0,0.9),0_0_40px_rgba(212,175,55,0.4)] ${
                statusState === 'listening'
                  ? 'bg-gradient-to-br from-[#FFF4B8] via-[#D4AF37] to-[#8E6D28] ring-4 ring-[#FFF3B0]/60 scale-105 shadow-[0_0_60px_rgba(212,175,55,0.8)]'
                  : statusState === 'speaking'
                  ? 'bg-gradient-to-br from-[#A7F3D0] via-[#10B981] to-[#065F46] ring-4 ring-emerald-400/50 scale-102 shadow-[0_0_50px_rgba(16,185,129,0.7)]'
                  : statusState === 'processing'
                  ? 'bg-gradient-to-br from-[#7DD3FC] via-[#0284C7] to-[#075985] scale-95 opacity-90'
                  : 'bg-gradient-to-br from-[#E6C66D] via-[#C5A059] to-[#8E6D28] hover:from-[#FFF3B0] hover:via-[#D4AF37] hover:to-[#A37E26] hover:scale-102'
              }`}
              title={
                statusState === 'listening' 
                  ? "Tap to Process / Stop Listening" 
                  : statusState === 'speaking' 
                  ? "Tap to Interrupt & Speak" 
                  : statusState === 'processing' 
                  ? "Processing..." 
                  : "Tap to Speak"
              }
              aria-label="Microphone Interaction Hub"
            >
              {/* Glassmorphic Top Specular Sheen */}
              <div className="absolute top-1.5 left-3 right-3 h-8 bg-gradient-to-b from-white/60 to-transparent rounded-t-full pointer-events-none opacity-80" />

              {/* Icon Container */}
              <div className="relative z-10 w-12 h-12 rounded-full bg-[#0A0C12] border border-black/80 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                {statusState === 'listening' ? (
                  <Mic className="w-6 h-6 text-[#D4AF37] animate-pulse" />
                ) : statusState === 'speaking' ? (
                  <Waves className="w-6 h-6 text-emerald-400 animate-bounce" />
                ) : statusState === 'processing' ? (
                  <RefreshCw className="w-6 h-6 text-sky-400 animate-spin" />
                ) : (
                  <Mic className="w-6 h-6 text-[#D4AF37]" />
                )}
              </div>

              {/* State Label Text directly under mic icon */}
              <span className="relative z-10 text-[8px] font-black tracking-widest text-[#08090E] uppercase mt-1">
                {statusState === 'listening' ? 'LISTENING' : statusState === 'speaking' ? 'INTERRUPT' : statusState === 'processing' ? 'THINKING' : 'TAP TO TALK'}
              </span>
            </button>
          </div>

          {/* Real-time Oscilloscope Waveform Visualizer & Amplitude Spectrum */}
          <div className="w-full max-w-md">
            <RealtimeAudioWaveform
              analyserNode={activeAnalyser}
              audioLevel={audioLevel}
              isListening={isListening || statusState === 'listening'}
              statusState={statusState}
              audioFrequencies={audioFrequencies}
              height={64}
              showDecibelMeter={true}
            />
          </div>

          {/* Sound-Reactive 9-Band Equalizer Frequency Bars */}
          <div className="flex items-center justify-center space-x-1.5 h-6">
            {audioFrequencies.map((freq, i) => (
              <div
                key={i}
                className={`w-1 rounded-full transition-all duration-75 shadow-[0_0_6px_rgba(212,175,55,0.4)] ${
                  statusState === 'speaking'
                    ? 'bg-gradient-to-t from-emerald-700 via-emerald-400 to-teal-200'
                    : 'bg-gradient-to-t from-[#8E6D28] via-[#D4AF37] to-[#FFF3B0]'
                }`}
                style={{
                  height: `${
                    statusState === 'listening' 
                      ? Math.max(4, freq * 0.22) 
                      : statusState === 'speaking' 
                      ? Math.sin(Date.now() / 150 + i * 0.8) * 6 + 10 
                      : 3
                  }}px`
                }}
              />
            ))}
          </div>

          {/* Live Transcript / Prompt Speech Display Card */}
          <div className="w-full max-w-md bg-[#0D0F18]/90 border border-[#D4AF37]/35 rounded-2xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.7)] backdrop-blur-md relative overflow-hidden">
            <div className="flex items-center justify-between text-[9px] text-[#D4AF37]/70 font-mono pb-1.5 border-b border-[#D4AF37]/15 mb-2">
              <span className="flex items-center space-x-1">
                <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                <span className="uppercase">STREAM &bull; {detectedLangName}</span>
              </span>
              <span className="uppercase tracking-wider font-bold text-amber-300">
                {statusState === 'idle' ? 'TAP TO SPEAK' : statusState === 'listening' ? 'LISTENING...' : statusState === 'processing' ? 'PROCESSING...' : 'SPEAKING...'}
              </span>
            </div>

            {/* Transcript or Interim Transcript */}
            {statusState === 'listening' ? (
              <div className="space-y-1 py-1">
                <p className="text-xs sm:text-sm font-semibold text-white leading-relaxed">
                  &ldquo;{transcript || interimTranscript || (isTigrinya ? "ተዛረቡ፡ እናዳመጽና ኢና..." : "Listening in real time...")}&rdquo;
                </p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-amber-400 font-mono animate-pulse">
                    ● Detecting speech cadence ({selectedVoiceLang.toUpperCase()})...
                  </span>
                  <button
                    onClick={() => handleStopListening()}
                    className="text-[10px] text-amber-300 hover:text-white underline cursor-pointer"
                  >
                    Done Speaking
                  </button>
                </div>
              </div>
            ) : statusState === 'processing' ? (
              <div className="py-2 flex items-center space-x-2 text-slate-300 text-xs">
                <RefreshCw className="w-4 h-4 text-sky-400 animate-spin shrink-0" />
                <span>
                  {isTigrinya 
                    ? "ናይ ኣክሱማይት AI ስርዓት ብልዑል ጥንቃቐ ይምልስ ኣሎ..." 
                    : "Axumite Sovereign Intelligence is synthesizing your answer..."}
                </span>
              </div>
            ) : currentReply ? (
              <div className="space-y-2">
                <p className="text-xs sm:text-sm text-[#F3E5AB] leading-relaxed">
                  {isTigrinya && currentReplyTi ? currentReplyTi : currentReply}
                </p>

                {/* Status bar when speaking */}
                {statusState === 'speaking' && (
                  <div className="flex items-center justify-between pt-1.5 border-t border-[#D4AF37]/15">
                    <span className="text-[10px] text-emerald-400 font-mono flex items-center space-x-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      <span>Speaking ({activePersona.name})...</span>
                    </span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleInterrupt}
                        className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-bold border border-amber-500/40 cursor-pointer"
                      >
                        Interrupt / Speak
                      </button>
                      <button
                        onClick={handleStopSpeaking}
                        className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                      >
                        Stop Audio
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-2">
                {isTigrinya 
                  ? 'ንምዝራብ ወርቃዊ ማይክሮፎን ጠውቑ ወይ ካብ ታሕቲ ዘለዉ ናሙናታት ምረጹ' 
                  : 'Tap the glowing microphone or choose a suggested voice prompt below'}
              </p>
            )}
          </div>

          {/* Quick 1-Tap Voice Commands / Follow-ups */}
          <div className="w-full max-w-md space-y-1.5">
            <div className="flex items-center justify-between text-[9px] font-mono text-[#D4AF37]/80 px-1">
              <span>SUGGESTED VOICE ACTIONS</span>
              <span className="text-slate-500">1-TAP VOICE QUERY</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {suggestedPrompts.slice(0, 4).map((promptText, idx) => (
                <button
                  key={idx}
                  onClick={() => sendVoiceQueryToAI(promptText)}
                  className="px-3 py-2 rounded-xl bg-[#10131F]/80 hover:bg-[#1A1E2F] border border-[#D4AF37]/25 hover:border-[#D4AF37]/70 text-left transition-all duration-200 cursor-pointer active:scale-95 group flex items-center justify-between"
                >
                  <p className="text-[10px] font-medium text-slate-200 group-hover:text-[#FFF3B0] line-clamp-2 leading-tight pr-1">
                    &ldquo;{promptText}&rdquo;
                  </p>
                  <ArrowRight className="w-3 h-3 text-[#D4AF37] shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </button>
              ))}
            </div>
          </div>

          {/* Text Input Fallback Bar */}
          <div className="w-full max-w-md">
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (manualInput.trim()) {
                  sendVoiceQueryToAI(manualInput.trim());
                  setManualInput('');
                }
              }}
              className="flex items-center space-x-2 bg-[#090B12] border border-[#D4AF37]/30 focus-within:border-[#D4AF37] rounded-xl px-3 py-1.5 transition-colors shadow-inner"
            >
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder={isTigrinya ? "ወይ ብጽሑፍ ድምጻዊ ትእዛዝ ኣእትዉ..." : "Or type a voice command..."}
                className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 outline-none"
              />
              <button
                type="submit"
                className="px-2.5 py-1 rounded-lg bg-[#D4AF37] hover:bg-[#FFF3B0] text-black font-bold text-[10px] transition-colors cursor-pointer flex items-center space-x-1"
              >
                <span>Ask</span>
                <CornerDownLeft className="w-3 h-3" />
              </button>
            </form>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* 3. BOTTOM FOOTER: Ge’ez Typography & Hands-Free Continuous Mode Toggle  */}
        {/* ========================================================================= */}
        <footer className="relative z-20 px-6 py-3.5 border-t border-[#D4AF37]/20 bg-gradient-to-t from-[#0C0E17]/95 via-[#0A0C13]/80 to-transparent backdrop-blur-md flex flex-col items-center justify-center text-center space-y-1.5">
          
          <div className="w-full flex items-center justify-center space-x-2">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent" />
            
            <h2 className="text-sm sm:text-base font-serif font-black tracking-wide bg-gradient-to-r from-[#BF953F] via-[#FCF6BA] to-[#AA771C] bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(212,175,55,0.35)]">
              ኣክሱማይት AI • ድምጻዊ ረዳኢ
            </h2>

            <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent" />
          </div>

          <div className="flex items-center space-x-4 text-[9px] font-mono text-[#D4AF37]/80">
            {/* Auto-Listen After Response Toggle */}
            <button
              onClick={() => setAutoListenAfterResponse(!autoListenAfterResponse)}
              className={`px-2.5 py-0.5 rounded-full border flex items-center space-x-1.5 transition-all cursor-pointer ${
                autoListenAfterResponse
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                  : 'bg-[#10121C] text-slate-400 border-slate-700/60 hover:text-amber-300'
              }`}
              title="Continuously listen for next question after AI finishes speaking"
            >
              <Radio className={`w-2.5 h-2.5 ${autoListenAfterResponse ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
              <span>{autoListenAfterResponse ? 'CONTINUOUS MODE: ON' : 'CONTINUOUS MODE: OFF'}</span>
            </button>

            {/* Hands-Free Wake Option */}
            {onToggleAlwaysListening && (
              <button
                onClick={onToggleAlwaysListening}
                className={`px-2.5 py-0.5 rounded-full border flex items-center space-x-1.5 transition-all cursor-pointer ${
                  isAlwaysListening
                    ? 'bg-amber-950/80 text-amber-300 border-amber-500/60'
                    : 'bg-[#10121C] text-slate-400 border-slate-700/60'
                }`}
              >
                <span>{isAlwaysListening ? 'WAKE WORD: ACTIVE' : 'WAKE WORD: OFF'}</span>
              </button>
            )}
          </div>
        </footer>

        {/* ========================================================================= */}
        {/* 4. CONVERSATION HISTORY DRAWER                                           */}
        {/* ========================================================================= */}
        {showHistoryDrawer && (
          <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col justify-end p-4 animate-in fade-in duration-200">
            <div className="bg-[#0C0E18] border border-[#D4AF37]/50 rounded-3xl p-4 shadow-2xl space-y-3 max-h-[85vh] flex flex-col">
              
              <div className="flex items-center justify-between border-b border-[#D4AF37]/20 pb-2.5">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-300">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-[#F3E5AB]">ዕላል ታሪኽ (Conversation History)</h3>
                    <p className="text-[9px] text-slate-400">Past spoken queries and AI answers</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setConversationHistory([]);
                      try { localStorage.removeItem('axumite_voice_history'); } catch {}
                    }}
                    className="text-[10px] text-rose-400 hover:text-rose-300 underline cursor-pointer px-2"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => setShowHistoryDrawer(false)}
                    className="w-7 h-7 rounded-full bg-[#181B28] border border-slate-700 hover:border-amber-400 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* History list */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-xs">
                {conversationHistory.length === 0 ? (
                  <p className="text-center text-slate-500 py-8">No past voice conversations.</p>
                ) : (
                  conversationHistory.map((turn) => (
                    <div 
                      key={turn.id}
                      className={`p-3 rounded-xl border ${
                        turn.role === 'user' 
                          ? 'bg-[#141829]/90 border-sky-500/30 text-sky-100 ml-4' 
                          : 'bg-[#151208]/90 border-[#D4AF37]/40 text-[#FFF3B0] mr-4'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono mb-1">
                        <span className="font-bold uppercase tracking-wider text-[#D4AF37]">
                          {turn.role === 'user' ? '👤 User' : `👑 ${turn.personaId || 'Axumite AI'}`}
                        </span>
                        <span>{turn.timestamp}</span>
                      </div>
                      <p className="leading-relaxed text-xs">
                        {isTigrinya && turn.textTi ? turn.textTi : turn.text}
                      </p>
                      <div className="flex items-center justify-end space-x-2 mt-2 pt-1 border-t border-white/5">
                        <button
                          onClick={() => handleCopy(turn.text, turn.id)}
                          className="text-[9px] text-slate-400 hover:text-white flex items-center space-x-1 cursor-pointer"
                        >
                          {copiedId === turn.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedId === turn.id ? 'Copied' : 'Copy'}</span>
                        </button>
                        {turn.role === 'assistant' && (
                          <button
                            onClick={() => handleReplayTurn(turn)}
                            className="text-[9px] text-amber-300 hover:text-amber-200 flex items-center space-x-1 cursor-pointer"
                          >
                            <Play className="w-3 h-3" />
                            <span>Replay Audio</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. VOICE PERSONA SELECTION MODAL DRAWER                                  */}
        {/* ========================================================================= */}
        {isPersonaSelectorOpen && (
          <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col justify-end p-4 animate-in fade-in duration-200">
            <div className="bg-[#0C0E18] border border-[#D4AF37]/50 rounded-3xl p-4 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[#D4AF37]/20 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-300">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-[#F3E5AB]">ናይ ድምጺ ፐርሶና ምረጹ (Select AI Voice Persona)</h3>
                    <p className="text-[10px] text-slate-400">Configure assistant character tone & cadence</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPersonaSelectorOpen(false)}
                  className="w-8 h-8 rounded-full bg-[#181B28] border border-slate-700 hover:border-amber-400 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <VoicePersonaSelector
                selectedPersonaId={activePersonaId}
                pitchMultiplier={pitchMultiplier}
                rateMultiplier={rateMultiplier}
                onSelectPersona={(newId) => {
                  setActivePersonaId(newId);
                  saveVoicePersonaSettings({ personaId: newId });
                  onUpdateUser?.({ voicePersona: newId });
                  setIsPersonaSelectorOpen(false);
                }}
                onChangeTuning={(tuning) => {
                  setPitchMultiplier(tuning.pitchMultiplier);
                  setRateMultiplier(tuning.rateMultiplier);
                  onUpdateUser?.({
                    voicePersonaPitch: tuning.pitchMultiplier,
                    voicePersonaRate: tuning.rateMultiplier,
                  });
                }}
                theme="dark"
              />
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 6. DAILY FREE LIMIT & PRO UPGRADE BOTTOM SHEET MODAL (from user screenshot) */}
        {/* ========================================================================= */}
        <AiAssistantDailyLimitModal
          isOpen={isDailyLimitModalOpen}
          onClose={() => setIsDailyLimitModalOpen(false)}
          remainingQueries={Math.max(0, TOTAL_FREE_QUOTA - dailyQueryCount)}
          totalFreeQueries={TOTAL_FREE_QUOTA}
          onUpgradeSuccess={() => {
            setDailyQueryCount(0);
          }}
          onOpenFullPricing={() => {
            if (onNavigateTab) onNavigateTab('premiere');
          }}
        />

      </div>
    </div>
  );
};
