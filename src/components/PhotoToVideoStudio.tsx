import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Film,
  Upload,
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  Download,
  BookmarkCheck,
  Share2,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Sliders,
  Music,
  Volume2,
  VolumeX,
  Camera,
  Layers,
  Wand2,
  Clock,
  Maximize2,
  CheckCircle2,
  AlertCircle,
  X,
  ImagePlus,
  Loader2,
  Info,
} from 'lucide-react';
import { SavedItem, UserProfile } from '../types';
import {
  AtmosphereEffect,
  CameraMovement,
  ChoreographyPlan,
  GeneratedVideoArtifact,
  SoundtrackStyle,
  StudioPhotoItem,
  SubjectAnimationMode,
  TransitionStyle,
  VideoAspectRatio,
  VideoDurationOption,
  VideoQualityOption,
  VideoStudioConfig,
  buildDeterministicChoreography,
  choreographPhotosWithAI,
  drawStudioFrameAtTime,
  enhanceAnimationPromptWithAI,
  fileToStudioPhoto,
  loadHtmlImage,
  renderPhotoToVideo,
} from '../services/photoToVideoEngine';
import axumObeliskImg from '../assets/images/axum_obelisk_heritage_1787779428688.jpg';
import meteraStelaImg from '../assets/images/metera_stela_eritrea_1787779442994.jpg';
import yehaTempleImg from '../assets/images/yeha_temple_tigray_1787779457118.jpg';
import qohaitoRuinsImg from '../assets/images/qohaito_ruins_eritrea_1787779484560.jpg';

interface PhotoToVideoStudioProps {
  user?: UserProfile;
  onSaveInsight?: (item: Omit<SavedItem, 'id' | 'createdAt'>) => void;
  onOpenAuthModal?: () => void;
}

const SAMPLE_PRESETS = [
  { label: 'Axum Obelisk', src: axumObeliskImg },
  { label: 'Metera Stela', src: meteraStelaImg },
  { label: 'Yeha Temple', src: yehaTempleImg },
  { label: 'Qohaito Plateau', src: qohaitoRuinsImg },
];

const DURATION_OPTIONS: VideoDurationOption[] = [5, 10, 15, 30];
const ASPECT_OPTIONS: { value: VideoAspectRatio; label: string; hint: string }[] = [
  { value: '16:9', label: '16:9', hint: 'Cinema' },
  { value: '9:16', label: '9:16', hint: 'Reels / Shorts' },
  { value: '1:1', label: '1:1', hint: 'Square' },
];
const QUALITY_OPTIONS: { value: VideoQualityOption; label: string; badge: string }[] = [
  { value: '720p', label: '720p HD', badge: 'Fast' },
  { value: '1080p', label: '1080p Full HD', badge: 'Recommended' },
  { value: '4K', label: '4K Ultra HD', badge: 'Studio' },
];

const SUBJECT_MODES: { value: SubjectAnimationMode; label: string }[] = [
  { value: 'auto', label: 'Auto Detect (AI)' },
  { value: 'faces', label: 'Faces & Portraits' },
  { value: 'background', label: 'Background Parallax' },
  { value: 'objects', label: 'Objects & Artifacts' },
  { value: 'landscapes', label: 'Landscapes & Skies' },
];

const CAMERA_MOVES: { value: CameraMovement; label: string }[] = [
  { value: 'cinematic_push', label: 'Cinematic Push-In' },
  { value: 'zoom_out_reveal', label: 'Grand Pull-Back' },
  { value: 'pan_left_to_right', label: 'Dolly Pan Left → Right' },
  { value: 'pan_right_to_left', label: 'Dolly Pan Right → Left' },
  { value: 'orbital_rotate', label: 'Orbital Tilt & Rotate' },
  { value: 'handheld_breathe', label: 'Organic Living Breath' },
];

const TRANSITION_STYLES: { value: TransitionStyle; label: string }[] = [
  { value: 'cross_dissolve', label: 'Optical Dissolve' },
  { value: 'zoom_blur', label: 'Whip Zoom Morph' },
  { value: 'slide_push', label: 'Cinematic Slide Push' },
  { value: 'soft_flash', label: 'Golden Luma Flash' },
  { value: 'luma_wipe', label: 'Horizon Reveal Wipe' },
];

const ATMOSPHERE_EFFECTS: { value: AtmosphereEffect; label: string }[] = [
  { value: 'sunbeams', label: 'Golden Sunbeams' },
  { value: 'golden_dust', label: 'Floating Embers' },
  { value: 'soft_bokeh', label: 'Cinema Lens Bokeh' },
  { value: 'light_leak', label: 'Warm Light Leak' },
  { value: 'film_grain', label: '35mm Film Vignette' },
  { value: 'none', label: 'Pure Natural Look' },
];

