import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Smartphone,
  Vibrate,
  Bug,
  AlertTriangle,
  CheckCircle2,
  X,
  Sparkles,
  Upload,
  Image as ImageIcon,
  FileText,
  Mic,
  Volume2,
  Cpu,
  Layers,
  Wifi,
  Trash2,
  Copy,
  Download,
  RefreshCw,
  Sliders,
  ShieldAlert,
  Send,
  Activity,
  History,
  Info,
  Clock,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Fingerprint,
  Check,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { UserProfile, AppTab } from '../types';
import { BugReportService, BugReport, BugCategory, BugSeverity, DeviceTelemetry } from '../services/bugReportService';
import { playVoiceTriggerChime, playCommandSuccessChime } from '../utils/audioChime';
import { GoldCheckAnimation } from './GoldCheckAnimation';
import axumiteEmblem from '../assets/axumite_gold_icon.jpg';

export interface BugReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: UserProfile;
  activeTab?: AppTab | string;
  triggerSource?: 'shake' | 'menu' | 'shortcut' | 'manual';
  shakeVelocity?: number;
  sensorSample?: { x: number; y: number; z: number };
  onSimulateShake?: () => void;
  shakeSensitivity?: number;
  onUpdateSensitivity?: (val: number) => void;
}

const BUG_CATEGORIES: { id: BugCategory; labelEn: string; labelTi: string; icon: any }[] = [
  { id: 'ui_glitch', labelEn: 'UI / Visual Glitch', labelTi: 'ናይ ገጽታ/ዕይታ ጸገም', icon: Layers },
  { id: 'audio_translation', labelEn: 'Audio & Translation', labelTi: 'ድምጺ/ትርጉም ጸገም', icon: Volume2 },
  { id: 'voice_synthesis', labelEn: 'Speech Studio / TTS', labelTi: 'ናይ ድምጺ ምንባብ', icon: Mic },
  { id: 'payment_telebirr', labelEn: 'Payment & Telebirr', labelTi: 'ክፍሊት/ቴሌብር', icon: CreditCard },
  { id: 'biometric_security', labelEn: 'Biometrics & Security', labelTi: 'ባዮሜትሪክ/ድሕነት', icon: Fingerprint },
  { id: 'performance_lag', labelEn: 'Performance & Speed', labelTi: 'ናይ ቅልጣፈ/ስርዓት ምድንጓይ', icon: Cpu },
  { id: 'scholarship_data', labelEn: 'Scholarship / STEM', labelTi: 'ናይ ትምህርቲ ዕድላት', icon: Sparkles },
  { id: 'other', labelEn: 'General Feedback', labelTi: 'ሓፈሻዊ ርእይቶ', icon: Bug },
];

const SEVERITY_LEVELS: { id: BugSeverity; labelEn: string; labelTi: string; color: string; bg: string; border: string }[] = [
  { id: 'low', labelEn: 'Low (Minor)', labelTi: 'ቀሊል (Minor)', color: 'text-emerald-300', bg: 'bg-emerald-500/15', border: 'border-emerald-500/40' },
  { id: 'medium', labelEn: 'Medium', labelTi: 'ማእከላይ (Medium)', color: 'text-amber-300', bg: 'bg-amber-500/15', border: 'border-amber-500/40' },
  { id: 'high', labelEn: 'High (Blocker)', labelTi: 'ከቢድ (High)', color: 'text-orange-300', bg: 'bg-orange-500/15', border: 'border-orange-500/40' },
  { id: 'critical', labelEn: 'Critical Sovereign Halt', labelTi: 'ህጹጽ ጸገም (Critical)', color: 'text-rose-300', bg: 'bg-rose-500/20', border: 'border-rose-500/50' },
];

const QUICK_TAGS = [
  'Microphone unreadable',
  'Translation font error',
  'Telebirr OTP delayed',
  'Shake sensitivity high',
  'Biometric camera slow',
  'Ge’ez script mismatch',
  'Offline cache sync failed',
];

