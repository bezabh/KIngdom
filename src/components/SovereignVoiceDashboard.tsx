import React, { useMemo, useState } from 'react';
import {
  Activity,
  AudioWaveform,
  BookOpen,
  BookmarkPlus,
  Check,
  Cloud,
  Copy,
  Download,
  Globe,
  History,
  Search,
  Sparkles,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { RealtimeAudioWaveform } from './RealtimeAudioWaveform';
import { ALL_INTERNATIONAL_LANGUAGES } from '../utils/languages';
import { SavedItem } from '../types';
import { VoiceTranslationLogRecord } from '../services/voiceHistoryService';

interface SovereignVoiceDashboardProps {
  analyserNode: AnalyserNode | null;
  audioLevel: number;
  audioFrequencies: number[];
  phase: 'idle' | 'listening' | 'translating' | 'speaking';
  isLoopRunning: boolean;
  activeSpeaker: 'A' | 'B';
  primaryLanguage: string;
  partnerLanguage: string;
  liveCaption: string;
  statusMessage: string;
  logs: VoiceTranslationLogRecord[];
  playingTurnId: string | null;
  isCloudSynced?: boolean;
  onReplayTurn: (turn: VoiceTranslationLogRecord) => void;
  onStopPlayback: () => void;
  onInspectTurn: (turn: VoiceTranslationLogRecord) => void;
  onSaveInsight: (item: Omit<SavedItem, 'id' | 'createdAt'>) => void;
  onDeleteLog: (id: string) => void;
  onClearHistory: () => void;
}

function getLangFlag(languageName: string): string {
  const found = ALL_INTERNATIONAL_LANGUAGES.find(
    (l) => l.name.toLowerCase() === languageName.toLowerCase()
  );
  return found?.flag || '🌐';
}

export const SovereignVoiceDashboard: React.FC<SovereignVoiceDashboardProps> = ({
  analyserNode,
  audioLevel,
  audioFrequencies,
  phase,
  isLoopRunning,
  activeSpeaker,
  primaryLanguage,
  partnerLanguage,
  liveCaption,
  statusMessage,
  logs,
  playingTurnId,
  isCloudSynced = false,
  onReplayTurn,
  onStopPlayback,
  onInspectTurn,
  onSaveInsight,
  onDeleteLog,
  onClearHistory,
}) => {
  const [selectedPairFilter, setSelectedPairFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'split' | 'waveform' | 'logs'>('split');

  // Compute pair filters & per-language stats from history logs
  const { pairOptions, languageCounts, avgLatencyMs } = useMemo(() => {
    const pairs = new Set<string>();
    const counts = new Map<string, number>();
    let latencySum = 0;
    let latencyCount = 0;

    for (const log of logs) {
      pairs.add(`${log.sourceLanguage} ➔ ${log.targetLanguage}`);
      counts.set(log.sourceLanguage, (counts.get(log.sourceLanguage) || 0) + 1);
      counts.set(log.targetLanguage, (counts.get(log.targetLanguage) || 0) + 1);
      if (typeof log.latencyMs === 'number' && log.latencyMs > 0) {
        latencySum += log.latencyMs;
        latencyCount += 1;
      }
    }

    return {
      pairOptions: Array.from(pairs),
      languageCounts: Array.from(counts.entries()).sort((a, b) => b[1] - a[1]),
      avgLatencyMs: latencyCount > 0 ? Math.round(latencySum / latencyCount) : null,
    };
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return logs.filter((log) => {
      const pairKey = `${log.sourceLanguage} ➔ ${log.targetLanguage}`;
      if (selectedPairFilter !== 'ALL' && pairKey !== selectedPairFilter) {
        return false;
      }
      if (!q) return true;
      return (
        log.sourceTranscript.toLowerCase().includes(q) ||
        log.translatedText.toLowerCase().includes(q) ||
        log.transliteration.toLowerCase().includes(q) ||
        log.sourceLanguage.toLowerCase().includes(q) ||
        log.targetLanguage.toLowerCase().includes(q)
      );
    });
  }, [logs, selectedPairFilter, searchQuery]);

  // 16-band spectrum equalizer heights derived cleanly from live audioFrequencies + audioLevel
  const spectrumBands = useMemo(() => {
    const base = Array.from({ length: 16 }, (_, idx) => {
      if (phase === 'listening' && audioFrequencies.length > 0) {
        const freqVal = audioFrequencies[idx % audioFrequencies.length] || 0;
        const levelBoost = Math.round(audioLevel * 45);
        return Math.max(12, Math.min(100, Math.round((freqVal / 255) * 85) + levelBoost));
      }
      if (phase === 'speaking') {
        return 28 + Math.round(Math.abs(Math.sin(idx * 0.75 + 1.1)) * 58);
      }
      if (phase === 'translating') {
        return 22 + Math.round(Math.abs(Math.cos(idx * 0.6)) * 38);
      }
      return 10 + ((idx * 7) % 18);
    });
    return base;
  }, [phase, audioFrequencies, audioLevel]);

  const handleCopy = (log: VoiceTranslationLogRecord) => {
    navigator.clipboard.writeText(
      `[${log.sourceLanguage} ➔ ${log.targetLanguage}] ${log.sourceTranscript}\n${log.translatedText}${
        log.transliteration ? `\nPhonetic: ${log.transliteration}` : ''
      }`
    );
    setCopiedId(log.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleExportLogs = () => {
    if (filteredLogs.length === 0) return;
    const textBody = filteredLogs
      .map(
        (l, i) =>
          `${i + 1}. [${l.timestamp}] ${l.sourceLanguage} -> ${l.targetLanguage}\n` +
          `   Spoken: ${l.sourceTranscript}\n` +
          `   Translated: ${l.translatedText}\n` +
          (l.transliteration ? `   Phonetic: ${l.transliteration}\n` : '') +
          (l.culturalContext ? `   Notes: ${l.culturalContext}\n` : '')
      )
      .join('\n');
    const blob = new Blob([`AXUMITE SOVEREIGN VOICE TRANSLATION LOGS\n\n${textBody}`], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `axumite-voice-logs-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const activeDirectionLabel =
    activeSpeaker === 'A'
      ? `${primaryLanguage} ➔ ${partnerLanguage}`
      : `${partnerLanguage} ➔ ${primaryLanguage}`;

  return (
    <div className="bg-[#06070B] border border-[#D4AF37]/30 rounded-2xl p-3.5 sm:p-4 space-y-3.5 shadow-inner">
      {/* Sovereign Voice Dashboard Top Telemetry Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#D4AF37]/15">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#8E6D28]/35 to-[#D4AF37]/20 border border-[#D4AF37]/45 flex items-center justify-center text-[#FFF3B0]">
            <AudioWaveform className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#F3E5AB]">
                Sovereign Voice Dashboard
              </h4>
              <span
                className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                  phase === 'listening'
                    ? 'bg-amber-500/20 border-amber-400/50 text-amber-300 animate-pulse'
                    : phase === 'speaking'
                    ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                    : phase === 'translating'
                    ? 'bg-sky-500/20 border-sky-400/50 text-sky-300'
                    : 'bg-[#12131A] border-[#D4AF37]/30 text-[#D4AF37]'
                }`}
              >
                {phase === 'idle' ? 'STANDBY' : phase.toUpperCase()}
              </span>
            </div>
            <p className="text-[10px] text-gray-400">
              Active Route: <span className="text-[#F3E5AB] font-semibold">{activeDirectionLabel}</span>
              {avgLatencyMs !== null && (
                <span className="ml-2 text-emerald-400 font-mono">• Avg { (avgLatencyMs / 1000).toFixed(1) }s</span>
              )}
            </p>
          </div>
        </div>

        {/* View Mode Switcher & Sync Badge */}
        <div className="flex items-center space-x-1.5">
          <span
            className={`hidden sm:inline-flex items-center space-x-1 px-2 py-1 rounded-lg text-[9px] font-bold border ${
              isCloudSynced
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-[#101118] border-gray-700 text-gray-400'
            }`}
            title={isCloudSynced ? 'Synced with Firestore database' : 'Saved locally in browser session'}
          >
            <Cloud className="w-3 h-3" />
            <span>{isCloudSynced ? 'Firestore Sync' : 'Local Log'}</span>
          </span>

          <div className="inline-flex rounded-xl bg-[#0D0E14] p-0.5 border border-[#8E6D28]/25 text-[10px] font-bold">
            {(['split', 'waveform', 'logs'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setActiveView(mode)}
                className={`px-2.5 py-1 rounded-lg uppercase tracking-wider transition-all cursor-pointer ${
                  activeView === mode
                    ? 'bg-gradient-to-r from-[#8E6D28] to-[#D4AF37] text-black'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {mode === 'split' ? 'All' : mode === 'waveform' ? 'Waveform' : `Logs (${logs.length})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 1: VISUAL WAVEFORM DISPLAY */}
      {activeView !== 'logs' && (
        <div className="space-y-2.5">
          <RealtimeAudioWaveform
            analyserNode={analyserNode}
            audioLevel={audioLevel}
            isListening={phase === 'listening'}
            statusState={phase === 'translating' ? 'processing' : phase}
            audioFrequencies={audioFrequencies}
            height={72}
          />

          {/* 16-Band Acoustic Spectrum Equalizer & Live Caption Strip */}
          <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-2.5 items-center bg-[#090A10] border border-[#D4AF37]/20 rounded-xl p-2.5">
            {/* Multi-band Spectrum Bars */}
            <div className="flex items-end justify-between h-9 px-2 bg-black/50 rounded-lg border border-[#D4AF37]/15">
              {spectrumBands.map((pct, i) => (
                <div
                  key={i}
                  className={`w-1.5 rounded-t-sm transition-all duration-100 ${
                    phase === 'listening'
                      ? 'bg-gradient-to-t from-[#8E6D28] via-amber-400 to-[#FFF3B0]'
                      : phase === 'speaking'
                      ? 'bg-gradient-to-t from-emerald-700 via-emerald-400 to-teal-200'
                      : phase === 'translating'
                      ? 'bg-gradient-to-t from-sky-700 via-sky-400 to-cyan-200'
                      : 'bg-[#D4AF37]/30'
                  }`}
                  style={{ height: `${pct}%` }}
                />
              ))}
            </div>

            {/* Live Acoustic Status & Streaming Speech Preview */}
            <div className="min-w-0 flex items-center justify-between gap-2 px-1">
              <div className="min-w-0">
                <div className="flex items-center space-x-1.5 text-[10px] font-mono text-[#C5A059] uppercase">
                  <Activity className={`w-3 h-3 ${isLoopRunning ? 'text-emerald-400 animate-pulse' : ''}`} />
                  <span className="truncate">{statusMessage}</span>
                </div>
                {liveCaption ? (
                  <p className="text-xs font-ethiopic text-[#FFF3B0] font-semibold mt-0.5 truncate">
                    “{liveCaption}”
                  </p>
                ) : (
                  <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                    {isLoopRunning
                      ? `Microphone armed for ${activeSpeaker === 'A' ? primaryLanguage : partnerLanguage}`
                      : 'Acoustic oscilloscope ready — start Voice Loop or send a phrase'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: LANGUAGE HISTORY LOGS */}
      {activeView !== 'waveform' && (
        <div className="space-y-2.5 pt-1">
          {/* History Header & Summary Stats */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <History className="w-3.5 h-3.5 text-[#C5A059]" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#C5A059]">
                Language History Logs ({filteredLogs.length}/{logs.length})
              </span>
            </div>

            {logs.length > 0 && (
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={handleExportLogs}
                  className="px-2 py-1 rounded-lg bg-[#101118] hover:bg-[#191B26] border border-[#8E6D28]/35 text-[10px] font-bold text-[#F3E5AB] flex items-center space-x-1 cursor-pointer"
                  title="Export filtered voice logs as text"
                >
                  <Download className="w-3 h-3" />
                  <span>Export</span>
                </button>
                <button
                  type="button"
                  onClick={onClearHistory}
                  className="px-2 py-1 rounded-lg bg-[#101118] hover:bg-rose-950/50 border border-rose-500/30 text-[10px] font-bold text-rose-300 flex items-center space-x-1 cursor-pointer"
                  title="Clear all saved voice translation logs"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              </div>
            )}
          </div>

          {/* Language Distribution Pills */}
          {languageCounts.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <Globe className="w-3 h-3 text-gray-500 mr-0.5" />
              {languageCounts.map(([lang, count]) => (
                <span
                  key={lang}
                  className="px-2 py-0.5 rounded-lg bg-[#0D0E14] border border-[#8E6D28]/25 text-[10px] text-gray-300 font-medium"
                >
                  {getLangFlag(lang)} {lang}: <strong className="text-[#F3E5AB]">{count}</strong>
                </span>
              ))}
            </div>
          )}

          {/* Filter & Search Bar */}
          {logs.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search transcripts, translations, or phonetics..."
                  className="w-full bg-[#090A0F] border border-[#8E6D28]/25 focus:border-[#D4AF37] rounded-xl pl-8 pr-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none"
                />
              </div>

              {pairOptions.length > 1 && (
                <select
                  value={selectedPairFilter}
                  onChange={(e) => setSelectedPairFilter(e.target.value)}
                  className="bg-[#090A0F] border border-[#8E6D28]/25 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none"
                >
                  <option value="ALL">All Language Pairs ({logs.length})</option>
                  {pairOptions.map((pair) => (
                    <option key={pair} value={pair}>
                      {pair}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Log Feed */}
          {filteredLogs.length === 0 ? (
            <div className="py-6 px-4 text-center rounded-2xl bg-[#090A0F] border border-dashed border-[#8E6D28]/25 space-y-1">
              <Sparkles className="w-5 h-5 text-[#C5A059]/70 mx-auto" />
              <p className="text-xs text-gray-300 font-medium">
                {logs.length === 0
                  ? 'No voice translation history logs yet.'
                  : 'No logs match your current search or language filter.'}
              </p>
              <p className="text-[11px] text-gray-500">
                Start the Live Voice Translation Loop above to record spoken Tigrinya ⇄ multilingual exchanges.
              </p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {filteredLogs.map((log) => {
                const isPrimary = log.speaker === 'A';
                const isPlayingThis = playingTurnId === log.id;
                return (
                  <div
                    key={log.id}
                    className={`p-3 rounded-2xl border space-y-1.5 transition-colors ${
                      isPrimary
                        ? 'bg-[#100E09]/95 border-[#C5A059]/35'
                        : 'bg-[#090D15]/95 border-sky-500/30'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[10px]">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`font-bold uppercase tracking-wider ${
                            isPrimary ? 'text-[#E1C47D]' : 'text-sky-300'
                          }`}
                        >
                          {getLangFlag(log.sourceLanguage)} {log.sourceLanguage} ➔{' '}
                          {getLangFlag(log.targetLanguage)} {log.targetLanguage}
                        </span>
                        {typeof log.latencyMs === 'number' && log.latencyMs > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-mono text-[9px]">
                            {(log.latencyMs / 1000).toFixed(1)}s
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-1">
                        <span className="text-gray-500 font-mono mr-1">{log.timestamp}</span>

                        <button
                          type="button"
                          onClick={() =>
                            isPlayingThis ? onStopPlayback() : onReplayTurn(log)
                          }
                          className="p-1 rounded-lg bg-black/45 hover:bg-black/80 text-[#F3E5AB] border border-[#8E6D28]/30 cursor-pointer"
                          title={isPlayingThis ? 'Stop audio' : 'Replay translated audio'}
                        >
                          {isPlayingThis ? (
                            <VolumeX className="w-3 h-3 text-rose-400" />
                          ) : (
                            <Volume2 className="w-3 h-3" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => onInspectTurn(log)}
                          className="p-1 rounded-lg bg-black/45 hover:bg-black/80 text-amber-300 border border-[#8E6D28]/30 cursor-pointer"
                          title="Load into Fidel Breakdown panel below"
                        >
                          <BookOpen className="w-3 h-3" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopy(log)}
                          className="p-1 rounded-lg bg-black/45 hover:bg-black/80 text-gray-300 border border-white/10 cursor-pointer"
                          title="Copy log entry"
                        >
                          {copiedId === log.id ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            onSaveInsight({
                              title: `Voice Log [${log.sourceLanguage}➔${log.targetLanguage}]: ${log.translatedText.slice(
                                0,
                                28
                              )}`,
                              type: 'translation',
                              content: `${log.sourceTranscript}\n➔ ${log.translatedText}`,
                              tags: ['voice-dashboard', log.sourceLanguage, log.targetLanguage],
                              metadata: log,
                            })
                          }
                          className="p-1 rounded-lg bg-black/45 hover:bg-black/80 text-[#C5A059] border border-[#8E6D28]/30 cursor-pointer"
                          title="Save to Saved Insights"
                        >
                          <BookmarkPlus className="w-3 h-3" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onDeleteLog(log.id)}
                          className="p-1 rounded-lg bg-black/45 hover:bg-rose-950/70 text-gray-400 hover:text-rose-300 border border-white/10 cursor-pointer"
                          title="Delete log entry"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-gray-300 font-ethiopic leading-snug">
                      “{log.sourceTranscript}”
                    </p>
                    <p className="text-sm font-bold text-[#FFF3B0] font-ethiopic leading-relaxed">
                      {log.translatedText}
                    </p>
                    {log.transliteration && (
                      <p className="text-[11px] text-gray-400 font-mono italic">
                        Phonetic: {log.transliteration}
                      </p>
                    )}
                    {log.culturalContext && (
                      <p className="text-[10.5px] text-gray-400/90 pt-0.5 border-t border-white/5">
                        {log.culturalContext}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
