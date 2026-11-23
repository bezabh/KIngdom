import React, { useEffect, useRef, useState } from 'react';
import { Activity, Mic, Volume2, Waves } from 'lucide-react';

interface RealtimeAudioWaveformProps {
  analyserNode: AnalyserNode | null;
  audioLevel: number;
  isListening: boolean;
  statusState: 'idle' | 'listening' | 'processing' | 'speaking';
  audioFrequencies?: number[];
  className?: string;
  height?: number;
  showDecibelMeter?: boolean;
}

export const RealtimeAudioWaveform: React.FC<RealtimeAudioWaveformProps> = ({
  analyserNode,
  audioLevel,
  isListening,
  statusState,
  audioFrequencies = [],
  className = '',
  height = 72,
  showDecibelMeter = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const [liveDb, setLiveDb] = useState<number>(-48);
  const [peakPercentage, setPeakPercentage] = useState<number>(0);
  const phaseRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let timeDataArray: Uint8Array | null = null;
    if (analyserNode) {
      analyserNode.fftSize = 256;
      timeDataArray = new Uint8Array(analyserNode.fftSize);
    }

    const render = () => {
      phaseRef.current += 0.05;
      const width = canvas.width;
      const canvasHeight = canvas.height;

      ctx.clearRect(0, 0, width, canvasHeight);

      // Background Subtle Ambient Grid
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      // Center baseline
      ctx.moveTo(0, canvasHeight / 2);
      ctx.lineTo(width, canvasHeight / 2);
      // Horizontal guides
      ctx.moveTo(0, canvasHeight * 0.25);
      ctx.lineTo(width, canvasHeight * 0.25);
      ctx.moveTo(0, canvasHeight * 0.75);
      ctx.lineTo(width, canvasHeight * 0.75);
      ctx.stroke();

      let currentPeak = 0;
      let rmsSum = 0;

      if (analyserNode && timeDataArray && isListening) {
        analyserNode.getByteTimeDomainData(timeDataArray);

        // Calculate amplitude & RMS
        for (let i = 0; i < timeDataArray.length; i++) {
          const norm = (timeDataArray[i] - 128) / 128;
          const absVal = Math.abs(norm);
          if (absVal > currentPeak) currentPeak = absVal;
          rmsSum += norm * norm;
        }

        const rms = Math.sqrt(rmsSum / timeDataArray.length);
        const calculatedDb = Math.max(-60, Math.min(0, Math.round(20 * Math.log10(Math.max(0.001, rms)))));
        setLiveDb(calculatedDb);
        setPeakPercentage(Math.min(100, Math.round(currentPeak * 140)));

        // Draw primary live oscilloscope waveform
        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, 'rgba(212, 175, 55, 0.3)');
        gradient.addColorStop(0.3, '#FFF3B0');
        gradient.addColorStop(0.5, '#F59E0B');
        gradient.addColorStop(0.7, '#D4AF37');
        gradient.addColorStop(1, 'rgba(212, 175, 55, 0.3)');

        const fillGradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
        fillGradient.addColorStop(0, 'rgba(245, 158, 11, 0.18)');
        fillGradient.addColorStop(0.5, 'rgba(212, 175, 55, 0.06)');
        fillGradient.addColorStop(1, 'transparent');

        // Draw Area Fill Under Curve
        ctx.beginPath();
        ctx.moveTo(0, canvasHeight / 2);

        const sliceWidth = width / (timeDataArray.length - 1);
        let x = 0;

        for (let i = 0; i < timeDataArray.length; i++) {
          const v = timeDataArray[i] / 128.0;
          // Apply dynamic boost to quiet speech
          const amplifiedOffset = (v - 1.0) * 1.8;
          const y = (amplifiedOffset * canvasHeight) / 2 + canvasHeight / 2;

          if (i === 0) {
            ctx.lineTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }

        ctx.lineTo(width, canvasHeight / 2);
        ctx.closePath();
        ctx.fillStyle = fillGradient;
        ctx.fill();

        // Draw High-Contrast Waveform Stroke
        ctx.beginPath();
        x = 0;
        for (let i = 0; i < timeDataArray.length; i++) {
          const v = timeDataArray[i] / 128.0;
          const amplifiedOffset = (v - 1.0) * 1.8;
          const y = (amplifiedOffset * canvasHeight) / 2 + canvasHeight / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }

        ctx.strokeStyle = gradient;
        ctx.lineWidth = Math.max(1.5, Math.min(3.5, 2 + currentPeak * 2.5));
        ctx.shadowColor = '#F59E0B';
        ctx.shadowBlur = Math.min(16, 6 + currentPeak * 14);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Draw Secondary Mirrored Harmonic Echo
        ctx.beginPath();
        x = 0;
        for (let i = 0; i < timeDataArray.length; i += 2) {
          const v = timeDataArray[i] / 128.0;
          const invertedOffset = -(v - 1.0) * 0.9;
          const y = (invertedOffset * canvasHeight) / 2 + canvasHeight / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth * 2;
        }
        ctx.strokeStyle = 'rgba(255, 243, 176, 0.35)';
        ctx.lineWidth = 1;
        ctx.stroke();

      } else {
        // Organic Dynamic Wave for Speaking, Processing, or Idle
        const isSpeakingMode = statusState === 'speaking';
        const isProcessingMode = statusState === 'processing';
        
        const waveColor = isSpeakingMode 
          ? '#10B981' 
          : isProcessingMode 
          ? '#38BDF8' 
          : '#D4AF37';

        const waveGlow = isSpeakingMode 
          ? 'rgba(16, 185, 129, 0.4)' 
          : isProcessingMode 
          ? 'rgba(56, 189, 248, 0.4)' 
          : 'rgba(212, 175, 55, 0.2)';

        const baseAmp = isSpeakingMode ? 14 : isProcessingMode ? 8 : 4;
        const amp = baseAmp + (audioLevel > 0 ? audioLevel * 18 : 0);

        setLiveDb(isSpeakingMode ? -16 : isProcessingMode ? -28 : -54);
        setPeakPercentage(isSpeakingMode ? 65 : isProcessingMode ? 40 : 8);

        // Draw Simulated Harmonic Sine Waves
        ctx.beginPath();
        ctx.moveTo(0, canvasHeight / 2);

        for (let px = 0; px <= width; px += 2) {
          const normX = px / width;
          const sine1 = Math.sin(normX * Math.PI * 4 + phaseRef.current * (isSpeakingMode ? 2.5 : 1.2));
          const sine2 = Math.sin(normX * Math.PI * 8 - phaseRef.current * 1.8) * 0.4;
          const windowFunc = Math.sin(normX * Math.PI); // Taper edges
          const y = canvasHeight / 2 + (sine1 + sine2) * amp * windowFunc;

          ctx.lineTo(px, y);
        }

        ctx.strokeStyle = waveColor;
        ctx.lineWidth = isSpeakingMode ? 2.5 : 1.5;
        ctx.shadowColor = waveGlow;
        ctx.shadowBlur = isSpeakingMode ? 12 : 6;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Mirrored Subtle Wave
        ctx.beginPath();
        ctx.moveTo(0, canvasHeight / 2);
        for (let px = 0; px <= width; px += 4) {
          const normX = px / width;
          const sine = Math.cos(normX * Math.PI * 5 + phaseRef.current * 1.5);
          const windowFunc = Math.sin(normX * Math.PI);
          const y = canvasHeight / 2 - sine * (amp * 0.55) * windowFunc;
          ctx.lineTo(px, y);
        }
        ctx.strokeStyle = `${waveColor}44`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [analyserNode, isListening, statusState, audioLevel]);

  // Adjust canvas pixel resolution to container width
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(280, Math.floor(rect.width * dpr));
      canvas.height = Math.max(48, Math.floor(height * dpr));
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [height]);

  return (
    <div className={`w-full rounded-2xl bg-[#090B12]/90 border border-[#D4AF37]/35 p-3 backdrop-blur-md shadow-[0_8px_24px_rgba(0,0,0,0.6)] ${className}`}>
      {/* Top Telemetry & Status Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#D4AF37]/15 text-[9px] font-mono">
        <div className="flex items-center space-x-2">
          <span className="flex items-center space-x-1 text-[#FFF3B0]">
            <Waves className={`w-3.5 h-3.5 ${isListening ? 'text-amber-400 animate-pulse' : statusState === 'speaking' ? 'text-emerald-400' : 'text-[#D4AF37]'}`} />
            <span className="font-bold tracking-wider uppercase">
              {isListening ? 'LIVE ACOUSTIC OSCILLOSCOPE' : statusState === 'speaking' ? 'AUDIO SYNTHESIS WAVE' : statusState === 'processing' ? 'NEURAL COMPUTE WAVE' : 'ACOUSTIC STANDBY'}
            </span>
          </span>
          {isListening && peakPercentage > 15 && (
            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 text-[8px] animate-pulse">
              VOICE DETECTED
            </span>
          )}
        </div>

        {showDecibelMeter && (
          <div className="flex items-center space-x-2 text-slate-400">
            <span className="flex items-center space-x-1">
              <span className="text-[8px] text-slate-500">LEVEL:</span>
              <span className={`font-bold ${isListening && peakPercentage > 20 ? 'text-amber-300' : 'text-slate-300'}`}>
                {peakPercentage}%
              </span>
            </span>
            <span>&bull;</span>
            <span className="flex items-center space-x-1">
              <span className="text-[8px] text-slate-500">dB:</span>
              <span className="text-slate-300 font-bold">{liveDb} dB</span>
            </span>
          </div>
        )}
      </div>

      {/* Main Canvas Waveform */}
      <div className="relative w-full my-1.5 flex items-center justify-center overflow-hidden rounded-lg bg-black/40">
        <canvas
          ref={canvasRef}
          className="w-full h-full block"
          style={{ height: `${height}px` }}
        />

        {/* Real-time Frequency Peak Meter overlay */}
        {isListening && (
          <div className="absolute right-2 top-2 bottom-2 flex items-center space-x-0.5 pointer-events-none">
            {audioFrequencies.slice(0, 5).map((f, idx) => (
              <div
                key={idx}
                className="w-1 bg-gradient-to-t from-[#D4AF37]/40 via-amber-400 to-[#FFF3B0] rounded-full transition-all duration-75"
                style={{ height: `${Math.max(4, Math.min(100, f * 0.45))}%` }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom Meter Bar */}
      <div className="flex items-center justify-between pt-1.5 text-[8px] font-mono text-[#D4AF37]/70">
        <div className="flex items-center space-x-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
          <span>20 Hz — 20 kHz SPECTRUM</span>
        </div>

        {/* Multi-Segment Volume VU LED Meter */}
        <div className="flex items-center space-x-0.5">
          {Array.from({ length: 12 }).map((_, idx) => {
            const threshold = (idx + 1) * (100 / 12);
            const isLit = peakPercentage >= threshold;
            const isHigh = idx >= 9;
            const isMid = idx >= 6 && idx < 9;

            return (
              <div
                key={idx}
                className={`w-1.5 h-2 rounded-xs transition-colors duration-75 ${
                  isLit
                    ? isHigh
                      ? 'bg-rose-500 shadow-[0_0_6px_#F43F5E]'
                      : isMid
                      ? 'bg-amber-400 shadow-[0_0_5px_#FBBF24]'
                      : 'bg-emerald-400 shadow-[0_0_4px_#34D399]'
                    : 'bg-slate-800/80'
                }`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
