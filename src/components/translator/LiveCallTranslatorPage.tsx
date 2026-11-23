import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  Clock,
  Copy,
  Download,
  History,
  Languages,
  Mic,
  MicOff,
  Phone,
  PhoneCall,
  PhoneOff,
  Plus,
  Search,
  Send,
  Shield,
  Square,
  Trash2,
  Users,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { ALL_INTERNATIONAL_LANGUAGES, LanguageOption } from '../../utils/languages';
import { SavedItem, UserProfile } from '../../types';
import type { CallSessionRecord } from '../../services/translatorSuiteService';
import { useTranslationActions } from '../../context/TranslationServiceContext';
import { TranslatorThemeMode } from './translatorTheme';

interface LiveCallTranslatorPageProps {
  theme: TranslatorThemeMode;
  user?: UserProfile;
  onBack: () => void;
  onSaveInsight: (item: Omit<SavedItem, 'id' | 'createdAt'>) => void;
}

interface CallSubtitleLine {
  id: string;
  sender: 'You' | 'Remote';
  sourceLanguage: string;
  targetLanguage: string;
  originalText: string;
  translatedText: string;
  transliteration?: string;
  timestamp: string;
}

interface OrganizationContact {
  id: string;
  name: string;
  category: string;
  phoneNumber: string;
  language: string;
  isCustom?: boolean;
}

const CUSTOM_CONTACTS_KEY = 'axumite_call_contacts_v1';

const PRESET_CONTACTS: OrganizationContact[] = [
  {
    id: 'preset-nhs',
    name: 'NHS 111 / GP Surgery',
    category: 'Healthcare',
    phoneNumber: '111',
    language: 'English',
  },
  {
    id: 'preset-council',
    name: 'Local City Council',
    category: 'Public Services',
    phoneNumber: '0300 123 4567',
    language: 'English',
  },
  {
    id: 'preset-bank',
    name: 'Bank Customer Support',
    category: 'Banking',
    phoneNumber: '0345 734 5345',
    language: 'English',
  },
  {
    id: 'preset-jobcenter',
    name: 'Bürgeramt / Jobcenter',
    category: 'Germany Office',
    phoneNumber: '+49 30 5555 45 2222',
    language: 'German',
  },
  {
    id: 'preset-homeoffice',
    name: 'Home Office / Visa Desk',
    category: 'Immigration',
    phoneNumber: '0300 790 6268',
    language: 'English',
  },
  {
    id: 'preset-asmara',
    name: 'Eritrea / Family Line',
    category: 'Direct Line',
    phoneNumber: '+291 1 120000',
    language: 'Tigrinya',
  },
];

const QUICK_CALL_PHRASES = [
  {
    ti: 'ሰላም፣ ቀጥታዊ ተርጓሚ ይጥቀም ኣለኹ።',
    en: 'Hello, I am using a live Tigrinya interpreter.',
  },
  {
    ti: 'በጃኹም ቀስ ኢልኩም ተዛረቡ።',
    en: 'Could you please speak a little more slowly?',
  },
  {
    ti: 'ቆጸራ ክሕዝ ደልየ ኣለኹ።',
    en: 'I would like to book an appointment, please.',
  },
  {
    ti: 'በጃኹም ደጊምኩም ክትብሉለይ ትኽእሉ ዶ?',
    en: 'Could you please repeat that for me?',
  },
];

const PRIORITY_LANGUAGE_NAMES = [
  'English',
  'German',
  'Tigrinya',
  'Amharic',
  'Arabic',
  'Italian',
  'French',
  'Dutch',
  'Swedish',
  'Norwegian',
  'Spanish',
  'Portuguese',
];

const LanguageFlagIcon: React.FC<{ languageName: string; fallbackFlag?: string }> = ({
  languageName,
  fallbackFlag,
}) => {
  const clipId = React.useId();
  const lower = languageName.toLowerCase();

  if (lower === 'english') {
    return (
      <svg
        viewBox="0 0 60 40"
        className="w-8 h-6 rounded-[5px] shadow-xs shrink-0 border border-black/10"
        aria-hidden="true"
      >
        <clipPath id={clipId}>
          <rect width="60" height="40" rx="4" />
        </clipPath>
        <g clipPath={`url(#${clipId})`}>
          <rect width="60" height="40" fill="#012169" />
          <path d="M0,0 L60,40 M60,0 L0,40" stroke="#FFF" strokeWidth="7" />
          <path d="M0,0 L60,40 M60,0 L0,40" stroke="#C8102E" strokeWidth="3.5" />
          <path d="M30,0 V40 M0,20 H60" stroke="#FFF" strokeWidth="11" />
          <path d="M30,0 V40 M0,20 H60" stroke="#C8102E" strokeWidth="6.5" />
        </g>
      </svg>
    );
  }

  if (lower === 'german') {
    return (
      <svg
        viewBox="0 0 60 40"
        className="w-8 h-6 rounded-[5px] shadow-xs shrink-0 border border-black/10"
        aria-hidden="true"
      >
        <rect width="60" height="13.33" y="0" fill="#111827" />
        <rect width="60" height="13.34" y="13.33" fill="#DD0000" />
        <rect width="60" height="13.33" y="26.67" fill="#FFCE00" />
      </svg>
    );
  }

  if (lower === 'french') {
    return (
      <svg
        viewBox="0 0 60 40"
        className="w-8 h-6 rounded-[5px] shadow-xs shrink-0 border border-black/10"
        aria-hidden="true"
      >
        <rect width="20" height="40" x="0" fill="#002395" />
        <rect width="20" height="40" x="20" fill="#FFFFFF" />
        <rect width="20" height="40" x="40" fill="#ED2939" />
      </svg>
    );
  }

  if (lower === 'italian') {
    return (
      <svg
        viewBox="0 0 60 40"
        className="w-8 h-6 rounded-[5px] shadow-xs shrink-0 border border-black/10"
        aria-hidden="true"
      >
        <rect width="20" height="40" x="0" fill="#009246" />
        <rect width="20" height="40" x="20" fill="#FFFFFF" />
        <rect width="20" height="40" x="40" fill="#CE2B37" />
      </svg>
    );
  }

  if (lower === 'dutch') {
    return (
      <svg
        viewBox="0 0 60 40"
        className="w-8 h-6 rounded-[5px] shadow-xs shrink-0 border border-black/10"
        aria-hidden="true"
      >
        <rect width="60" height="13.33" y="0" fill="#AE1C28" />
        <rect width="60" height="13.34" y="13.33" fill="#FFFFFF" />
        <rect width="60" height="13.33" y="26.67" fill="#21468B" />
      </svg>
    );
  }

  if (lower === 'swedish') {
    return (
      <svg
        viewBox="0 0 60 40"
        className="w-8 h-6 rounded-[5px] shadow-xs shrink-0 border border-black/10"
        aria-hidden="true"
      >
        <rect width="60" height="40" fill="#006AA7" />
        <rect x="17" y="0" width="8" height="40" fill="#FECC00" />
        <rect x="0" y="16" width="60" height="8" fill="#FECC00" />
      </svg>
    );
  }

  return (
    <span className="w-8 h-6 rounded-[5px] bg-[#ECE8FA] text-base flex items-center justify-center shrink-0">
      {fallbackFlag || '🌐'}
    </span>
  );
};