export const BugReportModal: React.FC<BugReportModalProps> = ({
  isOpen,
  onClose,
  user,
  activeTab = 'premiere',
  triggerSource = 'shake',
  shakeVelocity,
  sensorSample,
  onSimulateShake,
  shakeSensitivity = 20,
  onUpdateSensitivity,
}) => {
  const { language } = useLanguage();
  const isTigrinya = language === 'ti' || language === 'ti_tg';

  // Tabs: 'report' | 'history' | 'calibration'
  const [activeModalTab, setActiveModalTab] = useState<'report' | 'history' | 'calibration'>('report');

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<BugCategory>('ui_glitch');
  const [severity, setSeverity] = useState<BugSeverity>('medium');
  const [includeTelemetry, setIncludeTelemetry] = useState(true);
  const [attachments, setAttachments] = useState<{ name: string; type: string; size: number; previewUrl?: string }[]>([]);
  const [isCapturingScreenshot, setIsCapturingScreenshot] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [hasVoiceNote, setHasVoiceNote] = useState(false);

  // Status & Telemetry
  const [telemetry, setTelemetry] = useState<DeviceTelemetry | null>(null);
  const [showTelemetryDrawer, setShowTelemetryDrawer] = useState(false);
  const [submittedReport, setSubmittedReport] = useState<BugReport | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedTelemetry, setCopiedTelemetry] = useState(false);
  const [copiedTicket, setCopiedTicket] = useState(false);
  const [pastReports, setPastReports] = useState<BugReport[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioTimerRef = useRef<any>(null);

  // Initialize Telemetry & Data when opened
  useEffect(() => {
    if (isOpen) {
      const data = BugReportService.collectTelemetry(activeTab, shakeVelocity, sensorSample);
      setTelemetry(data);
      setPastReports(BugReportService.getAllReports());
      setSubmittedReport(null);
      setIsSubmitting(false);
      setCopiedTelemetry(false);
      setCopiedTicket(false);

      // Auto play pleasant chime on open
      try {
        playVoiceTriggerChime(0.1);
      } catch {
        // ignore
      }
    }
  }, [isOpen, activeTab, shakeVelocity, sensorSample]);

  // Audio recording simulation timer
  useEffect(() => {
    if (isRecordingAudio) {
      setAudioDuration(0);
      audioTimerRef.current = setInterval(() => {
        setAudioDuration((prev) => {
          if (prev >= 15) {
            clearInterval(audioTimerRef.current);
            setIsRecordingAudio(false);
            setHasVoiceNote(true);
            return 15;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (audioTimerRef.current) clearInterval(audioTimerRef.current);
    }
    return () => {
      if (audioTimerRef.current) clearInterval(audioTimerRef.current);
    };
  }, [isRecordingAudio]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles: { name: string; type: string; size: number; previewUrl?: string }[] = [];
    Array.from(files).forEach((file: File) => {
      const isImg = file.type.startsWith('image/');
      const previewUrl = isImg ? URL.createObjectURL(file) : undefined;
      newFiles.push({
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        previewUrl,
      });
    });

    setAttachments((prev) => [...prev, ...newFiles]);
  };

  const handleCaptureInstantSnapshot = () => {
    setIsCapturingScreenshot(true);
    setTimeout(() => {
      const fakeSnapshot = {
        name: `axumite_viewport_snapshot_${Date.now()}.png`,
        type: 'image/png',
        size: 142850,
        previewUrl: axumiteEmblem,
      };
      setAttachments((prev) => [...prev, fakeSnapshot]);
      setIsCapturingScreenshot(false);
    }, 600);
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);

    const reportTelemetry = includeTelemetry
      ? telemetry || BugReportService.collectTelemetry(activeTab, shakeVelocity, sensorSample)
      : {
          userAgent: 'Anonymized',
          platform: 'Hidden',
          screenResolution: 'Hidden',
          viewportSize: 'Hidden',
          language: 'en',
          onlineStatus: true,
          activeTab,
          devicePixelRatio: 1,
        };

    const newReport = BugReportService.submitReport({
      title: title.trim(),
      description: description.trim() || 'No additional narrative description provided.',
      category,
      severity,
      userEmail: user?.email,
      userName: user?.name,
      userRole: user?.role,
      activeTab,
      telemetry: reportTelemetry,
      attachments,
      voiceNoteDurationSec: hasVoiceNote ? audioDuration : undefined,
    });

    setTimeout(() => {
      setIsSubmitting(false);
      setSubmittedReport(newReport);
      setPastReports(BugReportService.getAllReports());
      playCommandSuccessChime(0.2);

      // Reset fields for future reports
      setTitle('');
      setDescription('');
      setAttachments([]);
      setHasVoiceNote(false);
      setAudioDuration(0);
    }, 500);
  };

  const handleCopyTelemetry = () => {
    if (!telemetry) return;
    navigator.clipboard.writeText(JSON.stringify(telemetry, null, 2));
    setCopiedTelemetry(true);
    setTimeout(() => setCopiedTelemetry(false), 2000);
  };

  const handleCopyTicket = (ticket: string) => {
    navigator.clipboard.writeText(ticket);
    setCopiedTicket(true);
    setTimeout(() => setCopiedTicket(false), 2000);
  };

  const handleExportAllReports = () => {
    const jsonStr = BugReportService.exportReportsAsJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `axumite_bug_reports_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[9990] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md overflow-y-auto"
        id="axumite-shake-to-report-modal"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-2xl bg-[#0B0716] border border-[#8E6D28]/60 text-slate-100 rounded-3xl shadow-[0_0_50px_rgba(212,175,55,0.25)] overflow-hidden flex flex-col my-auto max-h-[92vh]"
        >
          {/* TOP LUXURY GOLD ACCENT HEADER */}
          <div className="relative px-5 py-4 border-b border-[#2D2147] bg-gradient-to-r from-[#170F2C] via-[#241740] to-[#120B24] flex items-center justify-between flex-wrap gap-3">
            {/* Header Title & Badge */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#D4AF37] via-[#FFF4B8] to-[#967426] p-[1.5px] shadow-[0_0_15px_rgba(212,175,55,0.4)]">
                <div className="w-full h-full rounded-[14px] bg-[#0E0A1D] flex items-center justify-center text-amber-300">
                  <Vibrate className="w-5 h-5 animate-pulse" />
                </div>
              </div>

              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-base sm:text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FFF4B8] via-[#D4AF37] to-[#AA7C11] font-serif">
                    {isTigrinya ? 'ጸብጻብ ጸገም / ሕቶ (Shake-to-Report)' : 'Shake-to-Report Diagnostics'}
                  </h2>
                  {triggerSource === 'shake' ? (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[10px] font-mono font-bold flex items-center space-x-1">
                      <Smartphone className="w-3 h-3 animate-bounce" />
                      <span>SHAKE SENSOR</span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-300 text-[10px] font-mono font-bold">
                      MANUAL
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-400">
                  {isTigrinya
                    ? 'ሞባይልኩም ብምምንቕናቕ ዝተረኽበ ጸብጻብን ቴክኒካዊ ሓበሬታን'
                    : 'Instant telemetry capture powered by hardware accelerometer.'}
                </p>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-[#1A122E] hover:bg-[#271B42] text-gray-400 hover:text-white border border-[#3C2D56] transition-all cursor-pointer"
              title="Close Modal"
              id="close-bug-modal-btn"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* NAVIGATION TABS (REPORT, SENSOR CALIBRATION, HISTORY) */}
          <div className="px-5 pt-3 pb-1 border-b border-[#211638] bg-[#0E091D]/80 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setActiveModalTab('report')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                  activeModalTab === 'report'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-400/50 shadow-sm'
                    : 'text-gray-400 hover:text-slate-200 hover:bg-[#1B1233]'
                }`}
              >
                <Bug className="w-3.5 h-3.5" />
                <span>{isTigrinya ? 'ሓድሽ ጸብጻብ' : 'File Report'}</span>
              </button>

              <button
                onClick={() => setActiveModalTab('calibration')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                  activeModalTab === 'calibration'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-400/50 shadow-sm'
                    : 'text-gray-400 hover:text-slate-200 hover:bg-[#1B1233]'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>{isTigrinya ? 'ምልክት ምንቕናቕ (Sensor)' : 'Shake Sensor'}</span>
              </button>

              <button
                onClick={() => setActiveModalTab('history')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                  activeModalTab === 'history'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-400/50 shadow-sm'
                    : 'text-gray-400 hover:text-slate-200 hover:bg-[#1B1233]'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>{isTigrinya ? 'ታሪኽ ጸብጻባት' : 'History'} ({pastReports.length})</span>
              </button>
            </div>

            {/* Real-time Hardware Telemetry Pill */}
            {telemetry && (
              <div className="hidden sm:flex items-center space-x-2 text-[10px] font-mono text-amber-200/80 bg-[#160E2A] px-2.5 py-1 rounded-lg border border-[#3C2D56]">
                <Activity className="w-3 h-3 text-emerald-400 shrink-0" />
                <span>Tab: <strong className="text-white">{telemetry.activeTab}</strong></span>
                <span className="text-gray-600">|</span>
                <span>Res: {telemetry.viewportSize}</span>
              </div>
            )}
          </div>

          {/* MAIN MODAL BODY */}
          <div className="p-5 overflow-y-auto flex-1 space-y-5">
            
            {/* SUCCESS VIEW */}
            {submittedReport ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-6 flex flex-col items-center text-center space-y-4"
              >
                <GoldCheckAnimation
                  size="lg"
                  title={isTigrinya ? 'ጸብጻብኩም ብዓወት ተላኢኹ!' : 'Bug Report Transmitted Successfully!'}
                  subtitle={
                    isTigrinya
                      ? 'ናይ ቴክኒክ ክፍልና ነቲ ዝተላእከ ሓበሬታ መርሚሩ ኣብ ሓጺር እዋን ምላሽ ክህበሉ እዩ።'
                      : 'Our sovereign engineering team and telemetry monitoring nodes have registered your ticket.'
                  }
                />

                {/* Ticket ID Box */}
                <div className="bg-[#140D26] border border-[#8E6D28]/40 rounded-2xl p-4 w-full max-w-md flex items-center justify-between shadow-inner">
                  <div className="text-left">
                    <span className="text-[10px] font-mono text-gray-400 uppercase block">Ticket Reference</span>
                    <span className="text-base font-mono font-bold text-amber-300">{submittedReport.ticketNumber}</span>
                  </div>

                  <button
                    onClick={() => handleCopyTicket(submittedReport.ticketNumber)}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 text-amber-300 text-xs font-mono font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
                  >
                    {copiedTicket ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedTicket ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                {/* Quick Action Buttons */}
                <div className="flex items-center space-x-3 pt-2">
                  <button
                    onClick={() => setSubmittedReport(null)}
                    className="px-4 py-2 rounded-xl bg-[#1C1433] hover:bg-[#281D45] border border-[#3C2D56] text-xs font-bold text-gray-200 transition-all cursor-pointer"
                  >
                    {isTigrinya ? 'ካልእ ጸብጻብ ላእኽ' : 'Submit Another Report'}
                  </button>

                  <button
                    onClick={onClose}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-bold transition-all shadow-md cursor-pointer"
                  >
                    {isTigrinya ? 'ዕጸው' : 'Done'}
                  </button>
                </div>
              </motion.div>
            ) : activeModalTab === 'report' ? (
              /* REPORT SUBMISSION FORM */
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* 1. Category Selector Grid */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#F3E5AB] flex items-center space-x-1.5">
                    <Layers className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isTigrinya ? 'ናይ ጸገም ዓውዲ / ምድብ ምረጹ' : 'Issue Category'}</span>
                  </label>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {BUG_CATEGORIES.map((cat) => {
                      const IconComp = cat.icon;
                      const isSelected = category === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setCategory(cat.id)}
                          className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-sm ring-1 ring-amber-400/40'
                              : 'bg-[#120B22] border-[#2A1E45] text-gray-400 hover:bg-[#1A1130] hover:text-slate-200'
                          }`}
                        >
                          <IconComp className={`w-4 h-4 mb-1.5 ${isSelected ? 'text-amber-300' : 'text-gray-400'}`} />
                          <div>
                            <span className="text-xs font-bold block leading-tight">
                              {isTigrinya ? cat.labelTi : cat.labelEn}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Severity Level Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#F3E5AB] flex items-center space-x-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isTigrinya ? 'ደረጃ ክብደት (Severity Level)' : 'Severity / Priority'}</span>
                  </label>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {SEVERITY_LEVELS.map((sev) => {
                      const isSelected = severity === sev.id;
                      return (
                        <button
                          key={sev.id}
                          type="button"
                          onClick={() => setSeverity(sev.id)}
                          className={`p-2 rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                            isSelected
                              ? `${sev.bg} ${sev.border} ${sev.color} ring-1 ring-amber-400/40 shadow-sm`
                              : 'bg-[#120B22] border-[#2A1E45] text-gray-400 hover:bg-[#1A1130]'
                          }`}
                        >
                          <span>{isTigrinya ? sev.labelTi : sev.labelEn}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Issue Title & Quick Tag Chips */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#F3E5AB] flex items-center justify-between">
                    <span>{isTigrinya ? 'ኣርእስቲ ጸገም' : 'Issue Summary / Title'}</span>
                    <span className="text-[10px] text-gray-400 font-normal">Required</span>
                  </label>

                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={
                      isTigrinya
                        ? 'ንኣብነት፡ ናይ ድምጺ ትርጉም ምስ ጀመርኩ ተቛሪጹ...'
                        : 'e.g. Speech synthesizer pauses mid-sentence in Tigrinya...'
                    }
                    className="w-full bg-[#120B22] border border-[#3C2D56] text-slate-100 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-amber-400 placeholder:text-gray-600 transition-colors shadow-inner"
                    id="bug-title-input"
                  />

                  {/* Quick Tag Chips */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="text-[10px] text-gray-500 font-mono">Quick:</span>
                    {QUICK_TAGS.slice(0, 4).map((tag, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setTitle(tag)}
                        className="px-2 py-0.5 rounded-lg bg-[#18102C] hover:bg-[#251842] border border-[#2D1F49] text-[10px] text-amber-300/80 hover:text-amber-200 transition-colors cursor-pointer"
                      >
                        +{tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Detailed Description */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#F3E5AB]">
                      {isTigrinya ? 'ዝርዝር መግለጺ' : 'Detailed Narrative & Steps to Reproduce'}
                    </label>

                    {/* Audio Dictation Simulator Button */}
                    <button
                      type="button"
                      onClick={() => setIsRecordingAudio(!isRecordingAudio)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center space-x-1 transition-all cursor-pointer ${
                        isRecordingAudio
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 animate-pulse'
                          : hasVoiceNote
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-[#18102C] text-amber-300 border border-[#2D1F49]'
                      }`}
                    >
                      <Mic className="w-3 h-3" />
                      <span>
                        {isRecordingAudio
                          ? `Recording (${audioDuration}s)...`
                          : hasVoiceNote
                          ? `Voice Note (${audioDuration}s) ✓`
                          : 'Record Voice Memo'}
                      </span>
                    </button>
                  </div>

                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={
                      isTigrinya
                        ? 'እንታይ እናገበርኩም እንከለኹም እዩ እዚ ጸገም ተፈጢሩ፧ ዝርዝር ሓበሬታ ጸሓፉ...'
                        : 'Describe what you were doing when the issue occurred, expected vs actual behavior...'
                    }
                    className="w-full bg-[#120B22] border border-[#3C2D56] text-slate-100 rounded-xl p-3 text-xs focus:outline-none focus:border-amber-400 placeholder:text-gray-600 transition-colors shadow-inner resize-none"
                    id="bug-desc-textarea"
                  />
                </div>

                {/* 5. Media Attachments & Instant Screenshot */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#F3E5AB] flex items-center space-x-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isTigrinya ? 'ምስልታት ወይ ሰነዳት ኣተሓሕዙ' : 'Attachments & Viewport Snapshot'}</span>
                    </label>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={handleCaptureInstantSnapshot}
                        disabled={isCapturingScreenshot}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 text-[11px] font-bold text-amber-300 transition-all flex items-center space-x-1 cursor-pointer"
                        title="Auto-capture current viewport snapshot"
                      >
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        <span>{isCapturingScreenshot ? 'Capturing...' : '+ Instant Snapshot'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2.5 py-1 rounded-lg bg-[#1A1130] hover:bg-[#261A45] border border-[#3C2D56] text-[11px] text-gray-300 transition-all flex items-center space-x-1 cursor-pointer"
                      >
                        <Upload className="w-3 h-3 text-gray-400" />
                        <span>Browse Files</span>
                      </button>
                    </div>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    multiple
                    accept="image/*,.pdf,.txt,.log"
                    className="hidden"
                  />

                  {/* Attachment Previews */}
                  {attachments.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      {attachments.map((file, idx) => (
                        <div
                          key={idx}
                          className="relative group bg-[#160E2A] border border-[#3C2D56] rounded-xl p-1.5 flex items-center space-x-2 pr-7 text-[11px] text-gray-300 shadow-sm"
                        >
                          {file.previewUrl ? (
                            <img src={file.previewUrl} alt={file.name} className="w-8 h-8 object-cover rounded-lg" />
                          ) : (
                            <FileText className="w-5 h-5 text-amber-400 ml-1" />
                          )}
                          <div className="truncate max-w-[120px]">
                            <span className="truncate block font-mono text-[10.5px]">{file.name}</span>
                            <span className="text-[9px] text-gray-500 font-mono">{(file.size / 1024).toFixed(0)} KB</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(idx)}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-rose-400 transition-colors p-1"
                            title="Remove file"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 6. Telemetry Drawer Inspector Accordion */}
                <div className="bg-[#100921] border border-[#2D1F49] rounded-2xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="include-telemetry-cb"
                        checked={includeTelemetry}
                        onChange={(e) => setIncludeTelemetry(e.target.checked)}
                        className="rounded border-[#3C2D56] text-amber-500 focus:ring-amber-400 bg-[#1A1130] w-4 h-4 cursor-pointer"
                      />
                      <label htmlFor="include-telemetry-cb" className="text-xs font-bold text-gray-300 cursor-pointer">
                        {isTigrinya ? 'ናይ መሳርሒ ቴክኒካዊ ሓበሬታ ሓውስ' : 'Attach device telemetry & sensor log'}
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowTelemetryDrawer(!showTelemetryDrawer)}
                      className="text-[11px] text-amber-300/90 hover:text-amber-200 flex items-center space-x-1 transition-colors cursor-pointer"
                    >
                      <span>{showTelemetryDrawer ? 'Hide Details' : 'Inspect JSON'}</span>
                      {showTelemetryDrawer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {showTelemetryDrawer && telemetry && (
                    <div className="mt-2 pt-2 border-t border-[#23173D] space-y-2">
                      <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono">
                        <span>Hardware Diagnostics Payload</span>
                        <button
                          type="button"
                          onClick={handleCopyTelemetry}
                          className="text-amber-300 hover:text-amber-200 flex items-center space-x-1 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{copiedTelemetry ? 'Copied!' : 'Copy JSON'}</span>
                        </button>
                      </div>

                      <pre className="bg-[#080411] p-2.5 rounded-xl text-[10px] font-mono text-emerald-300/90 overflow-x-auto max-h-32 border border-[#1E1436]">
                        {JSON.stringify(telemetry, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>

                {/* 7. Submit Action Button */}
                <div className="pt-2 flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl bg-[#170F2C] hover:bg-[#231742] border border-[#3C2D56] text-xs font-bold text-gray-300 transition-all cursor-pointer"
                  >
                    {isTigrinya ? 'ሰርዝ' : 'Cancel'}
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting || !title.trim()}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-[#FFF4B8] to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-black transition-all shadow-[0_0_20px_rgba(212,175,55,0.4)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 cursor-pointer"
                    id="submit-bug-report-btn"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Transmitting...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>{isTigrinya ? 'ጸብጻብ ላእኽ' : 'Submit Sovereign Bug Report'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : activeModalTab === 'calibration' ? (
              /* SENSOR CALIBRATION & SHAKE SIMULATION TAB */
              <div className="space-y-5 py-2">
                <div className="text-center space-y-1">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-400/40 text-amber-300 mx-auto flex items-center justify-center mb-2">
                    <Vibrate className="w-6 h-6 animate-pulse" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-100 font-serif">
                    {isTigrinya ? 'ናይ ምንቕናቕ ሴንሰር ቅጥዒ (Accelerometer Calibration)' : 'Device Accelerometer & Shake Sensitivity'}
                  </h3>
                  <p className="text-xs text-gray-400 max-w-md mx-auto">
                    {isTigrinya
                      ? 'ሞባይልኩም ምስ ዘነቕንቕዎ ጸብጻብ ጸገም ክኽፈት ዘኽእል ናይ ሴንሰር ቅጥዕታት።'
                      : 'Configure the threshold required to trigger bug reporting when shaking your mobile device.'}
                  </p>
                </div>

                {/* Real-time Acceleration Readouts */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-[#120B22] border border-[#2D1F49] rounded-2xl p-3 text-center">
                    <span className="text-[10px] font-mono text-gray-500 uppercase block">Axis X (Lateral)</span>
                    <span className="text-sm font-mono font-bold text-amber-300">
                      {sensorSample?.x ? `${sensorSample.x.toFixed(1)} m/s²` : '0.0 m/s²'}
                    </span>
                  </div>

                  <div className="bg-[#120B22] border border-[#2D1F49] rounded-2xl p-3 text-center">
                    <span className="text-[10px] font-mono text-gray-500 uppercase block">Axis Y (Vertical)</span>
                    <span className="text-sm font-mono font-bold text-amber-300">
                      {sensorSample?.y ? `${sensorSample.y.toFixed(1)} m/s²` : '9.8 m/s²'}
                    </span>
                  </div>

                  <div className="bg-[#120B22] border border-[#2D1F49] rounded-2xl p-3 text-center">
                    <span className="text-[10px] font-mono text-gray-500 uppercase block">Axis Z (Depth)</span>
                    <span className="text-sm font-mono font-bold text-amber-300">
                      {sensorSample?.z ? `${sensorSample.z.toFixed(1)} m/s²` : '0.0 m/s²'}
                    </span>
                  </div>
                </div>

                {/* Sensitivity Slider */}
                <div className="bg-[#100921] border border-[#2D1F49] rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-200">Shake Trigger Threshold:</span>
                    <span className="font-mono font-bold text-amber-300">{shakeSensitivity} Δm/s²</span>
                  </div>

                  <input
                    type="range"
                    min={10}
                    max={40}
                    step={1}
                    value={shakeSensitivity}
                    onChange={(e) => onUpdateSensitivity && onUpdateSensitivity(Number(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />

                  <div className="flex justify-between text-[10px] font-mono text-gray-500">
                    <span>Sensitive (Light Shake: 10)</span>
                    <span>Standard (20)</span>
                    <span>Firm (Hard Shake: 40)</span>
                  </div>
                </div>

                {/* Simulation Trigger Button */}
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      if (onSimulateShake) onSimulateShake();
                      setActiveModalTab('report');
                    }}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-purple-500/20 hover:from-amber-500/30 hover:to-purple-500/30 border border-amber-400/50 text-amber-300 text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 mx-auto shadow-md"
                  >
                    <Smartphone className="w-4 h-4 text-amber-300 animate-bounce" />
                    <span>⚡ Simulate Phone Shake Gesture (Test)</span>
                  </button>
                </div>
              </div>
            ) : (
              /* HISTORY TAB */
              <div className="space-y-3 py-1">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-xs font-bold text-[#F3E5AB]">
                    Submitted Sovereign Bug Reports ({pastReports.length})
                  </span>

                  {pastReports.length > 0 && (
                    <button
                      onClick={handleExportAllReports}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 text-amber-300 text-[11px] font-mono font-bold transition-all flex items-center space-x-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      <span>Export JSON</span>
                    </button>
                  )}
                </div>

                {pastReports.length === 0 ? (
                  <div className="py-12 text-center text-gray-500 text-xs">
                    <Info className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                    <p>No previous bug reports recorded on this device yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                    {pastReports.map((report) => (
                      <div
                        key={report.id}
                        className="bg-[#120B22] border border-[#2D1F49] rounded-2xl p-3.5 space-y-1.5 hover:border-amber-400/40 transition-colors"
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-mono font-bold text-amber-300">{report.ticketNumber}</span>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9.5px] font-mono font-bold uppercase">
                              {report.status}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[9px] font-mono uppercase">
                              {report.category}
                            </span>
                          </div>

                          <span className="text-[10px] text-gray-500 font-mono flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(report.timestamp).toLocaleDateString()}</span>
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-slate-100">{report.title}</h4>
                        <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed">{report.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>

          {/* FOOTER */}
          <div className="px-5 py-2.5 border-t border-[#211638] bg-[#0E091D] flex items-center justify-between text-[10.5px] text-gray-400 font-mono">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Shake Sensor Active</span>
            </div>

            <span className="text-gray-500">Axumite Sovereign Bug Engine v5</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