const SOUNDTRACK_STYLES: { value: SoundtrackStyle; label: string }[] = [
  { value: 'highland_ambient', label: 'Highland Krar & Pad + SFX' },
  { value: 'cinematic_orchestral', label: 'Epic Golden Strings + SFX' },
  { value: 'upbeat_pulse', label: 'Modern Cultural Groove + SFX' },
  { value: 'sfx_only', label: 'Transition Sound Effects Only' },
  { value: 'silent', label: 'Silent Video' },
];

export const PhotoToVideoStudio: React.FC<PhotoToVideoStudioProps> = ({
  user,
  onSaveInsight,
}) => {
  const [photos, setPhotos] = useState<StudioPhotoItem[]>([]);
  const [config, setConfig] = useState<VideoStudioConfig>({
    prompt:
      'Bring this scene to life with subtle subject motion, gentle parallax depth, golden sunlight shafts drifting across the frame, and smooth cinematic camera movement.',
    subjectMode: 'auto',
    cameraMovement: 'cinematic_push',
    atmosphereEffect: 'sunbeams',
    transitionStyle: 'cross_dissolve',
    soundtrackStyle: 'highland_ambient',
    durationSeconds: 5,
    aspectRatio: '16:9',
    quality: '1080p',
    zoomIntensity: 0.9,
    panIntensity: 0.85,
    rotationDegrees: 1.5,
    motionSpeed: 1.0,
    includeAudioSfx: true,
  });

  const [isEnhancingPrompt, setIsEnhancingPrompt] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderStage, setRenderStage] = useState('');
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(true);
  const [previewTimeSec, setPreviewTimeSec] = useState(0);

  const [choreography, setChoreography] = useState<ChoreographyPlan | null>(null);
  const [generatedVideos, setGeneratedVideos] = useState<GeneratedVideoArtifact[]>([]);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Record<string, boolean>>({});

  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [noticeBanner, setNoticeBanner] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const decodedCacheRef = useRef<{ idsKey: string; images: HTMLImageElement[] }>({
    idsKey: '',
    images: [],
  });

  const activeVideo =
    generatedVideos.find((v) => v.id === activeVideoId) || generatedVideos[0] || null;

  // Keep object URLs clean on unmount
  useEffect(() => {
    return () => {
      generatedVideos.forEach((v) => {
        try {
          URL.revokeObjectURL(v.url);
        } catch {
          // ignore
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recompute deterministic choreography whenever photos or motion sliders change (unless AI plan matches current photo count)
  const effectivePlan = React.useMemo<ChoreographyPlan>(() => {
    if (choreography && choreography.scenes.length === photos.length && photos.length > 0) {
      return choreography;
    }
    return buildDeterministicChoreography(photos, config);
  }, [choreography, photos, config]);

  // Decode loaded photos once when photo list changes for 60fps canvas live preview
  const [decodedPreviewImages, setDecodedPreviewImages] = useState<HTMLImageElement[]>([]);
  useEffect(() => {
    let cancelled = false;
    const idsKey = photos.map((p) => p.id).join('|');
    if (!idsKey) {
      setDecodedPreviewImages([]);
      return;
    }
    if (decodedCacheRef.current.idsKey === idsKey) {
      setDecodedPreviewImages(decodedCacheRef.current.images);
      return;
    }
    Promise.all(photos.map((p) => loadHtmlImage(p.dataUrl)))
      .then((imgs) => {
        if (cancelled) return;
        decodedCacheRef.current = { idsKey, images: imgs };
        setDecodedPreviewImages(imgs);
      })
      .catch(() => {
        if (!cancelled) setErrorBanner('One of the uploaded photos could not be decoded.');
      });
    return () => {
      cancelled = true;
    };
  }, [photos]);

  // Live Interactive Motion Preview Canvas Loop (when no rendered video is forced active or user previews draft)
  const [viewMode, setViewMode] = useState<'draft-preview' | 'rendered-video'>('draft-preview');

  useEffect(() => {
    if (viewMode !== 'draft-preview') return;
    const canvas = previewCanvasRef.current;
    if (!canvas || decodedPreviewImages.length === 0) return;

    const previewW = config.aspectRatio === '9:16' ? 405 : config.aspectRatio === '1:1' ? 540 : 720;
    const previewH = config.aspectRatio === '9:16' ? 720 : config.aspectRatio === '1:1' ? 540 : 405;
    if (canvas.width !== previewW || canvas.height !== previewH) {
      canvas.width = previewW;
      canvas.height = previewH;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let lastTimestamp = performance.now();
    let curT = previewTimeSec;

    const renderLoop = (now: number) => {
      const dt = (now - lastTimestamp) / 1000;
      lastTimestamp = now;

      if (isPreviewPlaying) {
        curT = (curT + dt) % config.durationSeconds;
        setPreviewTimeSec(curT);
      }

      drawStudioFrameAtTime(
        ctx,
        decodedPreviewImages,
        effectivePlan,
        config,
        curT,
        previewW,
        previewH
      );

      if (isPreviewPlaying) {
        rafId = requestAnimationFrame(renderLoop);
      }
    };

    drawStudioFrameAtTime(
      ctx,
      decodedPreviewImages,
      effectivePlan,
      config,
      curT,
      previewW,
      previewH
    );

    if (isPreviewPlaying) {
      rafId = requestAnimationFrame(renderLoop);
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [
    viewMode,
    decodedPreviewImages,
    effectivePlan,
    config,
    isPreviewPlaying,
    // intentionally omit previewTimeSec to avoid loop restarts every tick
  ]);

  const handleUploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setErrorBanner(null);
    const validFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (validFiles.length === 0) {
      setErrorBanner('Please select valid image files (JPG, PNG, WebP).');
      return;
    }

    try {
      const remainingSlots = Math.max(0, 12 - photos.length);
      if (remainingSlots === 0) {
        setErrorBanner('Maximum 12 photos supported per sequence.');
        return;
      }
      const loaded = await Promise.all(
        validFiles.slice(0, remainingSlots).map((f) => fileToStudioPhoto(f))
      );
      setPhotos((prev) => [...prev, ...loaded]);
      setChoreography(null);
      setViewMode('draft-preview');
      setPreviewTimeSec(0);
      setNoticeBanner(`Added ${loaded.length} photo(s) to animation timeline.`);
    } catch (err: any) {
      setErrorBanner(err?.message || 'Failed to load selected photo(s).');
    }
  };

  const handleLoadSample = async (src: string, label: string) => {
    if (photos.length >= 12) {
      setErrorBanner('Maximum 12 photos per sequence reached.');
      return;
    }
    setErrorBanner(null);
    try {
      const photo = await fileToStudioPhoto(src, label);
      setPhotos((prev) => [...prev, photo]);
      setChoreography(null);
      setViewMode('draft-preview');
      setNoticeBanner(`Added "${label}" sample scene.`);
    } catch {
      setErrorBanner(`Could not load sample image "${label}".`);
    }
  };

  const handleLoadAllSamples = async () => {
    setErrorBanner(null);
    try {
      const loaded = await Promise.all(
        SAMPLE_PRESETS.map((s) => fileToStudioPhoto(s.src, s.label))
      );
      setPhotos(loaded);
      setChoreography(null);
      setViewMode('draft-preview');
      setPreviewTimeSec(0);
      setNoticeBanner('Loaded 4 heritage scenes for instant multi-photo video preview.');
    } catch {
      setErrorBanner('Could not load sample heritage photos.');
    }
  };

  const movePhoto = (idx: number, delta: -1 | 1) => {
    const target = idx + delta;
    if (target < 0 || target >= photos.length) return;
    setPhotos((prev) => {
      const next = [...prev];
      const [item] = next.splice(idx, 1);
      next.splice(target, 0, item);
      return next;
    });
    setChoreography(null);
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    setChoreography(null);
  };

  const handleEnhancePrompt = async () => {
    setErrorBanner(null);
    setNoticeBanner(null);
    setIsEnhancingPrompt(true);
    try {
      const { enhancedPrompt, directorNote } = await enhanceAnimationPromptWithAI(
        config.prompt,
        config,
        Math.max(1, photos.length),
        user
      );
      setConfig((prev) => ({ ...prev, prompt: enhancedPrompt }));
      setNoticeBanner(`AI Director updated prompt: ${directorNote}`);
    } catch (err: any) {
      setErrorBanner(err?.message || 'Unable to enhance animation prompt right now.');
    } finally {
      setIsEnhancingPrompt(false);
    }
  };

  const handleGenerateVideo = async () => {
    if (photos.length === 0) {
      setErrorBanner('Upload at least one photo (or load a sample set below) before generating a video.');
      return;
    }
    setErrorBanner(null);
    setNoticeBanner(null);
    setIsGenerating(true);
    setRenderProgress(3);
    setRenderStage('Analyzing photo subjects & directing camera motion with AI...');

    try {
      const plan = await choreographPhotosWithAI(photos, config, user);
      setChoreography(plan);

      const artifact = await renderPhotoToVideo(photos, plan, config, (pct, label) => {
        setRenderProgress(pct);
        setRenderStage(label);
      });

      setGeneratedVideos((prev) => [artifact, ...prev]);
      setActiveVideoId(artifact.id);
      setViewMode('rendered-video');
      setNoticeBanner(
        `Generated ${artifact.durationSeconds}s ${artifact.quality} (${artifact.aspectRatio}) animated video (${(
          artifact.fileSizeBytes /
          (1024 * 1024)
        ).toFixed(2)} MB).`
      );
    } catch (err: any) {
      setErrorBanner(err?.message || 'Video generation encountered an error. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadVideo = useCallback((video: GeneratedVideoArtifact) => {
    const a = document.createElement('a');
    a.href = video.url;
    a.download = `axumite-photo-video-${video.aspectRatio.replace(':', 'x')}-${video.quality}-${video.id}.${video.fileExtension}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, []);

  const handleSaveToInsights = useCallback(
    (video: GeneratedVideoArtifact) => {
      if (!onSaveInsight) return;
      onSaveInsight({
        title: `AI Video (${video.aspectRatio} • ${video.quality} • ${video.durationSeconds}s)`,
        type: 'video',
        content: [
          `Prompt: ${video.prompt || 'Cinematic photo animation'}`,
          `Summary: ${video.choreographySummary}`,
          `Specs: ${video.resolutionLabel}, ${video.durationSeconds}s, ${video.photoCount} photo(s), Audio SFX: ${
            video.hasAudio ? 'Yes' : 'Silent'
          }`,
        ].join('\n'),
        tags: ['video', 'photo-to-video', video.quality, video.aspectRatio],
        metadata: {
          durationSeconds: video.durationSeconds,
          aspectRatio: video.aspectRatio,
          quality: video.quality,
          resolutionLabel: video.resolutionLabel,
          fileSizeBytes: video.fileSizeBytes,
        },
      });
      setSavedIds((prev) => ({ ...prev, [video.id]: true }));
      setNoticeBanner('Saved animated video project details to Saved Insights.');
    },
    [onSaveInsight]
  );

  const handleShareVideo = useCallback(async (video: GeneratedVideoArtifact) => {
    setErrorBanner(null);
    const shareTitle = `AXUMITE AI Photo-to-Video (${video.quality} • ${video.durationSeconds}s)`;
    const shareText = `${shareTitle}\n${video.prompt || video.choreographySummary}`;
    try {
      const file = new File(
        [video.blob],
        `axumite-motion-${video.id}.${video.fileExtension}`,
        { type: video.mimeType }
      );
      if (
        typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function' &&
        navigator.canShare?.({ files: [file] })
      ) {
        await navigator.share({ title: shareTitle, text: shareText, files: [file] });
        setNoticeBanner('Video shared via system share sheet.');
        return;
      }
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({ title: shareTitle, text: shareText });
        setNoticeBanner('Video details shared.');
        return;
      }
      await navigator.clipboard?.writeText(shareText);
      setNoticeBanner('Video details copied to clipboard! Use Download to save and send the video file directly.');
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        await navigator.clipboard?.writeText(shareText).catch(() => undefined);
        setNoticeBanner('Copied video summary to clipboard. Use Download for the video file.');
      }
    }
  }, []);

  const aspectBoxClass =
    config.aspectRatio === '9:16'
      ? 'aspect-[9/16] max-h-[470px] mx-auto'
      : config.aspectRatio === '1:1'
      ? 'aspect-square max-h-[430px] mx-auto'
      : 'aspect-video w-full';

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 pb-28 pt-2 space-y-6">
      {/* Top Studio Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0e0c08] via-[#13100b] to-[#08080a] border border-amber-500/30 p-5 sm:p-7 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-amber-400 text-[11px] font-bold uppercase tracking-[0.2em]">
              <Film className="w-4 h-4" />
              <span>AI Photo-to-Video Studio</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-amber-50 tracking-tight">
              Transform Photos into Realistic Animated Videos
            </h1>
            <p className="text-xs sm:text-sm text-stone-300 max-w-2xl leading-relaxed">
              Animate portraits, backgrounds, monuments, objects, and landscapes with AI subject choreography, cinematic camera motion, transitions, and synchronized audio.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-stone-900 hover:bg-stone-800 border border-amber-500/35 text-amber-100 text-xs font-bold transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4 text-amber-400" />
              <span>Upload Photo(s)</span>
            </button>

            <button
              type="button"
              onClick={handleGenerateVideo}
              disabled={isGenerating}
              data-testid="generate-photo-video-btn"
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#C5A059] hover:brightness-105 text-[#080808] text-xs font-black uppercase tracking-wider shadow-[0_6px_24px_rgba(212,175,55,0.35)] transition-all cursor-pointer disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Rendering {renderProgress}%</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Animated Video</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Engine Capability Disclosure (honest, zero key UI) */}
        <div className="mt-4 pt-3 border-t border-amber-500/15 flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-400">
          <div className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>
              Active Engine: <strong className="text-amber-200">Gemini Vision Choreography + 30fps HD Motion &amp; Audio Synthesizer</strong> (supports full 5s–30s renders across 9:16, 16:9, 1:1 up to 4K).
            </span>
          </div>
          <span className="text-stone-500">
            Cloud Veo / Lyria streaming requires a billing-enabled Gemini project.
          </span>
        </div>
      </div>

      {/* Inline Dismissible Alerts */}
      {errorBanner && (
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-rose-500/40 bg-rose-950/50 px-4 py-3 text-xs text-rose-100">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorBanner(null)}
            className="text-rose-300 hover:text-white cursor-pointer"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {noticeBanner && (
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-emerald-500/35 bg-emerald-950/40 px-4 py-3 text-xs text-emerald-100">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{noticeBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setNoticeBanner(null)}
            className="text-emerald-300 hover:text-white cursor-pointer"
            aria-label="Dismiss notice"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          handleUploadFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {/* Main 2-Column Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Upload, Timeline, Prompt & Motion Controls */}
        <div className="lg:col-span-7 space-y-5">
          {/* 1. Multi-Photo Upload & Sequence Strip */}
          <div className="rounded-3xl bg-[#09090b] border border-amber-500/20 p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ImagePlus className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-bold text-amber-100">
                  1. Photos &amp; Scene Sequence ({photos.length}/12)
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLoadAllSamples}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-200 text-[11px] font-semibold cursor-pointer transition-colors"
                >
                  Load 4 Heritage Samples
                </button>
                {photos.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setPhotos([]);
                      setChoreography(null);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-stone-900 hover:bg-rose-950/60 border border-stone-700 text-stone-400 hover:text-rose-200 text-[11px] cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>

            {photos.length === 0 ? (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleUploadFiles(e.dataTransfer.files);
                }}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-amber-500/30 hover:border-amber-400/70 rounded-2xl p-6 text-center cursor-pointer transition-all bg-[#0d0c09]"
              >
                <Upload className="w-8 h-8 text-amber-400 mx-auto mb-2.5" />
                <p className="text-sm font-bold text-amber-100">
                  Drop one or multiple photos here, or click to browse
                </p>
                <p className="text-xs text-stone-400 mt-1">
                  Supports portraits, monuments, products, family photos &amp; landscapes (JPG, PNG, WebP)
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {SAMPLE_PRESETS.map((sample) => (
                    <button
                      key={sample.label}
                      type="button"
                      onClick={() => handleLoadSample(sample.src, sample.label)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-[11px] text-stone-200 cursor-pointer"
                    >
                      <img src={sample.src} alt={sample.label} className="w-5 h-5 rounded object-cover" />
                      <span>+ {sample.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {photos.map((photo, idx) => (
                    <div
                      key={photo.id}
                      className="group relative rounded-2xl overflow-hidden border border-amber-500/25 bg-stone-950"
                    >
                      <img
                        src={photo.dataUrl}
                        alt={photo.name}
                        className="w-full h-24 object-cover"
                      />
                      <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/75 text-[10px] font-bold text-amber-300 border border-amber-500/30">
                        #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removePhoto(photo.id)}
                        aria-label={`Remove ${photo.name}`}
                        className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-black/75 text-rose-300 hover:text-rose-100 hover:bg-rose-600/80 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <div className="flex items-center justify-between px-2 py-1.5 bg-black/80 text-[10px] text-stone-300">
                        <button
                          type="button"
                          onClick={() => movePhoto(idx, -1)}
                          disabled={idx === 0}
                          className="p-0.5 hover:text-amber-300 disabled:opacity-30 cursor-pointer"
                          aria-label="Move photo left"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                        </button>
                        <span className="truncate max-w-[72px]">{photo.name}</span>
                        <button
                          type="button"
                          onClick={() => movePhoto(idx, 1)}
                          disabled={idx === photos.length - 1}
                          className="p-0.5 hover:text-amber-300 disabled:opacity-30 cursor-pointer"
                          aria-label="Move photo right"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {photos.length < 12 && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-[122px] rounded-2xl border border-dashed border-amber-500/35 hover:border-amber-400 bg-stone-950/60 flex flex-col items-center justify-center gap-1.5 text-amber-300 text-xs font-semibold cursor-pointer"
                    >
                      <Upload className="w-5 h-5" />
                      <span>Add Photo</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 2. Animation Prompt Box */}
          <div className="rounded-3xl bg-[#09090b] border border-amber-500/20 p-5 space-y-3 shadow-xl">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-amber-400" />
                <label htmlFor="video-animation-prompt" className="text-sm font-bold text-amber-100">
                  2. Animation Direction Prompt
                </label>
              </div>
              <button
                type="button"
                onClick={handleEnhancePrompt}
                disabled={isEnhancingPrompt}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-200 text-[11px] font-bold cursor-pointer disabled:opacity-50"
              >
                {isEnhancingPrompt ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>Enhance with AI</span>
              </button>
            </div>

            <textarea
              id="video-animation-prompt"
              rows={3}
              value={config.prompt}
              onChange={(e) => setConfig((prev) => ({ ...prev, prompt: e.target.value }))}
              placeholder="Describe how you want your photos animated — e.g. Slowly zoom toward the obelisk while golden morning light sweeps across the sky and clouds drift softly..."
              className="w-full rounded-2xl bg-[#111114] border border-stone-800 focus:border-amber-500/70 px-4 py-3 text-xs sm:text-sm text-stone-100 placeholder-stone-500 focus:outline-none"
            />
          </div>

          {/* 3. Subject, Camera, Motion Sliders, Transitions & Audio */}
          <div className="rounded-3xl bg-[#09090b] border border-amber-500/20 p-5 space-y-5 shadow-xl">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold text-amber-100">
                3. Motion, Camera, Transitions &amp; Sound Effects
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Subject Animation Mode */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  Subject to Animate
                </label>
                <select
                  value={config.subjectMode}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      subjectMode: e.target.value as SubjectAnimationMode,
                    }))
                  }
                  className="w-full rounded-xl bg-[#111114] border border-stone-800 focus:border-amber-500 px-3 py-2.5 text-xs text-stone-100 focus:outline-none"
                >
                  {SUBJECT_MODES.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Camera Movement */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-amber-400" />
                  Cinematic Camera Movement
                </label>
                <select
                  value={config.cameraMovement}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      cameraMovement: e.target.value as CameraMovement,
                    }))
                  }
                  className="w-full rounded-xl bg-[#111114] border border-stone-800 focus:border-amber-500 px-3 py-2.5 text-xs text-stone-100 focus:outline-none"
                >
                  {CAMERA_MOVES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Transition Style */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                  Photo-to-Photo Transition
                </label>
                <select
                  value={config.transitionStyle}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      transitionStyle: e.target.value as TransitionStyle,
                    }))
                  }
                  className="w-full rounded-xl bg-[#111114] border border-stone-800 focus:border-amber-500 px-3 py-2.5 text-xs text-stone-100 focus:outline-none"
                >
                  {TRANSITION_STYLES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Atmosphere & Lighting Effect */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                  Motion &amp; Atmospheric Effect
                </label>
                <select
                  value={config.atmosphereEffect}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      atmosphereEffect: e.target.value as AtmosphereEffect,
                    }))
                  }
                  className="w-full rounded-xl bg-[#111114] border border-stone-800 focus:border-amber-500 px-3 py-2.5 text-xs text-stone-100 focus:outline-none"
                >
                  {ATMOSPHERE_EFFECTS.map((ef) => (
                    <option key={ef.value} value={ef.value}>
                      {ef.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Fine-tune Sliders: Zoom, Pan, Rotation, Speed */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-stone-800/80">
              <div>
                <div className="flex justify-between text-[11px] text-stone-300 mb-1">
                  <span>Zoom Depth</span>
                  <span className="text-amber-400 font-bold">{Math.round(config.zoomIntensity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0.3}
                  max={1.5}
                  step={0.05}
                  value={config.zoomIntensity}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, zoomIntensity: Number(e.target.value) }))
                  }
                  className="w-full accent-amber-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-stone-300 mb-1">
                  <span>Camera Pan Sweep</span>
                  <span className="text-amber-400 font-bold">{Math.round(config.panIntensity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1.5}
                  step={0.05}
                  value={config.panIntensity}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, panIntensity: Number(e.target.value) }))
                  }
                  className="w-full accent-amber-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-stone-300 mb-1">
                  <span>Rotation Angle</span>
                  <span className="text-amber-400 font-bold">{config.rotationDegrees.toFixed(1)}°</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={5}
                  step={0.25}
                  value={config.rotationDegrees}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, rotationDegrees: Number(e.target.value) }))
                  }
                  className="w-full accent-amber-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-stone-300 mb-1">
                  <span>Motion Pace</span>
                  <span className="text-amber-400 font-bold">{config.motionSpeed.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={1.5}
                  step={0.05}
                  value={config.motionSpeed}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, motionSpeed: Number(e.target.value) }))
                  }
                  className="w-full accent-amber-400"
                />
              </div>
            </div>

            {/* AI Soundtrack & SFX + Output Format Controls */}
            <div className="space-y-4 pt-2 border-t border-stone-800/80">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                    <Music className="w-3.5 h-3.5 text-amber-400" />
                    AI Soundtrack &amp; Sound Effects
                  </label>
                  <select
                    value={config.soundtrackStyle}
                    onChange={(e) => {
                      const val = e.target.value as SoundtrackStyle;
                      setConfig((prev) => ({
                        ...prev,
                        soundtrackStyle: val,
                        includeAudioSfx: val !== 'silent',
                      }));
                    }}
                    className="w-full rounded-xl bg-[#111114] border border-stone-800 focus:border-amber-500 px-3 py-2.5 text-xs text-stone-100 focus:outline-none"
                  >
                    {SOUNDTRACK_STYLES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setConfig((prev) => ({ ...prev, includeAudioSfx: !prev.includeAudioSfx }))
                  }
                  className={`sm:mt-5 flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${
                    config.includeAudioSfx && config.soundtrackStyle !== 'silent'
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                      : 'bg-stone-900 border-stone-700 text-stone-400'
                  }`}
                >
                  {config.includeAudioSfx && config.soundtrackStyle !== 'silent' ? (
                    <Volume2 className="w-4 h-4 text-amber-400" />
                  ) : (
                    <VolumeX className="w-4 h-4" />
                  )}
                  <span>{config.includeAudioSfx ? 'Audio On' : 'Muted'}</span>
                </button>
              </div>

              {/* Duration, Aspect Ratio & Quality */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    Duration
                  </span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {DURATION_OPTIONS.map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => setConfig((prev) => ({ ...prev, durationSeconds: sec }))}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          config.durationSeconds === sec
                            ? 'bg-amber-500 text-stone-950 border-amber-400 shadow'
                            : 'bg-[#111114] text-stone-300 border-stone-800 hover:border-amber-500/40'
                        }`}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                    <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                    Aspect Ratio
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {ASPECT_OPTIONS.map((ar) => (
                      <button
                        key={ar.value}
                        type="button"
                        onClick={() => setConfig((prev) => ({ ...prev, aspectRatio: ar.value }))}
                        className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          config.aspectRatio === ar.value
                            ? 'bg-amber-500 text-stone-950 border-amber-400 shadow'
                            : 'bg-[#111114] text-stone-300 border-stone-800 hover:border-amber-500/40'
                        }`}
                      >
                        {ar.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                    Render Quality
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {QUALITY_OPTIONS.map((q) => (
                      <button
                        key={q.value}
                        type="button"
                        onClick={() => setConfig((prev) => ({ ...prev, quality: q.value }))}
                        className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          config.quality === q.value
                            ? 'bg-amber-500 text-stone-950 border-amber-400 shadow'
                            : 'bg-[#111114] text-stone-300 border-stone-800 hover:border-amber-500/40'
                        }`}
                      >
                        {q.value}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Live Preview Stage, Render Progress & Output Export */}
        <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-4">
          <div className="rounded-3xl bg-[#09090b] border border-amber-500/25 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-bold text-amber-100">
                  {viewMode === 'rendered-video' && activeVideo
                    ? 'Generated Video Output'
                    : 'Live Motion Preview Stage'}
                </h2>
              </div>

              {activeVideo && (
                <div className="flex items-center gap-1 rounded-xl bg-stone-900 p-1 border border-stone-800">
                  <button
                    type="button"
                    onClick={() => setViewMode('draft-preview')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                      viewMode === 'draft-preview'
                        ? 'bg-amber-500 text-stone-950'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    Live Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('rendered-video')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                      viewMode === 'rendered-video'
                        ? 'bg-amber-500 text-stone-950'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    Final Video
                  </button>
                </div>
              )}
            </div>

            {/* Viewport Container */}
            <div
              className={`relative rounded-2xl overflow-hidden bg-black border border-stone-800 flex items-center justify-center ${aspectBoxClass}`}
            >
              {photos.length === 0 && !(viewMode === 'rendered-video' && activeVideo) ? (
                <div className="p-6 text-center space-y-3">
                  <Film className="w-10 h-10 text-amber-500/50 mx-auto" />
                  <p className="text-xs font-semibold text-stone-300">
                    Upload photos or load sample heritage scenes to preview real-time animation.
                  </p>
                  <button
                    type="button"
                    onClick={handleLoadAllSamples}
                    className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-xs font-bold cursor-pointer"
                  >
                    Try With 4 Sample Photos
                  </button>
                </div>
              ) : viewMode === 'rendered-video' && activeVideo ? (
                <video
                  key={activeVideo.id}
                  src={activeVideo.url}
                  controls
                  autoPlay
                  loop
                  playsInline
                  className="w-full h-full object-contain bg-black"
                />
              ) : (
                <>
                  <canvas
                    ref={previewCanvasRef}
                    className="w-full h-full object-contain"
                  />
                  {/* Bottom Preview Scrim */}
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-black/75 backdrop-blur border border-white/10 text-[11px] text-stone-200">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsPreviewPlaying((p) => !p)}
                        className="p-1 rounded-lg bg-amber-500 text-stone-950 cursor-pointer"
                        aria-label={isPreviewPlaying ? 'Pause preview' : 'Play preview'}
                      >
                        {isPreviewPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewTimeSec(0);
                          setIsPreviewPlaying(true);
                        }}
                        className="p-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 cursor-pointer"
                        aria-label="Restart preview"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-mono text-[10px] text-amber-300">
                        {previewTimeSec.toFixed(1)}s / {config.durationSeconds}s
                      </span>
                    </div>
                    <span className="text-[10px] text-stone-400">
                      {config.aspectRatio} • {config.quality}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Active Render Progress */}
            {isGenerating && (
              <div className="space-y-2 rounded-2xl bg-amber-950/25 border border-amber-500/35 p-3.5">
                <div className="flex items-center justify-between text-xs font-bold text-amber-200">
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                    {renderStage}
                  </span>
                  <span>{renderProgress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-stone-900 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB] transition-all duration-200"
                    style={{ width: `${renderProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Primary Generate Video Button inside Stage */}
            <button
              type="button"
              onClick={handleGenerateVideo}
              disabled={isGenerating}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#C5A059] hover:brightness-105 text-[#080808] text-sm font-black uppercase tracking-wider shadow-lg cursor-pointer disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Rendering Animated Video ({renderProgress}%)...</span>
                </>
              ) : (
                <>
                  <Film className="w-4 h-4" />
                  <span>
                    Generate {config.durationSeconds}s {config.quality} Video
                  </span>
                </>
              )}
            </button>

            {/* Preview / Download / Save / Share Action Row for Rendered Video */}
            {activeVideo && (
              <div className="space-y-3 pt-2 border-t border-stone-800">
                <div className="text-[11px] text-stone-400 leading-relaxed">
                  <span className="text-amber-300 font-semibold">AI Choreography: </span>
                  {activeVideo.choreographySummary}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownloadVideo(activeVideo)}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-200 text-xs font-bold cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveToInsights(activeVideo)}
                    disabled={!onSaveInsight || Boolean(savedIds[activeVideo.id])}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-200 text-xs font-bold cursor-pointer disabled:opacity-50"
                  >
                    <BookmarkCheck className="w-3.5 h-3.5" />
                    <span>{savedIds[activeVideo.id] ? 'Saved' : 'Save'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleShareVideo(activeVideo)}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/35 text-sky-200 text-xs font-bold cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share</span>
                  </button>
                </div>
              </div>
            )}

            {/* Session Generated Clips Switcher */}
            {generatedVideos.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-stone-800">
                <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                  Generated Clips This Session ({generatedVideos.length})
                </span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {generatedVideos.map((vid, idx) => (
                    <button
                      key={vid.id}
                      type="button"
                      onClick={() => {
                        setActiveVideoId(vid.id);
                        setViewMode('rendered-video');
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-left text-xs cursor-pointer transition-colors ${
                        activeVideo?.id === vid.id
                          ? 'bg-amber-500/15 border-amber-500/45 text-amber-100'
                          : 'bg-stone-950 border-stone-800 text-stone-300 hover:border-stone-700'
                      }`}
                    >
                      <span className="font-semibold truncate">
                        Clip #{generatedVideos.length - idx} • {vid.aspectRatio} • {vid.quality}
                      </span>
                      <span className="text-[10px] text-stone-400 shrink-0 ml-2">
                        {vid.durationSeconds}s • {(vid.fileSizeBytes / (1024 * 1024)).toFixed(1)}MB
                      </span>
                    </button>
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