export const LiveCallTranslatorPage: React.FC<LiveCallTranslatorPageProps> = ({
  theme,
  user,
  onBack,
  onSaveInsight,
}) => {
  const isDark = theme === 'dark';
  const {
    translateVoice,
    playTranslatedSpeech,
    stopSpeechPlayback,
    resolveSpeechCode,
    loadCallSessions,
    saveCallSession,
    deleteCallSession,
  } = useTranslationActions();

  // Core Call Setup Fields matching screenshot
  const [organizationName, setOrganizationName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [localLanguage, setLocalLanguage] = useState('Tigrinya');
  const [remoteLanguage, setRemoteLanguage] = useState('English');

  // UI Popovers & Mode State
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [showLocalLangPicker, setShowLocalLangPicker] = useState(false);
  const [languageSearch, setLanguageSearch] = useState('');
  const [customContacts, setCustomContacts] = useState<OrganizationContact[]>(() => {
    try {
      const raw = localStorage.getItem(CUSTOM_CONTACTS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [copiedRoom, setCopiedRoom] = useState(false);
  const [contactSavedNotice, setContactSavedNotice] = useState(false);

  // Live Call & WebRTC State
  const [callType, setCallType] = useState<'video' | 'audio'>('audio');
  const [roomCode, setRoomCode] = useState(() => `AXM-${Math.floor(1000 + Math.random() * 9000)}`);
  const [inCall, setInCall] = useState(false);
  const [peerConnected, setPeerConnected] = useState(false);
  const [remotePeerName, setRemotePeerName] = useState<string | null>(null);
  const [micMuted, setMicMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [speakerMuted, setSpeakerMuted] = useState(false);
  const [durationSec, setDurationSec] = useState(0);
  const [subtitles, setSubtitles] = useState<CallSubtitleLine[]>([]);
  const [utteranceDraft, setUtteranceDraft] = useState('');
  const [activeSpeakerRole, setActiveSpeakerRole] = useState<'You' | 'Remote'>('You');
  const [isRecordingTurn, setIsRecordingTurn] = useState<'You' | 'Remote' | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [statusNote, setStatusNote] = useState('ኣብ ምምዕባልን ፈተናን ዘሎ ኣገልግሎት');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [callHistory, setCallHistory] = useState<CallSessionRecord[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const speechRecRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speakerMutedRef = useRef(speakerMuted);
  const subtitlesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    speakerMutedRef.current = speakerMuted;
  }, [speakerMuted]);

  useEffect(() => {
    subtitlesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [subtitles]);

  useEffect(() => {
    loadCallSessions().then(setCallHistory);
    return () => {
      endCallSession(false);
    };
  }, [user?.id, user?.email, loadCallSessions]);

  const sortedLanguages = useMemo<LanguageOption[]>(() => {
    const query = languageSearch.trim().toLowerCase();
    const list = ALL_INTERNATIONAL_LANGUAGES.filter((l) => {
      if (!query) return true;
      return (
        l.name.toLowerCase().includes(query) ||
        l.nativeName.toLowerCase().includes(query) ||
        l.code.toLowerCase().includes(query)
      );
    });
    return [...list].sort((a, b) => {
      const idxA = PRIORITY_LANGUAGE_NAMES.indexOf(a.name);
      const idxB = PRIORITY_LANGUAGE_NAMES.indexOf(b.name);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [languageSearch]);

  const selectedRemoteLangObj = useMemo(
    () => ALL_INTERNATIONAL_LANGUAGES.find((l) => l.name === remoteLanguage),
    [remoteLanguage]
  );

  const selectedLocalLangObj = useMemo(
    () => ALL_INTERNATIONAL_LANGUAGES.find((l) => l.name === localLanguage),
    [localLanguage]
  );

  const localLangNativeShort =
    localLanguage === 'Tigrinya'
      ? 'ትግርኛ'
      : selectedLocalLangObj?.nativeName?.split(' ')[0] || localLanguage;

  const allContacts = useMemo(
    () => [...customContacts, ...PRESET_CONTACTS],
    [customContacts]
  );

  const persistCustomContacts = (next: OrganizationContact[]) => {
    setCustomContacts(next);
    try {
      localStorage.setItem(CUSTOM_CONTACTS_KEY, JSON.stringify(next));
    } catch {}
  };

  const handleSaveCurrentContact = () => {
    const cleanName = organizationName.trim();
    const cleanPhone = phoneNumber.trim();
    if (!cleanName && !cleanPhone) {
      setErrorMsg('ስም ትካል ወይ ቁጽሪ ስልኪ ኣእቱ ንምዕቃብ። (Enter a name or phone number to save.)');
      return;
    }
    const newContact: OrganizationContact = {
      id: `custom-${Date.now()}`,
      name: cleanName || cleanPhone,
      category: 'Saved Contact',
      phoneNumber: cleanPhone || roomCode,
      language: remoteLanguage,
      isCustom: true,
    };
    persistCustomContacts([newContact, ...customContacts.slice(0, 19)]);
    setContactSavedNotice(true);
    setTimeout(() => setContactSavedNotice(false), 2200);
  };

  const handleDeleteCustomContact = (id: string) => {
    persistCustomContacts(customContacts.filter((c) => c.id !== id));
  };

  const handlePickContact = (contact: OrganizationContact) => {
    setOrganizationName(contact.name);
    setPhoneNumber(contact.phoneNumber);
    setRemoteLanguage(contact.language);
    setShowContactsModal(false);
    setErrorMsg(null);
  };

  const speakSubtitle = async (text: string, langName: string) => {
    if (speakerMutedRef.current || !text.trim()) return;
    await playTranslatedSpeech(text, langName, `call_subtitle_${Date.now()}`, {
      voice: 'Kore',
      maxChars: 260,
    });
  };

  const translateAndBroadcastUtterance = async (
    rawText: string,
    speakerOverride?: 'You' | 'Remote',
    audioPayload?: { audioBase64: string; mimeType: string }
  ) => {
    const clean = rawText.trim();
    if (!clean && !audioPayload) return;

    const sender = speakerOverride || activeSpeakerRole;
    const srcLang = sender === 'You' ? localLanguage : remoteLanguage;
    const tgtLang = sender === 'You' ? remoteLanguage : localLanguage;

    setIsTranslating(true);
    setErrorMsg(null);
    try {
      const data = await translateVoice({
        prompt: clean || undefined,
        audioBase64: audioPayload?.audioBase64,
        mimeType: audioPayload?.mimeType,
        sourceLanguage: srcLang,
        targetLanguage: tgtLang,
        autoDetectPair: !speakerOverride,
        feature: 'call_translation',
        conversationHistory: subtitles.slice(-4).map((s) => ({
          sourceLanguage: s.sourceLanguage,
          targetLanguage: s.targetLanguage,
          sourceTranscript: s.originalText,
          translatedText: s.translatedText,
        })),
      });

      if (data.noSpeechDetected || !data.translatedText) {
        setErrorMsg('ንጹር ድምጺ ኣይተሰምዐን — No clear speech detected. Tap mic and speak clearly.');
        return;
      }

      const line: CallSubtitleLine = {
        id: `sub_${Date.now()}`,
        sender,
        sourceLanguage: data.detectedSourceLanguage,
        targetLanguage: data.effectiveTargetLanguage,
        originalText: data.sourceTranscript || clean,
        translatedText: data.translatedText,
        transliteration: data.transliteration,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setSubtitles((prev) => [...prev, line]);

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'subtitle',
            originalText: line.originalText,
            translatedText: line.translatedText,
            sourceLanguage: line.sourceLanguage,
            targetLanguage: line.targetLanguage,
          })
        );
      }

      await speakSubtitle(data.spokenTargetText, line.targetLanguage);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to reach live call translation service.');
    } finally {
      setIsTranslating(false);
    }
  };

  const toggleVoiceTurnCapture = async (speaker: 'You' | 'Remote') => {
    if (isRecordingTurn) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecordingTurn(null);
      return;
    }

    setErrorMsg(null);
    setActiveSpeakerRole(speaker);
    try {
      const stream =
        localStreamRef.current ||
        (await navigator.mediaDevices.getUserMedia({ audio: true, video: false }));
      if (!localStreamRef.current) {
        localStreamRef.current = stream;
      }

      const preferredMime =
        typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType: preferredMime });
      recordedChunksRef.current = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) recordedChunksRef.current.push(ev.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: preferredMime });
        if (blob.size < 120) return;
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = typeof reader.result === 'string' ? reader.result : '';
          if (dataUrl) {
            translateAndBroadcastUtterance('', speaker, {
              audioBase64: dataUrl,
              mimeType: preferredMime,
            });
          }
        };
        reader.readAsDataURL(blob);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecordingTurn(speaker);
    } catch {
      setErrorMsg(
        'ማይክሮፎን ኣይተረኽበን — Microphone permission unavailable. You can still type or tap quick phrases below.'
      );
    }
  };

  const createPeerConnection = (ws: WebSocket, stream: MediaStream | null) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    if (stream) {
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ice-candidate', candidate: event.candidate }));
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
      setPeerConnected(true);
    };

    pcRef.current = pc;
    return pc;
  };

  const startCallSession = async () => {
    setErrorMsg(null);
    setSubtitles([]);
    setDurationSec(0);
    setShowContactsModal(false);
    setShowLanguageDropdown(false);
    setShowLocalLangPicker(false);

    const effectiveRoom =
      roomCode.trim() ||
      (phoneNumber.trim()
        ? `TEL-${phoneNumber.replace(/[^0-9A-Za-z]/g, '').slice(-6) || 'LIVE'}`
        : `AXM-${Math.floor(1000 + Math.random() * 9000)}`);

    if (effectiveRoom !== roomCode) {
      setRoomCode(effectiveRoom);
    }

    let acquiredStream: MediaStream | null = null;
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        acquiredStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: callType === 'video',
        });
        localStreamRef.current = acquiredStream;
        if (localVideoRef.current && callType === 'video') {
          localVideoRef.current.srcObject = acquiredStream;
        }
      }
    } catch {
      setErrorMsg(
        'ማይክሮፎን ፍቓድ ኣይተዋህበን — Continuing in Live Interpreter & Subtitle Mode (you can type or use quick phrases).'
      );
    }

    setInCall(true);
    setStatusNote(
      organizationName.trim()
        ? `ቀጥታዊ ደውሊ ምስ ${organizationName.trim()} (${localLangNativeShort} ⇄ ${remoteLanguage})`
        : `ቀጥታዊ ርክብ ተጀሚሩ ኣሎ — Room ${effectiveRoom}`
    );

    timerRef.current = setInterval(() => {
      setDurationSec((s) => s + 1);
    }, 1000);

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws/call-signaling`);
      wsRef.current = ws;

      const pc = createPeerConnection(ws, acquiredStream);

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: 'join-room',
            roomCode: effectiveRoom,
            displayName: user?.name || organizationName.trim() || 'Axumite Caller',
            language: localLanguage,
          })
        );
      };

      ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'peer-joined') {
            setRemotePeerName(msg.displayName || organizationName || 'Remote Caller');
            setPeerConnected(true);
            setStatusNote(`${msg.displayName || 'Participant'} ተጸንቢሩ ኣሎ (Connected)`);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            ws.send(JSON.stringify({ type: 'offer', sdp: offer }));
          } else if (msg.type === 'offer' && msg.sdp) {
            await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            ws.send(JSON.stringify({ type: 'answer', sdp: answer }));
            setPeerConnected(true);
          } else if (msg.type === 'answer' && msg.sdp) {
            await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
            setPeerConnected(true);
          } else if (msg.type === 'ice-candidate' && msg.candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
          } else if (msg.type === 'peer-left') {
            setPeerConnected(false);
            setRemotePeerName(null);
            setStatusNote('Remote participant left the room.');
          } else if (msg.type === 'subtitle') {
            const incoming: CallSubtitleLine = {
              id: `rem_${Date.now()}`,
              sender: 'Remote',
              sourceLanguage: msg.sourceLanguage || remoteLanguage,
              targetLanguage: localLanguage,
              originalText: msg.originalText || '',
              translatedText: msg.translatedText || '',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
            setSubtitles((prev) => [...prev, incoming]);
            speakSubtitle(incoming.translatedText, localLanguage);
          }
        } catch {}
      };

      ws.onerror = () => {};
    } catch {}

    // Optional continuous browser speech recognition for hands-free live subtitles
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition && acquiredStream) {
      try {
        const sr = new SpeechRecognition();
        sr.continuous = true;
        sr.interimResults = false;
        sr.lang = resolveSpeechCode(localLanguage);
        sr.onresult = (e: any) => {
          const last = e.results[e.results.length - 1];
          if (last?.isFinal && last[0]?.transcript) {
            translateAndBroadcastUtterance(last[0].transcript, 'You');
          }
        };
        sr.onerror = () => {};
        sr.start();
        speechRecRef.current = sr;
      } catch {}
    }
  };

  const endCallSession = async (persist = true) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    mediaRecorderRef.current = null;
    setIsRecordingTurn(null);
    stopSpeechPlayback();

    if (speechRecRef.current) {
      try {
        speechRecRef.current.stop();
      } catch {}
      speechRecRef.current = null;
    }
    if (wsRef.current) {
      try {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'leave-room' }));
        }
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch {}
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((tr) => tr.stop());
      localStreamRef.current = null;
    }

    const wasActive = inCall;
    setInCall(false);
    setPeerConnected(false);
    setRemotePeerName(null);
    setStatusNote('ኣብ ምምዕባልን ፈተናን ዘሎ ኣገልግሎት');

    if (persist && wasActive) {
      const labelPrefix = organizationName.trim()
        ? `${organizationName.trim()}${phoneNumber.trim() ? ` (${phoneNumber.trim()})` : ''} — `
        : '';
      const transcriptText = subtitles
        .map(
          (s) =>
            `[${s.timestamp}] ${s.sender === 'You' ? 'ንስኻ (You)' : organizationName.trim() || 'Remote'} (${s.sourceLanguage}➔${s.targetLanguage}): ${s.originalText} -> ${s.translatedText}`
        )
        .join('\n')
        .slice(0, 3900);

      const record: CallSessionRecord = {
        id: `call_${Date.now()}`,
        roomCode: organizationName.trim() || roomCode,
        callType,
        localLanguage,
        remoteLanguage,
        durationSeconds: durationSec,
        transcriptText: transcriptText || `${labelPrefix}Live call translation session completed.`,
        createdAt: new Date().toISOString(),
      };
      await saveCallSession(record);
      setCallHistory((prev) => [record, ...prev]);
      if (subtitles.length > 0) {
        onSaveInsight({
          title: `ቀጥታዊ ደውሊ [${organizationName.trim() || roomCode}]: ${localLanguage} ⇄ ${remoteLanguage}`,
          type: 'translation',
          content: record.transcriptText,
          tags: ['live-call', localLanguage, remoteLanguage],
        });
      }
      setDurationSec(0);
    }
  };

  const toggleMic = () => {
    const next = !micMuted;
    setMicMuted(next);
    localStreamRef.current?.getAudioTracks().forEach((tr) => {
      tr.enabled = !next;
    });
  };

  const toggleCamera = () => {
    const next = !cameraOff;
    setCameraOff(next);
    localStreamRef.current?.getVideoTracks().forEach((tr) => {
      tr.enabled = !next;
    });
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const cleanTelHref = phoneNumber.replace(/[^0-9+*#]/g, '');

  return (
    <div
      className={`relative rounded-[28px] overflow-hidden border shadow-xl transition-colors ${
        isDark
          ? 'bg-[#120E24] border-white/10 text-white'
          : 'bg-[#F7F6FC] border-[#E8E5F5] text-[#1E1A3D]'
      }`}
    >
      {/* Subtle Pastel Ambient Shapes matching reference */}
      {!isDark && (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-[#C9F5E6]/65 blur-2xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-28 -right-24 w-64 h-64 rounded-full bg-[#E7E0FF]/60 blur-2xl"
          />
        </>
      )}

      {/* Top Deep-Indigo Navigation Header */}
      <div className="relative z-10 bg-[#241654] px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => {
              endCallSession(inCall);
              onBack();
            }}
            aria-label="Back to Translator Hub"
            className="w-11 h-11 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4FF0D6]"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-base sm:text-xl font-extrabold text-white tracking-tight font-ethiopic truncate">
            ቀጥታዊ ተርጓሚ ስልኪ
          </h2>
        </div>

        {/* Live Mint Timer Capsule */}
        <div
          className="bg-[#D8F9EC] text-[#0E6A47] px-3.5 py-2 rounded-full flex items-center gap-1.5 font-mono font-bold text-sm tabular-nums shadow-xs shrink-0"
          aria-label={`Call timer ${formatTimer(durationSec)}`}
        >
          <Clock className="w-4 h-4 shrink-0" />
          <span>{formatTimer(durationSec)}</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 p-4 sm:p-6 space-y-5">
        {/* Centered Service Status Capsule */}
        <div className="flex justify-center">
          <div
            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold font-ethiopic border ${
              inCall
                ? 'bg-[#E4FAF1] border-[#96E5C4] text-[#0E6A47]'
                : isDark
                  ? 'bg-[#362617] border-[#784A1E] text-[#FDBA74]'
                  : 'bg-[#FFF6E5] border-[#F4D3A1] text-[#B85D14]'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                inCall ? 'bg-[#10B981]' : 'bg-[#F58220]'
              }`}
            />
            <span>{statusNote}</span>
          </div>
        </div>

        {/* Responsive 2-Column Desktop / Single-Column Mobile Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Primary Call Translator Card Column */}
          <div className="lg:col-span-7 space-y-5">
            {!inCall ? (
              <>
                {/* Main Elevated White Setup Card */}
                <div
                  className={`rounded-[28px] p-4 sm:p-6 space-y-5 border transition-colors ${
                    isDark
                      ? 'bg-[#1B1533] border-white/10 shadow-[0_14px_40px_rgba(0,0,0,0.45)]'
                      : 'bg-white border-[#EAE7F6] shadow-[0_14px_40px_rgba(61,24,158,0.08)]'
                  }`}
                >
                  {/* Signature Royal Purple Inner Banner */}
                  <div className="rounded-[20px] bg-gradient-to-r from-[#5B1EE0] via-[#6B25EA] to-[#7932F2] p-4 text-white flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                        <Languages className="w-6 h-6 text-white" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base sm:text-lg font-extrabold tracking-tight font-ethiopic leading-snug">
                          ብቋንቋኻ ደውል
                        </h3>
                        <p className="text-xs sm:text-[13px] text-white/85 font-ethiopic leading-snug mt-0.5">
                          ንስኻ ብ{localLangNativeShort}፣ ትካል ብዝመረጽካዮ ቋንቋ
                        </p>
                      </div>
                    </div>

                    <div className="bg-white/15 border border-white/20 rounded-full px-3 py-1 text-[11px] font-bold tracking-wider flex items-center gap-1.5 shrink-0">
                      <span className="w-2 h-2 rounded-full bg-[#4FF0D6]" />
                      <span>LIVE</span>
                    </div>
                  </div>

                  {/* Organization Target Label + Contacts Button */}
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <label
                      htmlFor="call-org-name"
                      className={`text-[15px] font-extrabold font-ethiopic ${
                        isDark ? 'text-white' : 'text-[#1E1A3D]'
                      }`}
                    >
                      ክትድውለሉ እትደሊ ትካል
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowContactsModal((v) => !v)}
                      aria-label="Open Contacts Directory"
                      className={`min-h-[38px] px-3.5 py-1.5 rounded-full text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 ${
                        showContactsModal
                          ? 'bg-[#6B25EA] text-white'
                          : isDark
                            ? 'bg-[#6B25EA]/25 text-[#C4B5FD] hover:bg-[#6B25EA]/40'
                            : 'bg-[#F2EEFE] text-[#5F22E3] hover:bg-[#E7DFFD]'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span className="font-ethiopic">ርክባት</span>
                    </button>
                  </div>

                  {/* Mobile/Inline Contacts Picker Drawer */}
                  {showContactsModal && (
                    <div
                      className={`rounded-2xl p-3.5 border space-y-2.5 ${
                        isDark
                          ? 'bg-[#120E24] border-[#6B25EA]/35'
                          : 'bg-[#F8F6FF] border-[#DFD6FE]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-xs font-bold font-ethiopic ${
                            isDark ? 'text-[#C4B5FD]' : 'text-[#5F22E3]'
                          }`}
                        >
                          ቅልጡፍ ርክባት (Quick Contacts)
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={handleSaveCurrentContact}
                            className="px-2.5 py-1 rounded-lg bg-[#6B25EA] hover:bg-[#5B1EE0] text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                          >
                            {contactSavedNotice ? (
                              <>
                                <Check className="w-3 h-3" />
                                <span>ተዓቂቡ</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3 h-3" />
                                <span>ዓቅብ</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowContactsModal(false)}
                            aria-label="Close contacts picker"
                            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-0.5">
                        {allContacts.map((c) => (
                          <div
                            key={c.id}
                            className={`rounded-xl p-2.5 border flex items-center justify-between gap-2 transition-colors ${
                              isDark
                                ? 'bg-[#1B1533] border-white/10 hover:border-[#6B25EA]/60'
                                : 'bg-white border-[#EAE7F6] hover:border-[#6B25EA]/50'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => handlePickContact(c)}
                              className="text-left min-w-0 flex-1 cursor-pointer"
                            >
                              <p className="text-xs font-bold truncate">{c.name}</p>
                              <p
                                className={`text-[11px] tabular-nums truncate ${
                                  isDark ? 'text-slate-400' : 'text-[#6A6782]'
                                }`}
                              >
                                {c.phoneNumber} · {c.language}
                              </p>
                            </button>
                            {c.isCustom && (
                              <button
                                type="button"
                                onClick={() => handleDeleteCustomContact(c.id)}
                                aria-label={`Delete ${c.name}`}
                                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Form Inputs */}
                  <div className="space-y-3.5">
                    {/* Organization Name Input */}
                    <div
                      className={`rounded-2xl px-4 py-3.5 border flex items-center gap-3 transition-all focus-within:border-[#6B25EA] focus-within:ring-2 focus-within:ring-[#6B25EA]/15 ${
                        isDark
                          ? 'bg-white/5 border-white/10'
                          : 'bg-[#F5F5FA] border-[#E4E1F0]'
                      }`}
                    >
                      <Building2 className="w-5 h-5 text-[#6B25EA] shrink-0" />
                      <input
                        id="call-org-name"
                        type="text"
                        value={organizationName}
                        onChange={(e) => setOrganizationName(e.target.value)}
                        placeholder="ስም ትካል — NHS, Council, Bank..."
                        className={`w-full bg-transparent text-sm sm:text-[15px] font-medium font-ethiopic focus:outline-none ${
                          isDark
                            ? 'text-white placeholder:text-slate-400'
                            : 'text-[#1E1A3D] placeholder:text-[#8E8BA3]'
                        }`}
                      />
                    </div>

                    {/* Phone Number Input + Hint */}
                    <div className="space-y-2">
                      <div
                        className={`rounded-2xl px-4 py-3.5 border flex items-center gap-3 transition-all focus-within:border-[#6B25EA] focus-within:ring-2 focus-within:ring-[#6B25EA]/15 ${
                          isDark
                            ? 'bg-white/5 border-white/10'
                            : 'bg-[#F5F5FA] border-[#E4E1F0]'
                        }`}
                      >
                        <Phone className="w-5 h-5 text-[#6B25EA] shrink-0" />
                        <input
                          id="call-phone-number"
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="+49...  /  +291...  /  0300..."
                          aria-label="Phone number"
                          className={`w-full bg-transparent text-sm sm:text-[15px] font-medium tabular-nums focus:outline-none ${
                            isDark
                              ? 'text-white placeholder:text-slate-400'
                              : 'text-[#1E1A3D] placeholder:text-[#8E8BA3]'
                          }`}
                        />
                      </div>
                      <p
                        className={`text-xs font-ethiopic px-1 leading-relaxed ${
                          isDark ? 'text-slate-400' : 'text-[#676480]'
                        }`}
                      >
                        ኣህጉራዊ ቁጽሪ ብ + ኮድ ሃገር ኣእቱ። UK ቁጽሪ ብ 0 ክጅምር ይኽእል።
                      </p>
                    </div>

                    {/* Organization Language Selector */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setShowLanguageDropdown((v) => !v);
                          setShowLocalLangPicker(false);
                        }}
                        aria-expanded={showLanguageDropdown}
                        aria-label="Select organization language"
                        className={`w-full rounded-2xl px-4 py-3 border flex items-center justify-between gap-3 text-left cursor-pointer transition-all ${
                          showLanguageDropdown
                            ? 'border-[#6B25EA] ring-2 ring-[#6B25EA]/15'
                            : isDark
                              ? 'bg-white/5 border-white/10 hover:border-[#6B25EA]/60'
                              : 'bg-[#F5F5FA] border-[#E4E1F0] hover:border-[#6B25EA]/50'
                        } ${isDark ? 'bg-white/5' : 'bg-[#F5F5FA]'}`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <LanguageFlagIcon
                            languageName={remoteLanguage}
                            fallbackFlag={selectedRemoteLangObj?.flag}
                          />
                          <div className="min-w-0">
                            <span
                              className={`block text-xs font-ethiopic ${
                                isDark ? 'text-slate-400' : 'text-[#6B6884]'
                              }`}
                            >
                              ቋንቋ ናይቲ ትካል
                            </span>
                            <span
                              className={`block text-[15px] font-bold truncate ${
                                isDark ? 'text-white' : 'text-[#1E1A3D]'
                              }`}
                            >
                              {remoteLanguage}
                            </span>
                          </div>
                        </div>
                        <ChevronDown
                          className={`w-5 h-5 shrink-0 transition-transform ${
                            showLanguageDropdown ? 'rotate-180 text-[#6B25EA]' : 'text-[#6B6884]'
                          }`}
                        />
                      </button>

                      {showLanguageDropdown && (
                        <div
                          className={`mt-2 rounded-2xl border shadow-xl p-3 space-y-2.5 ${
                            isDark
                              ? 'bg-[#18122E] border-white/15'
                              : 'bg-white border-[#E4E1F0]'
                          }`}
                        >
                          <div
                            className={`rounded-xl px-3 py-2 border flex items-center gap-2 ${
                              isDark
                                ? 'bg-white/5 border-white/10'
                                : 'bg-[#F5F5FA] border-[#E4E1F0]'
                            }`}
                          >
                            <Search className="w-4 h-4 text-[#6B25EA] shrink-0" />
                            <input
                              type="text"
                              value={languageSearch}
                              onChange={(e) => setLanguageSearch(e.target.value)}
                              placeholder="ቋንቋ ድለ — Search language..."
                              className="w-full bg-transparent text-xs focus:outline-none"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-52 overflow-y-auto pr-1">
                            {sortedLanguages.map((lang) => {
                              const active = lang.name === remoteLanguage;
                              return (
                                <button
                                  key={`rem-${lang.code}`}
                                  type="button"
                                  onClick={() => {
                                    setRemoteLanguage(lang.name);
                                    setShowLanguageDropdown(false);
                                    setLanguageSearch('');
                                  }}
                                  className={`px-3 py-2 rounded-xl text-left flex items-center justify-between gap-2 text-xs font-semibold cursor-pointer transition-colors ${
                                    active
                                      ? 'bg-[#6B25EA] text-white'
                                      : isDark
                                        ? 'hover:bg-white/10 text-slate-200'
                                        : 'hover:bg-[#F2EEFE] text-[#1E1A3D]'
                                  }`}
                                >
                                  <span className="flex items-center gap-2 min-w-0">
                                    <LanguageFlagIcon
                                      languageName={lang.name}
                                      fallbackFlag={lang.flag}
                                    />
                                    <span className="truncate">{lang.name}</span>
                                  </span>
                                  {active && <Check className="w-3.5 h-3.5 shrink-0" />}
                                </button>
                              );
                            })}
                          </div>

                          {/* Subtle switcher for caller's own language */}
                          <div
                            className={`pt-2 border-t flex items-center justify-between gap-2 text-xs ${
                              isDark ? 'border-white/10' : 'border-[#EAE7F6]'
                            }`}
                          >
                            <span className={isDark ? 'text-slate-400' : 'text-[#676480]'}>
                              ቋንቋኻ (Your Language): <strong className="text-[#6B25EA]">{localLanguage}</strong>
                            </span>
                            <button
                              type="button"
                              onClick={() => setShowLocalLangPicker((v) => !v)}
                              className="text-[#6B25EA] font-bold hover:underline cursor-pointer"
                            >
                              {showLocalLangPicker ? 'Done' : 'Change'}
                            </button>
                          </div>

                          {showLocalLangPicker && (
                            <select
                              value={localLanguage}
                              onChange={(e) => setLocalLanguage(e.target.value)}
                              aria-label="Your spoken language"
                              className={`w-full rounded-xl px-3 py-2 text-xs border focus:outline-none ${
                                isDark
                                  ? 'bg-[#120E24] border-white/15 text-white'
                                  : 'bg-[#F5F5FA] border-[#E4E1F0] text-[#1E1A3D]'
                              }`}
                            >
                              {ALL_INTERNATIONAL_LANGUAGES.map((l) => (
                                <option key={`loc-${l.code}`} value={l.name}>
                                  {l.flag ? `${l.flag} ` : ''}
                                  {l.name} ({l.nativeName})
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {errorMsg && (
                  <div className="rounded-2xl px-4 py-3 text-xs font-semibold bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-300">
                    {errorMsg}
                  </div>
                )}

                {/* Primary Full-Width Royal Purple Start Call Button */}
                <button
                  type="button"
                  onClick={startCallSession}
                  className="w-full min-h-[62px] rounded-2xl bg-gradient-to-r from-[#5B1EE0] via-[#6A24E9] to-[#7730F2] hover:from-[#5018CC] hover:to-[#6A24E5] active:scale-[0.99] text-white p-2.5 pr-5 shadow-[0_12px_30px_rgba(95,34,227,0.34)] flex items-center justify-between transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#6B25EA]"
                >
                  <span className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5 text-white" />
                  </span>
                  <span className="text-base sm:text-lg font-extrabold tracking-wide font-ethiopic">
                    ደውሊ ጀምር
                  </span>
                  <ArrowRight className="w-5 h-5 text-white shrink-0" />
                </button>
              </>
            ) : (
              /* Active Live Call Stage */
              <div
                className={`rounded-[28px] p-4 sm:p-6 space-y-5 border ${
                  isDark
                    ? 'bg-[#1B1533] border-white/10 shadow-xl'
                    : 'bg-white border-[#EAE7F6] shadow-[0_14px_40px_rgba(61,24,158,0.09)]'
                }`}
              >
                {/* Active Call Header Banner */}
                <div className="rounded-[20px] bg-gradient-to-r from-[#241654] via-[#4A1EC4] to-[#6B25EA] p-4 text-white flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                      <PhoneCall className="w-6 h-6 text-[#4FF0D6]" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-extrabold truncate font-ethiopic">
                        {organizationName.trim() || `Room ${roomCode}`}
                      </h3>
                      <p className="text-xs text-white/80 tabular-nums truncate">
                        {phoneNumber.trim() ? `${phoneNumber.trim()} · ` : ''}
                        {localLanguage} ⇄ {remoteLanguage}
                        {peerConnected ? ` · Connected: ${remotePeerName || 'Peer'}` : ''}
                      </p>
                    </div>
                  </div>

                  {cleanTelHref && (
                    <a
                      href={`tel:${cleanTelHref}`}
                      className="px-3.5 py-2 rounded-xl bg-[#D8F9EC] hover:bg-[#C2F4E0] text-[#0E6A47] text-xs font-extrabold inline-flex items-center gap-1.5 transition-colors shrink-0"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Dial {phoneNumber.trim()}</span>
                    </a>
                  )}
                </div>

                {/* Video Stage (only when Video Call mode selected) */}
                {callType === 'video' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="relative rounded-2xl overflow-hidden bg-[#120E24] aspect-video border border-[#6B25EA]/30 flex items-center justify-center">
                      <video
                        ref={localVideoRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg bg-black/70 text-white text-[11px] font-semibold">
                        ንስኻ ({localLanguage})
                      </span>
                    </div>
                    <div className="relative rounded-2xl overflow-hidden bg-[#120E24] aspect-video border border-[#6B25EA]/30 flex items-center justify-center">
                      <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                      />
                      {!peerConnected && (
                        <span className="text-xs text-slate-300 px-4 text-center">
                          Share Room {roomCode} for live peer video
                        </span>
                      )}
                      <span className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg bg-black/70 text-white text-[11px] font-semibold">
                        {organizationName.trim() || 'Remote'} ({remoteLanguage})
                      </span>
                    </div>
                  </div>
                )}

                {errorMsg && (
                  <div className="rounded-xl px-3.5 py-2.5 text-xs font-semibold bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-300">
                    {errorMsg}
                  </div>
                )}

                {/* Dual Push-to-Translate Voice Interpreter Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={isTranslating}
                    onClick={() => toggleVoiceTurnCapture('You')}
                    className={`min-h-[56px] px-4 py-3 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-60 ${
                      isRecordingTurn === 'You'
                        ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/30'
                        : 'bg-[#6B25EA] hover:bg-[#5B1EE0] text-white shadow-md shadow-[#6B25EA]/25'
                    }`}
                  >
                    {isRecordingTurn === 'You' ? (
                      <>
                        <Square className="w-4 h-4 fill-white" />
                        <span className="font-ethiopic">ደው ኣብል (Send {localLangNativeShort})</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-4 h-4" />
                        <span className="font-ethiopic">
                          ንስኻ ተዛረብ ({localLangNativeShort} ➔ {remoteLanguage})
                        </span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={isTranslating}
                    onClick={() => toggleVoiceTurnCapture('Remote')}
                    className={`min-h-[56px] px-4 py-3 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-60 ${
                      isRecordingTurn === 'Remote'
                        ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/30'
                        : 'bg-[#0E6A47] hover:bg-[#0B593B] text-white shadow-md shadow-emerald-700/20'
                    }`}
                  >
                    {isRecordingTurn === 'Remote' ? (
                      <>
                        <Square className="w-4 h-4 fill-white" />
                        <span className="font-ethiopic">ደው ኣብል (Translate to {localLangNativeShort})</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-4 h-4" />
                        <span className="font-ethiopic">
                          ትካል ተዛረበ ({remoteLanguage} ➔ {localLangNativeShort})
                        </span>
                      </>
                    )}
                  </button>
                </div>

                {/* Live Subtitles Feed for Both Participants */}
                <div
                  className={`rounded-2xl p-3.5 border min-h-[160px] max-h-72 overflow-y-auto space-y-2.5 ${
                    isDark
                      ? 'bg-[#120E24] border-white/10'
                      : 'bg-[#F7F6FC] border-[#E7E4F3]'
                  }`}
                >
                  {subtitles.length === 0 ? (
                    <div className="h-32 flex flex-col items-center justify-center text-center px-4 gap-1.5">
                      <Languages className="w-6 h-6 text-[#6B25EA]/60" />
                      <p className="text-xs font-bold font-ethiopic">
                        ቀጥታዊ ትርጉም ጽሑፍ ኣብዚ ክረአ እዩ
                      </p>
                      <p
                        className={`text-[11px] ${
                          isDark ? 'text-slate-400' : 'text-[#6B6884]'
                        }`}
                      >
                        Tap a voice button above, pick a quick phrase, or type below to translate & speak live.
                      </p>
                    </div>
                  ) : (
                    subtitles.map((sub) => {
                      const isUser = sub.sender === 'You';
                      return (
                        <div
                          key={sub.id}
                          className={`rounded-2xl p-3.5 text-xs space-y-1 border ${
                            isUser
                              ? isDark
                                ? 'bg-[#2B1B5A] border-[#6B25EA]/40 ml-4'
                                : 'bg-[#F2EEFE] border-[#DFD5FE] ml-4'
                              : isDark
                                ? 'bg-[#112A24] border-emerald-500/30 mr-4'
                                : 'bg-[#E9FBF3] border-[#BDEED8] mr-4'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 text-[11px]">
                            <span
                              className={`font-bold ${
                                isUser
                                  ? isDark
                                    ? 'text-[#C4B5FD]'
                                    : 'text-[#5B1EE0]'
                                  : isDark
                                    ? 'text-emerald-300'
                                    : 'text-[#0E6A47]'
                              }`}
                            >
                              {isUser ? 'ንስኻ (You)' : organizationName.trim() || 'ትካል (Organization)'} ·{' '}
                              {sub.sourceLanguage} ➔ {sub.targetLanguage}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="opacity-65 tabular-nums">{sub.timestamp}</span>
                              <button
                                type="button"
                                onClick={() => speakSubtitle(sub.translatedText, sub.targetLanguage)}
                                aria-label="Replay spoken translation"
                                className="p-1 rounded-md hover:bg-black/10 cursor-pointer"
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <p className="opacity-80">{sub.originalText}</p>
                          <p className="text-sm sm:text-[15px] font-extrabold font-ethiopic leading-snug">
                            {sub.translatedText}
                          </p>
                          {sub.transliteration && (
                            <p className="text-[11px] italic opacity-70">{sub.transliteration}</p>
                          )}
                        </div>
                      );
                    })
                  )}
                  <div ref={subtitlesEndRef} />
                </div>

                {/* One-Tap Quick Call Phrases */}
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_CALL_PHRASES.map((phrase, idx) => (
                    <button
                      key={`qp-${idx}`}
                      type="button"
                      disabled={isTranslating}
                      onClick={() => translateAndBroadcastUtterance(phrase.ti, 'You')}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold font-ethiopic border cursor-pointer transition-colors disabled:opacity-50 ${
                        isDark
                          ? 'bg-white/5 border-white/10 hover:border-[#6B25EA] text-slate-200'
                          : 'bg-[#F6F5FB] border-[#E5E2F2] hover:border-[#6B25EA] text-[#2A254D]'
                      }`}
                    >
                      {phrase.ti}
                    </button>
                  ))}
                </div>

                {/* Live Text Caption Composer */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!utteranceDraft.trim() || isTranslating) return;
                    translateAndBroadcastUtterance(utteranceDraft, activeSpeakerRole);
                    setUtteranceDraft('');
                  }}
                  className="flex flex-col sm:flex-row gap-2"
                >
                  <div className="flex items-center gap-1.5 flex-1">
                    <button
                      type="button"
                      onClick={() =>
                        setActiveSpeakerRole((r) => (r === 'You' ? 'Remote' : 'You'))
                      }
                      className={`min-h-[44px] px-3 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer border ${
                        activeSpeakerRole === 'You'
                          ? 'bg-[#F2EEFE] border-[#DFD5FE] text-[#5B1EE0]'
                          : 'bg-[#E9FBF3] border-[#BDEED8] text-[#0E6A47]'
                      }`}
                    >
                      {activeSpeakerRole === 'You' ? `ንስኻ (${localLangNativeShort})` : `ትካል (${remoteLanguage})`}
                    </button>
                    <input
                      type="text"
                      value={utteranceDraft}
                      onChange={(e) => setUtteranceDraft(e.target.value)}
                      placeholder={
                        activeSpeakerRole === 'You'
                          ? `ብ${localLangNativeShort} ጽሓፍ...`
                          : `Type ${remoteLanguage} spoken by organization...`
                      }
                      className={`flex-1 min-h-[44px] rounded-xl px-3.5 py-2 text-xs sm:text-sm border focus:outline-none focus:border-[#6B25EA] ${
                        isDark
                          ? 'bg-white/5 border-white/10 text-white'
                          : 'bg-[#F5F5FA] border-[#E4E1F0] text-[#1E1A3D]'
                      }`}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!utteranceDraft.trim() || isTranslating}
                    className="min-h-[44px] px-4 rounded-xl bg-[#6B25EA] hover:bg-[#5B1EE0] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-45 shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isTranslating ? 'Translating...' : 'Translate & Speak'}</span>
                  </button>
                </form>

                {/* Active Call Hardware Controls + End Call */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-black/5 dark:border-white/10">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={toggleMic}
                      className={`min-h-[42px] px-3.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer border ${
                        micMuted
                          ? 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-300'
                          : isDark
                            ? 'bg-white/5 border-white/10 text-white'
                            : 'bg-[#F5F5FA] border-[#E4E1F0] text-[#1E1A3D]'
                      }`}
                    >
                      {micMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      <span>{micMuted ? 'Muted' : 'Mic On'}</span>
                    </button>

                    {callType === 'video' && (
                      <button
                        type="button"
                        onClick={toggleCamera}
                        className={`min-h-[42px] px-3.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer border ${
                          cameraOff
                            ? 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-300'
                            : isDark
                              ? 'bg-white/5 border-white/10 text-white'
                              : 'bg-[#F5F5FA] border-[#E4E1F0] text-[#1E1A3D]'
                        }`}
                      >
                        {cameraOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                        <span>{cameraOff ? 'Cam Off' : 'Cam On'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setSpeakerMuted((v) => !v)}
                      className={`min-h-[42px] px-3.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer border ${
                        speakerMuted
                          ? 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-300'
                          : isDark
                            ? 'bg-white/5 border-white/10 text-white'
                            : 'bg-[#F5F5FA] border-[#E4E1F0] text-[#1E1A3D]'
                      }`}
                    >
                      {speakerMuted ? (
                        <VolumeX className="w-4 h-4" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                      <span>{speakerMuted ? 'Speaker Off' : 'Speaker On'}</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => endCallSession(true)}
                    className="min-h-[44px] px-5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs sm:text-sm font-extrabold inline-flex items-center gap-2 cursor-pointer shadow-md shadow-rose-600/25 font-ethiopic"
                  >
                    <PhoneOff className="w-4 h-4" />
                    <span>ደውሊ ኣቋርጽ ({formatTimer(durationSec)})</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Companion Column: Contacts Directory, In-App Room Bridge & Call History */}
          <div className="lg:col-span-5 space-y-4">
            {/* Quick-Dial Organizations Directory */}
            <div
              className={`rounded-[24px] p-4 sm:p-5 border space-y-3 ${
                isDark
                  ? 'bg-[#1B1533] border-white/10'
                  : 'bg-white border-[#EAE7F6] shadow-[0_8px_28px_rgba(61,24,158,0.05)]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#6B25EA]" />
                  <h3 className="text-sm font-extrabold font-ethiopic">
                    ቅልጡፍ ርክባት ትካላት (Directory)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleSaveCurrentContact}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors ${
                    isDark
                      ? 'bg-[#6B25EA]/25 text-[#C4B5FD] hover:bg-[#6B25EA]/40'
                      : 'bg-[#F2EEFE] text-[#5F22E3] hover:bg-[#E7DFFD]'
                  }`}
                >
                  {contactSavedNotice ? (
                    <>
                      <Check className="w-3 h-3" />
                      <span>Saved</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3 h-3" />
                      <span>Save Current</span>
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-0.5">
                {allContacts.map((contact) => {
                  const isSelected =
                    organizationName === contact.name && phoneNumber === contact.phoneNumber;
                  return (
                    <div
                      key={`side-${contact.id}`}
                      className={`rounded-xl px-3 py-2.5 border flex items-center justify-between gap-2 transition-colors ${
                        isSelected
                          ? 'bg-[#F2EEFE] border-[#6B25EA]/50 dark:bg-[#6B25EA]/20'
                          : isDark
                            ? 'bg-white/[0.03] border-white/5 hover:border-[#6B25EA]/40'
                            : 'bg-[#F8F7FC] border-[#ECEAF6] hover:border-[#6B25EA]/40'
                      }`}
                    >
                      <button
                        type="button"
                        disabled={inCall}
                        onClick={() => handlePickContact(contact)}
                        className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer disabled:opacity-60"
                      >
                        <LanguageFlagIcon languageName={contact.language} />
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">{contact.name}</p>
                          <p
                            className={`text-[11px] tabular-nums truncate ${
                              isDark ? 'text-slate-400' : 'text-[#6A6782]'
                            }`}
                          >
                            {contact.phoneNumber} · {contact.language}
                          </p>
                        </div>
                      </button>
                      {contact.isCustom && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomContact(contact.id)}
                          aria-label={`Remove ${contact.name}`}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* In-App WebRTC Room & Audio/Video Mode */}
            <div
              className={`rounded-[24px] p-4 sm:p-5 border space-y-3.5 ${
                isDark
                  ? 'bg-[#1B1533] border-white/10'
                  : 'bg-white border-[#EAE7F6] shadow-[0_8px_28px_rgba(61,24,158,0.05)]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-extrabold">
                  <Shield className="w-4 h-4 text-[#0E6A47]" />
                  <span>Encrypted In-App Call Bridge</span>
                </span>
                <div
                  className={`flex items-center gap-1 p-1 rounded-xl ${
                    isDark ? 'bg-white/5' : 'bg-[#F3F1FA]'
                  }`}
                >
                  <button
                    type="button"
                    disabled={inCall}
                    onClick={() => setCallType('audio')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                      callType === 'audio'
                        ? 'bg-[#6B25EA] text-white'
                        : isDark
                          ? 'text-slate-300'
                          : 'text-[#5A5673]'
                    }`}
                  >
                    <Phone className="w-3 h-3" />
                    <span>Audio</span>
                  </button>
                  <button
                    type="button"
                    disabled={inCall}
                    onClick={() => setCallType('video')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                      callType === 'video'
                        ? 'bg-[#6B25EA] text-white'
                        : isDark
                          ? 'text-slate-300'
                          : 'text-[#5A5673]'
                    }`}
                  >
                    <Video className="w-3 h-3" />
                    <span>Video</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  disabled={inCall}
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  aria-label="In-app WebRTC Room Code"
                  className={`flex-1 rounded-xl px-3 py-2 text-xs font-mono font-bold border focus:outline-none focus:border-[#6B25EA] ${
                    isDark
                      ? 'bg-white/5 border-white/10 text-white'
                      : 'bg-[#F5F5FA] border-[#E4E1F0] text-[#1E1A3D]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(roomCode);
                    setCopiedRoom(true);
                    setTimeout(() => setCopiedRoom(false), 1800);
                  }}
                  aria-label="Copy room code"
                  className={`min-h-[36px] px-3 rounded-xl text-xs font-bold inline-flex items-center gap-1 cursor-pointer border ${
                    isDark
                      ? 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-200'
                      : 'bg-[#F2EEFE] border-[#DFD5FE] text-[#5F22E3] hover:bg-[#E7DFFD]'
                  }`}
                >
                  {copiedRoom ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedRoom ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-[#6A6782]'}`}>
                Share this room code for two-way WebRTC in-app calls with live subtitles, or dial an organization directly while running bilingual voice translation.
              </p>
            </div>

            {/* Saved Call History & Transcripts */}
            {callHistory.length > 0 && (
              <div
                className={`rounded-[24px] p-4 sm:p-5 border space-y-3 ${
                  isDark
                    ? 'bg-[#1B1533] border-white/10'
                    : 'bg-white border-[#EAE7F6] shadow-[0_8px_28px_rgba(61,24,158,0.05)]'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <History className="w-4 h-4 text-[#6B25EA]" />
                  <h3 className="text-xs font-extrabold font-ethiopic">
                    ታሪኽ ደውልታት · Call History ({callHistory.length})
                  </h3>
                </div>
                <div className="space-y-2 max-h-52 overflow-y-auto pr-0.5">
                  {callHistory.slice(0, 6).map((callItem) => (
                    <div
                      key={callItem.id}
                      className={`rounded-xl p-3 border flex items-start justify-between gap-2 ${
                        isDark
                          ? 'bg-white/[0.03] border-white/10'
                          : 'bg-[#F8F7FC] border-[#ECEAF6]'
                      }`}
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="text-xs font-bold truncate">
                          {callItem.roomCode} · {formatTimer(callItem.durationSeconds)}
                        </p>
                        <p className="text-[11px] text-[#6B25EA] font-semibold">
                          {callItem.localLanguage} ⇄ {callItem.remoteLanguage}
                        </p>
                        <p
                          className={`text-[11px] truncate ${
                            isDark ? 'text-slate-400' : 'text-[#6A6782]'
                          }`}
                        >
                          {callItem.transcriptText}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            const blob = new Blob([callItem.transcriptText], {
                              type: 'text/plain;charset=utf-8',
                            });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `call-${callItem.roomCode}.txt`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                          }}
                          aria-label="Download call transcript"
                          className="p-1.5 rounded-lg hover:bg-[#6B25EA]/15 text-[#6B25EA] cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await deleteCallSession(callItem.id);
                            setCallHistory((prev) => prev.filter((c) => c.id !== callItem.id));
                          }}
                          aria-label="Delete call record"
                          className="p-1.5 rounded-lg hover:bg-rose-500/15 text-rose-500 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
