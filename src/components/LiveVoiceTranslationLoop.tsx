import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  Square,
  Volume2,
  VolumeX,
  ArrowRightLeft,
  RefreshCw,
  Send,
  ChevronDown,
  ChevronUp,
  Waves,
  Sparkles,
  Loader2,
  Radio,
} from 'lucide-react';
import { ALL_INTERNATIONAL_LANGUAGES, LanguageOption } from '../utils/languages';
import { SovereignVoiceDashboard } from './SovereignVoiceDashboard';
import {
  VoiceTranslationLogRecord,
  loadVoiceHistoryLogs,
  saveVoiceHistoryLog,
  deleteVoiceHistoryLog,
  clearVoiceHistoryLogs,
} from '../services/voiceHistoryService';
import {
  useTranslationActions,
  useTranslationPlayback,
} from '../context/TranslationServiceContext';
import {
  playVoiceTriggerChime,
  playCommandSuccessChime,
  playVoiceDeactivateChime,
} from '../utils/audioChime';
import { triggerTabTapHaptic, triggerSwipeTransitionHaptic } from '../utils/haptics';
import { checkGuestLimit, incrementGuestUsage } from '../utils/guestManager';
import { TranslationResult, SavedItem, UserProfile } from '../types';

export type VoiceConversationTurn = VoiceTranslationLogRecord;

interface LiveVoiceTranslationLoopProps {
  primaryLanguage: string;
  partnerLanguage: string;
  onChangeLanguages: (primary: string, partner: string) => void;
  onSyncTranslationResult: (sourceText: string, srcLang: string, tgtLang: string, result: TranslationResult) => void;
  onSaveInsight: (item: Omit<SavedItem, 'id' | 'createdAt'>) => void;
  user?: UserProfile;
  onOpenAuthModal?: (mode?: 'login' | 'signup' | 'otp') => void;
  onUsageUpdated?: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

type LoopPhase = 'idle' | 'listening' | 'translating' | 'speaking';

const QUICK_PARTNER_LANGUAGES = [
  { name: 'English', label: 'English', flag: '🇬🇧' },
  { name: 'German', label: 'Deutsch', flag: '🇩🇪' },
  { name: 'Arabic', label: 'العربية', flag: '🇸🇦' },
  { name: 'French', label: 'Français', flag: '🇫🇷' },
  { name: 'Italian', label: 'Italiano', flag: '🇮🇹' },
  { name: 'Swedish', label: 'Svenska', flag: '🇸🇪' },
  { name: 'Amharic', label: 'አማርኛ', flag: '🇪🇹' },
  { name: "Ge'ez", label: 'ግዕዝ', flag: '🏛️' },
  { name: 'Dutch', label: 'Nederlands', flag: '🇳🇱' },
  { name: 'Spanish', label: 'Español', flag: '🇪🇸' },
];

const CATEGORIES: Array<LanguageOption['category']> = [
  'Horn of Africa & Semitic',
  'European',
  'Asian & Middle Eastern',
  'African',
  'Classical & Ancient',
];

export const LiveVoiceTranslationLoop: React.FC<LiveVoiceTranslationLoopProps> = ({
  primaryLanguage,
  partnerLanguage,
  onChangeLanguages,
  onSyncTranslationResult,
  onSaveInsight,
  user,
  onOpenAuthModal,
  onUsageUpdated,
  isExpanded = true,
  onToggleExpand,
}) => {
  const { playingAudioId: playingTurnId } = useTranslationPlayback();
  const {
    translateVoice,
    playTranslatedSpeech,
    stopSpeechPlayback: stopPlayback,
    resolveSpeechCode,
    resolveConversationDirection,
  } = useTranslationActions();

  const [phase, setPhase] = useState<LoopPhase>('idle');
  const [isLoopRunning, setIsLoopRunning] = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState<'A' | 'B'>('A');
  const [autoLoopEnabled, setAutoLoopEnabled] = useState(true);
  const [autoDetectPair, setAutoDetectPair] = useState(false);
  const [vadAutoSend, setVadAutoSend] = useState(true);
  const [liveCaption, setLiveCaption] = useState('');
  const [statusMessage, setStatusMessage] = useState(
    'Tap "Start Voice Loop" to speak in Tigrinya and automatically translate back & forth.'
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [turns, setTurns] = useState<VoiceConversationTurn[]>([]);
  const [isCloudSynced, setIsCloudSynced] = useState(false);
  const [manualText, setManualText] = useState('');

  // Waveform / Web Audio state
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [audioFrequencies, setAudioFrequencies] = useState<number[]>([]);

  // Refs to eliminate stale closures during continuous async voice loops
  const isMountedRef = useRef(true);
  const loopRunningRef = useRef(false);
  const phaseRef = useRef<LoopPhase>('idle');
  const activeSpeakerRef = useRef<'A' | 'B'>('A');
  const primaryLangRef = useRef(primaryLanguage);
  const partnerLangRef = useRef(partnerLanguage);
  const autoLoopRef = useRef(autoLoopEnabled);
  const autoDetectRef = useRef(autoDetectPair);
  const vadAutoSendRef = useRef(vadAutoSend);
  const turnsRef = useRef<VoiceConversationTurn[]>([]);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const recorderMimeRef = useRef<string>('audio/webm');
  const speechRecRef = useRef<any>(null);
  const interimTextRef = useRef<string>('');
  const audioCtxRef = useRef<AudioContext | null>(null);
  const meterAnimRef = useRef<number | null>(null);
  const rearmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxTurnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const silentTurnsCountRef = useRef<number>(0);

  // Sync refs with props/state
  useEffect(() => {
    primaryLangRef.current = primaryLanguage;
  }, [primaryLanguage]);

  useEffect(() => {
    partnerLangRef.current = partnerLanguage;
  }, [partnerLanguage]);

  useEffect(() => {
    autoLoopRef.current = autoLoopEnabled;
  }, [autoLoopEnabled]);

  useEffect(() => {
    autoDetectRef.current = autoDetectPair;
  }, [autoDetectPair]);

  useEffect(() => {
    vadAutoSendRef.current = vadAutoSend;
  }, [vadAutoSend]);

  useEffect(() => {
    turnsRef.current = turns;
  }, [turns]);

  // Load persisted voice translation history logs on mount / user change
  useEffect(() => {
    let active = true;
    loadVoiceHistoryLogs(user).then(({ logs, cloudSynced }) => {
      if (!active || !isMountedRef.current) return;
      setTurns(logs);
      setIsCloudSynced(cloudSynced);
    });
    return () => {
      active = false;
    };
  }, [user?.id, user?.email]);

  const setSyncedPhase = useCallback((next: LoopPhase) => {
    phaseRef.current = next;
    if (isMountedRef.current) setPhase(next);
  }, []);

  const setSyncedSpeaker = useCallback((next: 'A' | 'B') => {
    activeSpeakerRef.current = next;
    if (isMountedRef.current) setActiveSpeaker(next);
  }, []);

  const teardownCapture = useCallback(() => {
    if (meterAnimRef.current) {
      cancelAnimationFrame(meterAnimRef.current);
      meterAnimRef.current = null;
    }
    if (maxTurnTimerRef.current) {
      clearTimeout(maxTurnTimerRef.current);
      maxTurnTimerRef.current = null;
    }
    if (speechRecRef.current) {
      try {
        speechRecRef.current.onresult = null;
        speechRecRef.current.onerror = null;
        speechRecRef.current.onend = null;
        speechRecRef.current.stop();
      } catch {
        // Ignore already stopped SpeechRecognition
      }
      speechRecRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Ignore stop error
      }
    }
    mediaRecorderRef.current = null;
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch {
        // Ignore close error
      }
      audioCtxRef.current = null;
    }
    if (isMountedRef.current) {
      setAnalyserNode(null);
      setAudioLevel(0);
      setAudioFrequencies([]);
    }
  }, []);



  const stopVoiceLoop = useCallback(
    (quiet = false) => {
      loopRunningRef.current = false;
      silentTurnsCountRef.current = 0;
      if (rearmTimerRef.current) {
        clearTimeout(rearmTimerRef.current);
        rearmTimerRef.current = null;
      }
      teardownCapture();
      stopPlayback();
      if (isMountedRef.current) {
        setIsLoopRunning(false);
        setSyncedPhase('idle');
        setLiveCaption('');
        setStatusMessage('Voice translation loop paused. Tap Start Voice Loop to resume.');
      }
      if (!quiet) {
        playVoiceDeactivateChime();
        triggerTabTapHaptic();
      }
    },
    [stopPlayback, teardownCapture, setSyncedPhase]
  );

  // Unmount cleanup
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      loopRunningRef.current = false;
      if (rearmTimerRef.current) clearTimeout(rearmTimerRef.current);
      teardownCapture();
      stopPlayback();
    };
  }, [teardownCapture, stopPlayback]);

  // Speak translated output via unified TranslationService TTS + Web Speech fallback
  const speakTranslation = useCallback(
    async (text: string, targetLanguageName: string, turnId?: string): Promise<void> => {
      if (!text.trim()) return;
      await playTranslatedSpeech(text, targetLanguageName, turnId || `loop_${Date.now()}`, {
        voice: 'Kore',
        rate: 0.98,
        maxChars: 320,
        awaitCompletion: true,
      });
    },
    [playTranslatedSpeech]
  );

  // Forward declare ref for circular loop handoff
  const startListeningTurnRef = useRef<() => Promise<void>>(async () => {});

  const processVoiceTurn = useCallback(
    async (payload: { audioBase64?: string; mimeType?: string; prompt?: string }) => {
      if (!isMountedRef.current) return;

      const currentSpeaker = activeSpeakerRef.current;
      const srcLang = currentSpeaker === 'A' ? primaryLangRef.current : partnerLangRef.current;
      const tgtLang = currentSpeaker === 'A' ? partnerLangRef.current : primaryLangRef.current;

      const guestCheck = checkGuestLimit('translation', user?.email, user?.role);
      if (!guestCheck.allowed) {
        setErrorMessage(
          `Guest translation limit reached (${guestCheck.max}/${guestCheck.max}). Please sign in for unlimited conversational loops.`
        );
        stopVoiceLoop(true);
        onOpenAuthModal?.('signup');
        return;
      }

      setSyncedPhase('translating');
      setErrorMessage(null);
      setStatusMessage(`Translating ${srcLang} ➔ ${tgtLang}...`);
      const requestStartedAt = Date.now();

      try {
        const data = await translateVoice({
          prompt: payload.prompt,
          audioBase64: payload.audioBase64,
          mimeType: payload.mimeType,
          sourceLanguage: srcLang,
          targetLanguage: tgtLang,
          autoDetectPair: autoDetectRef.current,
          conversationHistory: turnsRef.current
            .slice(0, 6)
            .reverse()
            .map((t) => ({
              sourceLanguage: t.sourceLanguage,
              targetLanguage: t.targetLanguage,
              sourceTranscript: t.sourceTranscript,
              translatedText: t.translatedText,
            })),
        });

        if (!isMountedRef.current) return;

        if (data.noSpeechDetected || !data.translatedText) {
          silentTurnsCountRef.current += 1;
          if (loopRunningRef.current && autoLoopRef.current && silentTurnsCountRef.current < 3) {
            setStatusMessage(`No clear speech detected — listening again for ${srcLang}...`);
            rearmTimerRef.current = setTimeout(() => {
              if (loopRunningRef.current) startListeningTurnRef.current();
            }, 600);
          } else {
            setStatusMessage('No clear speech detected. Tap Start Voice Loop when ready to speak.');
            if (silentTurnsCountRef.current >= 3) {
              stopVoiceLoop(true);
            } else {
              setSyncedPhase('idle');
            }
          }
          return;
        }

        silentTurnsCountRef.current = 0;
        incrementGuestUsage('translation', user?.email, user?.role);
        onUsageUpdated?.();
        playCommandSuccessChime();

        const direction = resolveConversationDirection({
          spokenText: data.sourceTranscript || payload.prompt,
          requestedSpeaker: currentSpeaker,
          personALang: primaryLangRef.current,
          personBLang: partnerLangRef.current,
          autoDetect: autoDetectRef.current,
          serverDetectedSource: data.detectedSourceLanguage,
          serverEffectiveTarget: data.effectiveTargetLanguage,
        });
        const resolvedSource = direction.sourceLanguage;
        const resolvedTarget = direction.targetLanguage;
        const resolvedSpeaker = direction.speaker;

        const nowIso = new Date().toISOString();
        const newTurn: VoiceConversationTurn = {
          id: `vturn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          speaker: resolvedSpeaker,
          sourceLanguage: resolvedSource,
          targetLanguage: resolvedTarget,
          sourceTranscript: data.sourceTranscript,
          translatedText: data.translatedText,
          spokenTargetText: data.spokenTargetText,
          transliteration: data.transliteration,
          scriptName: data.scriptName,
          wordBreakdown: data.wordBreakdown,
          culturalContext: data.culturalContext,
          latencyMs: Date.now() - requestStartedAt,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          createdAt: nowIso,
        };

        setTurns((prev) => [newTurn, ...prev]);
        setLiveCaption('');
        saveVoiceHistoryLog(newTurn, user).then(({ cloudSynced }) => {
          if (isMountedRef.current && cloudSynced) {
            setIsCloudSynced(true);
          }
        });

        // Sync latest translation into GeezTranslator main right-hand breakdown view
        onSyncTranslationResult(newTurn.sourceTranscript, resolvedSource, resolvedTarget, {
          translatedText: newTurn.translatedText,
          transliteration: newTurn.transliteration,
          scriptName: newTurn.scriptName,
          wordBreakdown: newTurn.wordBreakdown,
          culturalContext: newTurn.culturalContext,
        });

        // Speak translated response aloud
        setSyncedPhase('speaking');
        setStatusMessage(`Speaking ${resolvedTarget}...`);
        await speakTranslation(newTurn.spokenTargetText, resolvedTarget, newTurn.id);

        if (!isMountedRef.current) return;

        // If continuous conversational loop is active, flip speaker turn and listen again!
        if (loopRunningRef.current && autoLoopRef.current) {
          const nextSpeaker: 'A' | 'B' = resolvedSpeaker === 'A' ? 'B' : 'A';
          setSyncedSpeaker(nextSpeaker);
          triggerSwipeTransitionHaptic(nextSpeaker === 'B' ? 'left' : 'right');
          const nextLang = nextSpeaker === 'A' ? primaryLangRef.current : partnerLangRef.current;
          setStatusMessage(`Switching turn ➔ Speak in ${nextLang}...`);
          rearmTimerRef.current = setTimeout(() => {
            if (loopRunningRef.current) {
              startListeningTurnRef.current();
            }
          }, 420);
        } else {
          setIsLoopRunning(false);
          loopRunningRef.current = false;
          setSyncedPhase('idle');
          setStatusMessage('Turn translated & spoken. Tap Start Voice Loop or swap speaker to continue.');
        }
      } catch (err: any) {
        console.error('Voice translation loop error:', err);
        if (!isMountedRef.current) return;
        setErrorMessage(err?.message || 'Voice translation encountered an error.');
        stopVoiceLoop(true);
      }
    },
    [
      user,
      onOpenAuthModal,
      onUsageUpdated,
      onSyncTranslationResult,
      translateVoice,
      resolveConversationDirection,
      speakTranslation,
      stopVoiceLoop,
      setSyncedPhase,
      setSyncedSpeaker,
    ]
  );

  // Finish current mic recording cleanly by awaiting MediaRecorder.onstop
  const finishCurrentRecordingAndTranslate = useCallback(() => {
    if (phaseRef.current !== 'listening') return;
    if (maxTurnTimerRef.current) {
      clearTimeout(maxTurnTimerRef.current);
      maxTurnTimerRef.current = null;
    }
    if (meterAnimRef.current) {
      cancelAnimationFrame(meterAnimRef.current);
      meterAnimRef.current = null;
    }
    if (speechRecRef.current) {
      try {
        speechRecRef.current.stop();
      } catch {
        // Ignore
      }
      speechRecRef.current = null;
    }

    const recorder = mediaRecorderRef.current;
    const interimFallback = interimTextRef.current.trim();

    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = () => {
        const mime = recorderMimeRef.current || recorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mime });
        audioChunksRef.current = [];
        teardownCapture();

        if (blob.size >= 120) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = typeof reader.result === 'string' ? reader.result : '';
            if (base64) {
              processVoiceTurn({ audioBase64: base64, mimeType: mime });
            } else if (interimFallback) {
              processVoiceTurn({ prompt: interimFallback });
            } else {
              processVoiceTurn({ audioBase64: 'data:audio/webm;base64,AA==', mimeType: mime });
            }
          };
          reader.readAsDataURL(blob);
        } else if (interimFallback) {
          processVoiceTurn({ prompt: interimFallback });
        } else {
          processVoiceTurn({ audioBase64: 'data:audio/webm;base64,AA==', mimeType: mime });
        }
      };
      try {
        recorder.stop();
      } catch {
        teardownCapture();
        if (interimFallback) {
          processVoiceTurn({ prompt: interimFallback });
        } else {
          stopVoiceLoop(true);
        }
      }
    } else {
      teardownCapture();
      if (interimFallback) {
        processVoiceTurn({ prompt: interimFallback });
      } else {
        stopVoiceLoop(true);
      }
    }
  }, [processVoiceTurn, stopVoiceLoop, teardownCapture]);

  const startListeningTurn = useCallback(async () => {
    if (!isMountedRef.current) return;

    const guestCheck = checkGuestLimit('translation', user?.email, user?.role);
    if (!guestCheck.allowed) {
      setErrorMessage(`Guest translation limit reached (${guestCheck.max}/${guestCheck.max}). Please sign in.`);
      stopVoiceLoop(true);
      onOpenAuthModal?.('signup');
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMessage('Microphone capture is not supported in this browser. Use the quick message box below.');
      stopVoiceLoop(true);
      return;
    }

    teardownCapture();
    stopPlayback();
    setErrorMessage(null);
    interimTextRef.current = '';
    setLiveCaption('');
    audioChunksRef.current = [];

    const activeLang = activeSpeakerRef.current === 'A' ? primaryLangRef.current : partnerLangRef.current;
    const oppositeLang = activeSpeakerRef.current === 'A' ? partnerLangRef.current : primaryLangRef.current;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      if (!loopRunningRef.current || !isMountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      mediaStreamRef.current = stream;
      setSyncedPhase('listening');
      setStatusMessage(
        autoDetectRef.current
          ? `Listening (${primaryLangRef.current} ⇄ ${partnerLangRef.current})... Speak naturally.`
          : `Listening for ${activeLang} (will translate to ${oppositeLang})...`
      );
      playVoiceTriggerChime(0.08);

      // Web Audio AnalyserNode for real-time waveform + VAD auto-stop
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      setAnalyserNode(analyser);

      const timeData = new Uint8Array(analyser.fftSize);
      const freqData = new Uint8Array(analyser.frequencyBinCount);
      const turnStartedAt = Date.now();
      let speechDetected = false;
      let speechFrames = 0;
      let lastSpeechAt = Date.now();

      const monitorAudio = () => {
        if (phaseRef.current !== 'listening' || !loopRunningRef.current) return;

        analyser.getByteTimeDomainData(timeData);
        analyser.getByteFrequencyData(freqData);

        let sumSq = 0;
        for (let i = 0; i < timeData.length; i++) {
          const norm = (timeData[i] - 128) / 128;
          sumSq += norm * norm;
        }
        const rms = Math.sqrt(sumSq / timeData.length);
        if (isMountedRef.current) {
          setAudioLevel(Math.min(1, rms * 3.5));
          setAudioFrequencies([
            freqData[2] || 0,
            freqData[6] || 0,
            freqData[12] || 0,
            freqData[20] || 0,
            freqData[32] || 0,
          ]);
        }

        const now = Date.now();
        if (rms > 0.032) {
          speechFrames += 1;
          if (speechFrames >= 4) {
            speechDetected = true;
          }
          lastSpeechAt = now;
        }

        // Auto-send turn after 1.55s of natural pause following detected speech
        if (
          vadAutoSendRef.current &&
          speechDetected &&
          now - turnStartedAt > 950 &&
          now - lastSpeechAt > 1550
        ) {
          finishCurrentRecordingAndTranslate();
          return;
        }

        meterAnimRef.current = requestAnimationFrame(monitorAudio);
      };
      meterAnimRef.current = requestAnimationFrame(monitorAudio);

      // Record high-quality compressed audio for accurate Gemini transcription (critical for Tigrinya)
      const preferredMime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/webm';

      recorderMimeRef.current = preferredMime;
      const recorder = new MediaRecorder(stream, { mimeType: preferredMime });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          audioChunksRef.current.push(ev.data);
        }
      };
      recorder.start(250);

      // Optional live SpeechRecognition captions (best-effort visual feedback)
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.lang = resolveSpeechCode(activeLang);
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.onresult = (event: any) => {
            let text = '';
            for (let i = 0; i < event.results.length; i++) {
              text += event.results[i][0]?.transcript || '';
            }
            if (text.trim()) {
              interimTextRef.current = text.trim();
              if (isMountedRef.current) setLiveCaption(text.trim());
            }
          };
          recognition.onerror = () => {};
          recognition.start();
          speechRecRef.current = recognition;
        } catch {
          // Ignore if browser rejects SpeechRecognition locale
        }
      }

      // Max turn safety guard (24s)
      maxTurnTimerRef.current = setTimeout(() => {
        if (phaseRef.current === 'listening') {
          finishCurrentRecordingAndTranslate();
        }
      }, 24000);
    } catch (err: any) {
      console.error('Microphone start error:', err);
      teardownCapture();
      setErrorMessage(
        err?.name === 'NotAllowedError'
          ? 'Microphone permission denied. Allow mic access or type below to test the conversational loop.'
          : err?.message || 'Unable to access microphone.'
      );
      stopVoiceLoop(true);
    }
  }, [
    user,
    onOpenAuthModal,
    resolveSpeechCode,
    teardownCapture,
    stopPlayback,
    stopVoiceLoop,
    finishCurrentRecordingAndTranslate,
    setSyncedPhase,
  ]);

  useEffect(() => {
    startListeningTurnRef.current = startListeningTurn;
  }, [startListeningTurn]);

  const handleToggleLoop = () => {
    triggerTabTapHaptic();
    if (isLoopRunning) {
      stopVoiceLoop(false);
    } else {
      silentTurnsCountRef.current = 0;
      loopRunningRef.current = true;
      setIsLoopRunning(true);
      startListeningTurn();
    }
  };

  const handleManualSpeakerSelect = (speaker: 'A' | 'B') => {
    triggerTabTapHaptic();
    setSyncedSpeaker(speaker);
    if (isLoopRunning && phaseRef.current === 'listening') {
      // Restart mic turn under newly chosen speaker language
      startListeningTurn();
    }
  };

  const handleSwapSides = () => {
    triggerSwipeTransitionHaptic('left');
    onChangeLanguages(partnerLanguage, primaryLanguage);
  };

  const handleManualSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = manualText.trim();
    if (!trimmed || phaseRef.current === 'translating') return;
    setManualText('');
    triggerTabTapHaptic();
    if (isLoopRunning && phaseRef.current === 'listening') {
      teardownCapture();
    }
    await processVoiceTurn({ prompt: trimmed });
  };

  const handleDeleteTurn = (id: string) => {
    setTurns((prev) => prev.filter((t) => t.id !== id));
    deleteVoiceHistoryLog(id, user);
  };

  const handleClearHistory = () => {
    const ids = turns.map((t) => t.id);
    setTurns([]);
    clearVoiceHistoryLogs(ids, user);
  };

  const handleInspectTurn = (turn: VoiceConversationTurn) => {
    triggerTabTapHaptic();
    onSyncTranslationResult(turn.sourceTranscript, turn.sourceLanguage, turn.targetLanguage, {
      translatedText: turn.translatedText,
      transliteration: turn.transliteration,
      scriptName: turn.scriptName,
      wordBreakdown: turn.wordBreakdown,
      culturalContext: turn.culturalContext,
    });
  };

  const activeSpeakerLang = activeSpeaker === 'A' ? primaryLanguage : partnerLanguage;

  return (
    <div className="bg-gradient-to-br from-[#0A0B10] via-[#070709] to-[#110D06] border border-[#C5A059]/35 rounded-3xl overflow-hidden shadow-[0_12px_36px_rgba(0,0,0,0.65)]">
      {/* Header Bar */}
      <div className="px-4 sm:px-5 py-3.5 bg-[#0D0D12]/90 border-b border-[#8E6D28]/25 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
              phase === 'listening'
                ? 'bg-gradient-to-tr from-amber-500 to-yellow-300 text-black animate-pulse shadow-[0_0_16px_rgba(245,158,11,0.55)]'
                : phase === 'speaking'
                ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 text-black shadow-[0_0_14px_rgba(16,185,129,0.45)]'
                : phase === 'translating'
                ? 'bg-gradient-to-tr from-sky-500 to-blue-400 text-black'
                : 'bg-gradient-to-tr from-[#8E6D28] to-[#E1C47D] text-black'
            }`}
          >
            {phase === 'translating' ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : phase === 'speaking' ? (
              <Volume2 className="w-5 h-5" />
            ) : (
              <Radio className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-extrabold text-[#F3E5AB] tracking-wide">
                ናይ ቀጥታ ድምጺ ትርጉም ዙር • Live Voice Translation Loop
              </h3>
              {isLoopRunning && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[9px] font-bold uppercase tracking-wider">
                  LIVE LOOP
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-400">
              Speak {primaryLanguage} ⇄ {partnerLanguage} in a continuous two-way spoken conversation
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Auto-Loop Toggle */}
          <button
            type="button"
            onClick={() => {
              triggerTabTapHaptic();
              setAutoLoopEnabled((v) => !v);
            }}
            className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all cursor-pointer flex items-center space-x-1 ${
              autoLoopEnabled
                ? 'bg-[#C5A059]/20 border-[#C5A059]/60 text-[#F3E5AB]'
                : 'bg-[#101015] border-gray-700 text-gray-400'
            }`}
            title="Automatically alternate speakers and re-arm microphone after each translation"
          >
            <RefreshCw className={`w-3 h-3 ${autoLoopEnabled && isLoopRunning ? 'animate-spin' : ''}`} />
            <span>Auto-Loop: {autoLoopEnabled ? 'ON' : 'OFF'}</span>
          </button>

          {/* Auto-Detect Pair Toggle */}
          <button
            type="button"
            onClick={() => {
              triggerTabTapHaptic();
              setAutoDetectPair((v) => !v);
            }}
            className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all cursor-pointer hidden sm:flex items-center space-x-1 ${
              autoDetectPair
                ? 'bg-sky-500/20 border-sky-400/50 text-sky-300'
                : 'bg-[#101015] border-gray-700 text-gray-400'
            }`}
            title="Automatically detect which of the two selected languages was spoken"
          >
            <Sparkles className="w-3 h-3" />
            <span>Auto-Detect: {autoDetectPair ? 'ON' : 'OFF'}</span>
          </button>

          {onToggleExpand && (
            <button
              type="button"
              onClick={onToggleExpand}
              className="p-1.5 rounded-xl bg-[#101015] border border-[#8E6D28]/30 text-[#C5A059] hover:bg-[#191610] cursor-pointer"
              title={isExpanded ? 'Collapse Live Loop' : 'Expand Live Loop'}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 sm:p-5 space-y-4">
          {/* Quick Multi-Language Partner Selector */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#C5A059]">
                Conversation Partner Language ({primaryLanguage} ⇄ Partner):
              </span>
              <div className="flex items-center space-x-2">
                <label className="flex items-center space-x-1.5 text-[10px] text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={vadAutoSend}
                    onChange={(e) => setVadAutoSend(e.target.checked)}
                    className="accent-[#C5A059]"
                  />
                  <span>Auto-send on pause</span>
                </label>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {QUICK_PARTNER_LANGUAGES.filter((l) => l.name !== primaryLanguage).map((lang) => {
                const selected = partnerLanguage === lang.name;
                return (
                  <button
                    key={lang.name}
                    type="button"
                    onClick={() => {
                      triggerTabTapHaptic();
                      onChangeLanguages(primaryLanguage, lang.name);
                    }}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all cursor-pointer flex items-center space-x-1 ${
                      selected
                        ? 'bg-gradient-to-r from-[#8E6D28] to-[#E1C47D] text-black font-bold shadow'
                        : 'bg-[#111117] hover:bg-[#1A1822] text-gray-300 border border-[#8E6D28]/25'
                    }`}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dual-Speaker Interactive Turn Bar */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-2.5 bg-[#08080C] p-3 rounded-2xl border border-[#8E6D28]/25">
            {/* Speaker A (Default: Tigrinya) */}
            <div
              onClick={() => handleManualSpeakerSelect('A')}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                activeSpeaker === 'A'
                  ? 'bg-gradient-to-r from-[#8E6D28]/25 to-[#C5A059]/10 border-[#E1C47D] shadow-[0_0_15px_rgba(225,196,125,0.18)]'
                  : 'bg-[#0E0E14] border-gray-800 hover:border-[#8E6D28]/40'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                <span className={activeSpeaker === 'A' ? 'text-[#F3E5AB]' : 'text-gray-400'}>
                  {activeSpeaker === 'A' ? '🎙️ Active Speaker A' : 'Speaker A'}
                </span>
                {activeSpeaker === 'A' && phase === 'listening' && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] animate-pulse">
                    SPEAKING
                  </span>
                )}
              </div>
              <select
                value={primaryLanguage}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  onChangeLanguages(e.target.value, partnerLanguage);
                }}
                className="w-full bg-[#060609] border border-[#8E6D28]/35 rounded-lg text-xs text-white px-2.5 py-1.5 focus:outline-none"
              >
                {CATEGORIES.map((cat) => (
                  <optgroup key={`a-${cat}`} label={`── ${cat} ──`}>
                    {ALL_INTERNATIONAL_LANGUAGES.filter((l) => l.category === cat).map((lang) => (
                      <option key={`loop-a-${lang.code}`} value={lang.name}>
                        {lang.flag ? `${lang.flag} ` : ''}
                        {lang.name} ({lang.nativeName})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Swap Button */}
            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={handleSwapSides}
                className="p-2.5 rounded-xl bg-[#111016] hover:bg-[#1D1910] border border-[#8E6D28]/40 text-[#E1C47D] transition-all cursor-pointer"
                title="Swap Speaker A & Speaker B languages"
              >
                <ArrowRightLeft className="w-4 h-4" />
              </button>
            </div>

            {/* Speaker B (Partner Language) */}
            <div
              onClick={() => handleManualSpeakerSelect('B')}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                activeSpeaker === 'B'
                  ? 'bg-gradient-to-r from-[#8E6D28]/25 to-[#C5A059]/10 border-[#E1C47D] shadow-[0_0_15px_rgba(225,196,125,0.18)]'
                  : 'bg-[#0E0E14] border-gray-800 hover:border-[#8E6D28]/40'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                <span className={activeSpeaker === 'B' ? 'text-[#F3E5AB]' : 'text-gray-400'}>
                  {activeSpeaker === 'B' ? '🎙️ Active Speaker B' : 'Speaker B'}
                </span>
                {activeSpeaker === 'B' && phase === 'listening' && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] animate-pulse">
                    SPEAKING
                  </span>
                )}
              </div>
              <select
                value={partnerLanguage}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  onChangeLanguages(primaryLanguage, e.target.value);
                }}
                className="w-full bg-[#060609] border border-[#8E6D28]/35 rounded-lg text-xs text-white px-2.5 py-1.5 focus:outline-none"
              >
                {CATEGORIES.map((cat) => (
                  <optgroup key={`b-${cat}`} label={`── ${cat} ──`}>
                    {ALL_INTERNATIONAL_LANGUAGES.filter((l) => l.category === cat).map((lang) => (
                      <option key={`loop-b-${lang.code}`} value={lang.name}>
                        {lang.flag ? `${lang.flag} ` : ''}
                        {lang.name} ({lang.nativeName})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          {/* Controls & Quick Text Turn Fallback */}
          <div className="space-y-3">
            {/* Status & Loop Trigger Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#0B0B10] border border-[#8E6D28]/20 rounded-2xl px-3.5 py-2.5">
              <div className="flex items-center space-x-2 min-w-0">
                <Waves
                  className={`w-4 h-4 shrink-0 ${
                    phase === 'listening'
                      ? 'text-amber-400 animate-pulse'
                      : phase === 'speaking'
                      ? 'text-emerald-400'
                      : phase === 'translating'
                      ? 'text-sky-400'
                      : 'text-[#C5A059]'
                  }`}
                />
                <div className="min-w-0">
                  <p className="text-xs text-gray-200 font-medium truncate">{statusMessage}</p>
                  {liveCaption && (
                    <p className="text-xs text-[#F3E5AB] font-ethiopic mt-0.5 truncate">
                      “{liveCaption}”
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                {phase === 'listening' && (
                  <button
                    type="button"
                    onClick={finishCurrentRecordingAndTranslate}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center space-x-1 shadow cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Translate Now</span>
                  </button>
                )}

                {phase === 'speaking' && (
                  <button
                    type="button"
                    onClick={stopPlayback}
                    className="px-3 py-1.5 rounded-xl bg-rose-500/20 border border-rose-400/40 text-rose-300 font-bold text-xs flex items-center space-x-1 cursor-pointer"
                  >
                    <VolumeX className="w-3.5 h-3.5" />
                    <span>Skip Audio</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleToggleLoop}
                  disabled={phase === 'translating'}
                  className={`px-4 py-2 rounded-xl font-extrabold text-xs uppercase tracking-wider flex items-center space-x-1.5 transition-all cursor-pointer shadow-lg ${
                    isLoopRunning
                      ? 'bg-rose-600 hover:bg-rose-500 text-white border border-rose-400/50'
                      : 'bg-gradient-to-r from-[#8E6D28] via-[#E1C47D] to-[#C5A059] hover:brightness-110 text-black'
                  }`}
                >
                  {isLoopRunning ? (
                    <>
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>Stop Loop</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5" />
                      <span>Start Voice Loop ({activeSpeakerLang})</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {errorMessage && (
              <div className="px-3.5 py-2 rounded-xl bg-rose-500/15 border border-rose-500/40 text-xs text-rose-200 flex items-center justify-between gap-2">
                <span>{errorMessage}</span>
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  className="text-rose-300 hover:text-white font-bold text-[10px] uppercase cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Quick Text-to-Voice Turn Fallback Bar */}
            <form onSubmit={handleManualSend} className="flex items-center gap-2">
              <input
                type="text"
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder={`Or type a spoken line in ${activeSpeakerLang} to speak & continue the loop...`}
                className="flex-1 bg-[#07070B] border border-[#8E6D28]/30 focus:border-[#C5A059] rounded-xl px-3.5 py-2 text-xs text-gray-100 placeholder-gray-500 focus:outline-none font-ethiopic"
              />
              <button
                type="submit"
                disabled={!manualText.trim() || phase === 'translating'}
                className="px-3.5 py-2 rounded-xl bg-[#17140D] hover:bg-[#241E11] border border-[#8E6D28]/45 text-[#F3E5AB] disabled:opacity-40 text-xs font-bold flex items-center space-x-1 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Speak Turn</span>
              </button>
            </form>
          </div>

          {/* SovereignVoiceDashboard: Real-Time Visual Waveform + Persistent Language History Logs */}
          <SovereignVoiceDashboard
            analyserNode={analyserNode}
            audioLevel={audioLevel}
            audioFrequencies={audioFrequencies}
            phase={phase}
            isLoopRunning={isLoopRunning}
            activeSpeaker={activeSpeaker}
            primaryLanguage={primaryLanguage}
            partnerLanguage={partnerLanguage}
            liveCaption={liveCaption}
            statusMessage={statusMessage}
            logs={turns}
            playingTurnId={playingTurnId}
            isCloudSynced={isCloudSynced}
            onReplayTurn={(turn) =>
              speakTranslation(
                turn.spokenTargetText || turn.translatedText,
                turn.targetLanguage,
                turn.id
              )
            }
            onStopPlayback={stopPlayback}
            onInspectTurn={handleInspectTurn}
            onSaveInsight={onSaveInsight}
            onDeleteLog={handleDeleteTurn}
            onClearHistory={handleClearHistory}
          />
        </div>
      )}
    </div>
  );
};
