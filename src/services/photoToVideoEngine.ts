import { UserProfile } from '../types';
import { buildTranslatorApiHeaders } from './translatorSuiteService';

export type VideoAspectRatio = '16:9' | '9:16' | '1:1';
export type VideoDurationOption = 5 | 10 | 15 | 30;
export type VideoQualityOption = '720p' | '1080p' | '4K';

export type SubjectAnimationMode = 'auto' | 'faces' | 'background' | 'objects' | 'landscapes';
export type CameraMovement =
  | 'cinematic_push'
  | 'zoom_out_reveal'
  | 'pan_left_to_right'
  | 'pan_right_to_left'
  | 'orbital_rotate'
  | 'handheld_breathe';
export type TransitionStyle = 'cross_dissolve' | 'zoom_blur' | 'slide_push' | 'soft_flash' | 'luma_wipe';
export type AtmosphereEffect = 'sunbeams' | 'golden_dust' | 'soft_bokeh' | 'film_grain' | 'light_leak' | 'none';
export type SoundtrackStyle = 'highland_ambient' | 'cinematic_orchestral' | 'upbeat_pulse' | 'sfx_only' | 'silent';

export interface StudioPhotoItem {
  id: string;
  name: string;
  dataUrl: string;
  width: number;
  height: number;
}

export interface SceneMotionPlan {
  photoIndex: number;
  detectedSubject: 'face' | 'background' | 'object' | 'landscape';
  focalX: number;
  focalY: number;
  zoomStart: number;
  zoomEnd: number;
  panX: number;
  panY: number;
  rotateDeg: number;
  motionIntensity: number;
  depthParallax: number;
  caption: string;
}

export interface ChoreographyPlan {
  choreographySummary: string;
  musicTempoBpm: number;
  musicKey: string;
  scenes: SceneMotionPlan[];
  modelUsed?: string;
  engineType: 'gemini-choreography' | 'deterministic-motion';
}

export interface VideoStudioConfig {
  prompt: string;
  subjectMode: SubjectAnimationMode;
  cameraMovement: CameraMovement;
  atmosphereEffect: AtmosphereEffect;
  transitionStyle: TransitionStyle;
  soundtrackStyle: SoundtrackStyle;
  durationSeconds: VideoDurationOption;
  aspectRatio: VideoAspectRatio;
  quality: VideoQualityOption;
  zoomIntensity: number; // 0.3 to 1.5
  panIntensity: number; // 0.0 to 1.5
  rotationDegrees: number; // 0 to 5
  motionSpeed: number; // 0.5 to 1.5
  includeAudioSfx: boolean;
}

export interface GeneratedVideoArtifact {
  id: string;
  url: string;
  blob: Blob;
  mimeType: string;
  fileExtension: string;
  fileSizeBytes: number;
  durationSeconds: VideoDurationOption;
  aspectRatio: VideoAspectRatio;
  quality: VideoQualityOption;
  resolutionLabel: string;
  photoCount: number;
  prompt: string;
  createdAt: string;
  choreographySummary: string;
  hasAudio: boolean;
}

export function getVideoResolution(
  aspectRatio: VideoAspectRatio,
  quality: VideoQualityOption
): { width: number; height: number; bitrate: number } {
  const shortEdge = quality === '4K' ? 2160 : quality === '1080p' ? 1080 : 720;
  const bitrate = quality === '4K' ? 18_000_000 : quality === '1080p' ? 9_000_000 : 4_800_000;

  if (aspectRatio === '9:16') {
    return {
      width: shortEdge,
      height: Math.round((shortEdge * 16) / 9),
      bitrate,
    };
  }
  if (aspectRatio === '1:1') {
    return { width: shortEdge, height: shortEdge, bitrate };
  }
  return {
    width: Math.round((shortEdge * 16) / 9),
    height: shortEdge,
    bitrate,
  };
}

export async function fileToStudioPhoto(sourceUrlOrFile: File | string, fallbackName = 'Photo'): Promise<StudioPhotoItem> {
  const rawUrl =
    typeof sourceUrlOrFile === 'string'
      ? sourceUrlOrFile
      : await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = () => reject(new Error(`Could not read ${sourceUrlOrFile.name}`));
          reader.readAsDataURL(sourceUrlOrFile);
        });

  const name = typeof sourceUrlOrFile === 'string' ? fallbackName : sourceUrlOrFile.name;

  const img = await loadHtmlImage(rawUrl);
  // Normalize large photos slightly so multiple frames fit cleanly in memory & GPU texture upload
  const maxDim = 2200;
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth || 1280, img.naturalHeight || 720));
  const targetW = Math.max(2, Math.round((img.naturalWidth || 1280) * scale));
  const targetH = Math.max(2, Math.round((img.naturalHeight || 720) * scale));

  let dataUrl = rawUrl;
  if (scale < 1 || !rawUrl.startsWith('data:')) {
    const c = document.createElement('canvas');
    c.width = targetW;
    c.height = targetH;
    const ctx = c.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, 0, 0, targetW, targetH);
      dataUrl = c.toDataURL('image/jpeg', 0.92);
    }
  }

  return {
    id: `photo_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    name,
    dataUrl,
    width: targetW,
    height: targetH,
  };
}

export function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to decode photo asset.'));
    img.src = src;
  });
}

async function compressDataUrlForAi(dataUrl: string): Promise<string> {
  try {
    const img = await loadHtmlImage(dataUrl);
    const maxEdge = 512;
    const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth || 512, img.naturalHeight || 512));
    const w = Math.max(64, Math.round((img.naturalWidth || 512) * scale));
    const h = Math.max(64, Math.round((img.naturalHeight || 512) * scale));
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    if (!ctx) return dataUrl;
    ctx.drawImage(img, 0, 0, w, h);
    return c.toDataURL('image/jpeg', 0.72);
  } catch {
    return dataUrl;
  }
}

export function buildDeterministicChoreography(
  photos: StudioPhotoItem[],
  config: VideoStudioConfig
): ChoreographyPlan {
  const scenes: SceneMotionPlan[] = photos.map((_, idx) => {
    const dir = idx % 2 === 0 ? 1 : -1;
    const baseZoom = 0.14 * config.zoomIntensity;
    const basePan = 0.08 * config.panIntensity * dir;
    const rot = (config.rotationDegrees || 0) * (idx % 2 === 0 ? 0.65 : -0.65);

    let zoomStart = 1.04;
    let zoomEnd = 1.04 + baseZoom;
    let panX = basePan;
    let panY = idx % 2 === 0 ? -0.025 : 0.025;
    let rotateDeg = rot;

    if (config.cameraMovement === 'zoom_out_reveal') {
      zoomStart = 1.18 + baseZoom * 0.5;
      zoomEnd = 1.02;
    } else if (config.cameraMovement === 'pan_left_to_right') {
      zoomStart = 1.1;
      zoomEnd = 1.14;
      panX = 0.11 * config.panIntensity;
      panY = 0;
    } else if (config.cameraMovement === 'pan_right_to_left') {
      zoomStart = 1.1;
      zoomEnd = 1.14;
      panX = -0.11 * config.panIntensity;
      panY = 0;
    } else if (config.cameraMovement === 'orbital_rotate') {
      zoomStart = 1.08;
      zoomEnd = 1.16 + baseZoom * 0.4;
      rotateDeg = (config.rotationDegrees || 2.5) * dir;
    } else if (config.cameraMovement === 'handheld_breathe') {
      zoomStart = 1.06;
      zoomEnd = 1.13 + baseZoom * 0.35;
      rotateDeg = (config.rotationDegrees || 1.2) * dir;
    }

    const detectedSubject: SceneMotionPlan['detectedSubject'] =
      config.subjectMode === 'faces'
        ? 'face'
        : config.subjectMode === 'background'
        ? 'background'
        : config.subjectMode === 'objects'
        ? 'object'
        : config.subjectMode === 'landscapes'
        ? 'landscape'
        : idx % 2 === 0
        ? 'face'
        : 'landscape';

    return {
      photoIndex: idx,
      detectedSubject,
      focalX: 0.5,
      focalY: detectedSubject === 'face' ? 0.38 : 0.5,
      zoomStart,
      zoomEnd,
      panX,
      panY,
      rotateDeg,
      motionIntensity: Math.min(1, 0.55 * config.motionSpeed),
      depthParallax: detectedSubject === 'background' || detectedSubject === 'landscape' ? 0.85 : 0.65,
      caption: `Scene ${idx + 1} kinetic depth sweep`,
    };
  });

  return {
    choreographySummary: `Directed ${photos.length} scene(s) with ${config.cameraMovement.replace(/_/g, ' ')} camera choreography and ${config.atmosphereEffect.replace(/_/g, ' ')} optics.`,
    musicTempoBpm: config.soundtrackStyle === 'upbeat_pulse' ? 108 : 82,
    musicKey: 'D Pentatonic',
    scenes,
    engineType: 'deterministic-motion',
  };
}

export async function enhanceAnimationPromptWithAI(
  prompt: string,
  config: VideoStudioConfig,
  photoCount: number,
  user?: UserProfile
): Promise<{ enhancedPrompt: string; directorNote: string }> {
  const res = await fetch('/api/photo-to-video/enhance-prompt', {
    method: 'POST',
    headers: buildTranslatorApiHeaders(user),
    body: JSON.stringify({
      prompt,
      subjectMode: config.subjectMode,
      cameraMovement: config.cameraMovement,
      atmosphereEffect: config.atmosphereEffect,
      transitionStyle: config.transitionStyle,
      soundtrackStyle: config.soundtrackStyle,
      photoCount,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.enhancedPrompt) {
    throw new Error(data?.tigrinyaMessage || data?.error || 'Could not enhance animation prompt.');
  }
  return {
    enhancedPrompt: data.enhancedPrompt,
    directorNote: data.directorNote || '',
  };
}

export async function choreographPhotosWithAI(
  photos: StudioPhotoItem[],
  config: VideoStudioConfig,
  user?: UserProfile
): Promise<ChoreographyPlan> {
  const fallback = buildDeterministicChoreography(photos, config);
  try {
    const compressed = await Promise.all(
      photos.slice(0, 6).map(async (p) => ({
        name: p.name,
        dataUrl: await compressDataUrlForAi(p.dataUrl),
      }))
    );

    const res = await fetch('/api/photo-to-video/choreograph', {
      method: 'POST',
      headers: buildTranslatorApiHeaders(user),
      body: JSON.stringify({
        images: compressed,
        prompt: config.prompt,
        subjectMode: config.subjectMode,
        cameraMovement: config.cameraMovement,
        atmosphereEffect: config.atmosphereEffect,
        transitionStyle: config.transitionStyle,
        soundtrackStyle: config.soundtrackStyle,
        durationSeconds: config.durationSeconds,
        aspectRatio: config.aspectRatio,
        quality: config.quality,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.success || !Array.isArray(data.scenes) || data.scenes.length === 0) {
      return fallback;
    }

    const mergedScenes: SceneMotionPlan[] = photos.map((_, idx) => {
      const aiScene = data.scenes.find((s: any) => s.photoIndex === idx) || data.scenes[idx % data.scenes.length];
      const base = fallback.scenes[idx];
      if (!aiScene) return base;
      return {
        photoIndex: idx,
        detectedSubject: aiScene.detectedSubject || base.detectedSubject,
        focalX: clamp(Number(aiScene.focalX) || base.focalX, 0.2, 0.8),
        focalY: clamp(Number(aiScene.focalY) || base.focalY, 0.2, 0.8),
        zoomStart: clamp(Number(aiScene.zoomStart) || base.zoomStart, 1.0, 1.25),
        zoomEnd: clamp((Number(aiScene.zoomEnd) || base.zoomEnd) * (0.7 + config.zoomIntensity * 0.3), 1.02, 1.45),
        panX: clamp((Number(aiScene.panX) ?? base.panX) * Math.max(0.2, config.panIntensity), -0.22, 0.22),
        panY: clamp((Number(aiScene.panY) ?? base.panY) * Math.max(0.2, config.panIntensity), -0.18, 0.18),
        rotateDeg: clamp(
          ((Number(aiScene.rotateDeg) || base.rotateDeg) * Math.max(0.25, config.rotationDegrees / 2)),
          -6,
          6
        ),
        motionIntensity: clamp(Number(aiScene.motionIntensity) || base.motionIntensity, 0.2, 1.0),
        depthParallax: clamp(Number(aiScene.depthParallax) || base.depthParallax, 0.2, 1.0),
        caption: String(aiScene.caption || base.caption),
      };
    });

    return {
      choreographySummary: String(data.choreographySummary || fallback.choreographySummary),
      musicTempoBpm: Number(data.musicTempoBpm) || fallback.musicTempoBpm,
      musicKey: String(data.musicKey || fallback.musicKey),
      scenes: mergedScenes,
      modelUsed: data.modelUsed,
      engineType: 'gemini-choreography',
    };
  } catch {
    return fallback;
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * clamp(t, 0, 1)) - 1) / 2;
}

function drawCoverImageTransformed(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  canvasW: number,
  canvasH: number,
  zoom: number,
  panX: number,
  panY: number,
  rotateRad: number,
  focalX: number,
  focalY: number,
  alpha = 1
) {
  const iw = img.naturalWidth || canvasW;
  const ih = img.naturalHeight || canvasH;
  const coverScale = Math.max(canvasW / iw, canvasH / ih);
  // Guarantee overscan safety margin when rotating or panning so no black borders ever appear
  const rotMargin = 1 + Math.abs(Math.sin(rotateRad)) * 0.45 + Math.max(Math.abs(panX), Math.abs(panY)) * 1.9;
  const finalScale = coverScale * Math.max(zoom, rotMargin);

  const drawW = iw * finalScale;
  const drawH = ih * finalScale;

  ctx.save();
  ctx.globalAlpha = clamp(alpha, 0, 1);
  ctx.translate(canvasW / 2 + panX * canvasW, canvasH / 2 + panY * canvasH);
  if (Math.abs(rotateRad) > 0.0001) {
    ctx.rotate(rotateRad);
  }
  const anchorOffsetX = (0.5 - focalX) * (drawW - canvasW) * 0.35;
  const anchorOffsetY = (0.5 - focalY) * (drawH - canvasH) * 0.35;
  ctx.drawImage(img, -drawW / 2 + anchorOffsetX, -drawH / 2 + anchorOffsetY, drawW, drawH);
  ctx.restore();
}

function renderSingleAnimatedScene(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  scene: SceneMotionPlan,
  sceneProgress: number,
  globalTimeSec: number,
  canvasW: number,
  canvasH: number,
  config: VideoStudioConfig,
  extraAlpha = 1,
  extraZoomBoost = 0,
  extraOffsetX = 0
) {
  const eased = easeInOutSine(sceneProgress);
  const breathe = Math.sin(globalTimeSec * 1.45 * config.motionSpeed) * 0.012 * scene.motionIntensity;
  const zoom =
    scene.zoomStart + (scene.zoomEnd - scene.zoomStart) * eased + breathe + extraZoomBoost;

  const panX = scene.panX * (eased - 0.5) * 1.6 + extraOffsetX;
  const panY =
    scene.panY * (eased - 0.5) * 1.5 +
    Math.cos(globalTimeSec * 0.9 * config.motionSpeed) * 0.006 * scene.motionIntensity;

  const rotateRad =
    ((scene.rotateDeg * (eased - 0.5) +
      Math.sin(globalTimeSec * 0.7 * config.motionSpeed) * (scene.detectedSubject === 'face' ? 0.35 : 0.6)) *
      Math.PI) /
    180;

  // 1. Background parallax pass (slightly softer & opposite micro-drift for 2.5D depth)
  const effectiveSubject =
    config.subjectMode === 'auto' ? scene.detectedSubject : config.subjectMode === 'faces' ? 'face' : config.subjectMode === 'objects' ? 'object' : config.subjectMode === 'landscapes' ? 'landscape' : 'background';

  if (effectiveSubject === 'background' || effectiveSubject === 'face' || effectiveSubject === 'object') {
    const bgZoom = zoom * (effectiveSubject === 'background' ? 1.07 : 1.03);
    const bgPanX = panX * (effectiveSubject === 'background' ? 1.45 : 0.7);
    ctx.save();
    drawCoverImageTransformed(
      ctx,
      img,
      canvasW,
      canvasH,
      bgZoom,
      bgPanX,
      panY * 1.2,
      rotateRad * 0.65,
      scene.focalX,
      scene.focalY,
      extraAlpha
    );
    ctx.restore();

    // 2. Subject / focal plane subtle depth isolate (radial soft feathered highlight on face/object)
    if (effectiveSubject === 'face' || effectiveSubject === 'object') {
      ctx.save();
      const fx = canvasW * (scene.focalX + panX * 0.4);
      const fy = canvasH * (scene.focalY + panY * 0.4);
      const radius = Math.min(canvasW, canvasH) * (effectiveSubject === 'face' ? 0.34 : 0.4);
      ctx.beginPath();
      ctx.arc(fx, fy, radius, 0, Math.PI * 2);
      ctx.clip();

      const subjectPulse = zoom * (1.018 + Math.sin(globalTimeSec * 1.9) * 0.009);
      drawCoverImageTransformed(
        ctx,
        img,
        canvasW,
        canvasH,
        subjectPulse,
        panX * 1.15,
        panY * 1.15,
        rotateRad,
        scene.focalX,
        scene.focalY,
        extraAlpha * 0.55
      );
      ctx.restore();
    }
  } else {
    // Wide Landscape sweeping motion + atmospheric horizon shimmer
    drawCoverImageTransformed(
      ctx,
      img,
      canvasW,
      canvasH,
      zoom,
      panX,
      panY,
      rotateRad,
      scene.focalX,
      scene.focalY,
      extraAlpha
    );
  }
}

function renderAtmosphereOverlay(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  timeSec: number,
  effect: AtmosphereEffect
) {
  if (effect === 'none') return;

  ctx.save();
  if (effect === 'sunbeams' || effect === 'light_leak') {
    const shift = Math.sin(timeSec * 0.65) * 0.14;
    const grad = ctx.createLinearGradient(
      canvasW * (0.1 + shift),
      0,
      canvasW * (0.85 + shift),
      canvasH * 0.9
    );
    if (effect === 'sunbeams') {
      grad.addColorStop(0, 'rgba(255, 226, 150, 0.20)');
      grad.addColorStop(0.35, 'rgba(245, 196, 81, 0.09)');
      grad.addColorStop(0.7, 'rgba(0, 0, 0, 0)');
    } else {
      grad.addColorStop(0, 'rgba(255, 145, 77, 0.24)');
      grad.addColorStop(0.4, 'rgba(212, 175, 55, 0.12)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    }
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvasW, canvasH);
  }

  if (effect === 'golden_dust' || effect === 'soft_bokeh') {
    const count = effect === 'soft_bokeh' ? 16 : 28;
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < count; i++) {
      const seed = (i + 1) * 97.13;
      const x = ((Math.sin(seed + timeSec * (0.12 + (i % 5) * 0.03)) * 0.5 + 0.5) * 1.1 - 0.05) * canvasW;
      const y = (((((seed * 0.37) % 1) - timeSec * (0.04 + (i % 4) * 0.015)) % 1 + 1) % 1) * canvasH;
      const r =
        effect === 'soft_bokeh'
          ? (Math.min(canvasW, canvasH) * (0.018 + (i % 5) * 0.008))
          : (Math.min(canvasW, canvasH) * (0.002 + (i % 3) * 0.0018));
      const alpha = (0.18 + 0.28 * Math.abs(Math.sin(timeSec * 1.1 + i))) * (effect === 'soft_bokeh' ? 0.55 : 0.85);
      const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, `rgba(255, 224, 140, ${alpha.toFixed(2)})`);
      rg.addColorStop(1, 'rgba(255, 224, 140, 0)');
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (effect === 'film_grain') {
    // Cinematic anamorphic vignette + warm scan highlight
    const vig = ctx.createRadialGradient(
      canvasW / 2,
      canvasH / 2,
      Math.min(canvasW, canvasH) * 0.3,
      canvasW / 2,
      canvasH / 2,
      Math.max(canvasW, canvasH) * 0.72
    );
    vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vig.addColorStop(1, 'rgba(0, 0, 0, 0.38)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, canvasW, canvasH);
  }
  ctx.restore();
}

export function drawStudioFrameAtTime(
  ctx: CanvasRenderingContext2D,
  decodedImages: HTMLImageElement[],
  plan: ChoreographyPlan,
  config: VideoStudioConfig,
  timeSec: number,
  canvasW: number,
  canvasH: number
): void {
  ctx.clearRect(0, 0, canvasW, canvasH);
  ctx.fillStyle = '#070709';
  ctx.fillRect(0, 0, canvasW, canvasH);

  const count = decodedImages.length;
  if (count === 0) return;

  const totalDur = Math.max(1, config.durationSeconds);
  const clampedTime = clamp(timeSec, 0, totalDur);
  const sceneDur = totalDur / count;
  const transitionDur = count > 1 ? Math.min(0.85, sceneDur * 0.28) : 0;

  const sceneIdx = Math.min(count - 1, Math.floor(clampedTime / sceneDur));
  const localTime = clampedTime - sceneIdx * sceneDur;
  const sceneProgress = clamp(localTime / sceneDur, 0, 1);

  const curImg = decodedImages[sceneIdx];
  const curScene = plan.scenes[sceneIdx] || plan.scenes[0];

  const isTransitioningOut =
    count > 1 && sceneIdx < count - 1 && localTime >= sceneDur - transitionDur;

  if (!isTransitioningOut || transitionDur <= 0) {
    renderSingleAnimatedScene(
      ctx,
      curImg,
      curScene,
      sceneProgress,
      clampedTime,
      canvasW,
      canvasH,
      config,
      1
    );
  } else {
    const nextIdx = sceneIdx + 1;
    const nextImg = decodedImages[nextIdx];
    const nextScene = plan.scenes[nextIdx] || plan.scenes[0];
    const t = easeInOutSine((localTime - (sceneDur - transitionDur)) / transitionDur);

    if (config.transitionStyle === 'slide_push') {
      renderSingleAnimatedScene(
        ctx,
        curImg,
        curScene,
        sceneProgress,
        clampedTime,
        canvasW,
        canvasH,
        config,
        1,
        0,
        -t * 1.0
      );
      renderSingleAnimatedScene(
        ctx,
        nextImg,
        nextScene,
        0.04 * t,
        clampedTime,
        canvasW,
        canvasH,
        config,
        1,
        0,
        1 - t
      );
    } else if (config.transitionStyle === 'zoom_blur') {
      renderSingleAnimatedScene(
        ctx,
        curImg,
        curScene,
        sceneProgress,
        clampedTime,
        canvasW,
        canvasH,
        config,
        1 - t,
        t * 0.24
      );
      renderSingleAnimatedScene(
        ctx,
        nextImg,
        nextScene,
        0.05 * t,
        clampedTime,
        canvasW,
        canvasH,
        config,
        t,
        (1 - t) * 0.16
      );
    } else if (config.transitionStyle === 'luma_wipe') {
      renderSingleAnimatedScene(
        ctx,
        curImg,
        curScene,
        sceneProgress,
        clampedTime,
        canvasW,
        canvasH,
        config,
        1
      );
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, canvasW * t, canvasH);
      ctx.clip();
      renderSingleAnimatedScene(
        ctx,
        nextImg,
        nextScene,
        0.04 * t,
        clampedTime,
        canvasW,
        canvasH,
        config,
        1
      );
      ctx.restore();
    } else {
      // cross_dissolve or soft_flash
      renderSingleAnimatedScene(
        ctx,
        curImg,
        curScene,
        sceneProgress,
        clampedTime,
        canvasW,
        canvasH,
        config,
        1 - t
      );
      renderSingleAnimatedScene(
        ctx,
        nextImg,
        nextScene,
        0.05 * t,
        clampedTime,
        canvasW,
        canvasH,
        config,
        t
      );
      if (config.transitionStyle === 'soft_flash') {
        const flashAlpha = Math.sin(t * Math.PI) * 0.55;
        ctx.save();
        ctx.fillStyle = `rgba(255, 240, 200, ${flashAlpha.toFixed(3)})`;
        ctx.fillRect(0, 0, canvasW, canvasH);
        ctx.restore();
      }
    }
  }

  // Atmosphere & lighting layer
  renderAtmosphereOverlay(ctx, canvasW, canvasH, clampedTime, config.atmosphereEffect);

  // Subtle fade-in / fade-out envelope (0.35s)
  if (clampedTime < 0.35) {
    ctx.fillStyle = `rgba(0,0,0,${(1 - clampedTime / 0.35).toFixed(3)})`;
    ctx.fillRect(0, 0, canvasW, canvasH);
  } else if (totalDur - clampedTime < 0.45) {
    ctx.fillStyle = `rgba(0,0,0,${(1 - (totalDur - clampedTime) / 0.45).toFixed(3)})`;
    ctx.fillRect(0, 0, canvasW, canvasH);
  }
}

function scheduleSoundtrackAndSfx(
  soundtrackStyle: SoundtrackStyle,
  durationSeconds: number,
  photoCount: number,
  bpm: number
): { stream: MediaStream; stop: () => void } | null {
  if (soundtrackStyle === 'silent') return null;
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return null;

  try {
    const audioCtx = new AudioCtx();
    const dest = audioCtx.createMediaStreamDestination();
    const masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0.001, audioCtx.currentTime);
    masterGain.gain.exponentialRampToValueAtTime(0.45, audioCtx.currentTime + 0.6);
    masterGain.gain.setValueAtTime(0.45, audioCtx.currentTime + Math.max(0.7, durationSeconds - 0.8));
    masterGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + durationSeconds);
    masterGain.connect(dest);

    const stopNodes: AudioNode[] = [];
    const startTime = audioCtx.currentTime + 0.05;

    // 1. Warm Musical Pad & Melodic Motif (unless sfx_only)
    if (soundtrackStyle !== 'sfx_only') {
      const pentatonic =
        soundtrackStyle === 'cinematic_orchestral'
          ? [146.83, 174.61, 220.0, 261.63, 293.66, 349.23] // D minor cinematic
          : [146.83, 164.81, 196.0, 220.0, 293.66, 329.63]; // Tizita / Highland pentatonic

      // Drone foundation pad
      const padOsc = audioCtx.createOscillator();
      const padFilter = audioCtx.createBiquadFilter();
      const padGain = audioCtx.createGain();
      padOsc.type = soundtrackStyle === 'cinematic_orchestral' ? 'sawtooth' : 'triangle';
      padOsc.frequency.setValueAtTime(pentatonic[0] / 2, startTime);
      padFilter.type = 'lowpass';
      padFilter.frequency.setValueAtTime(420, startTime);
      padGain.gain.setValueAtTime(0.18, startTime);

      padOsc.connect(padFilter);
      padFilter.connect(padGain);
      padGain.connect(masterGain);
      padOsc.start(startTime);
      padOsc.stop(startTime + durationSeconds + 0.1);
      stopNodes.push(padOsc);

      // Rhythmic Krar / Ambient pluck notes
      const beatSec = 60 / clamp(bpm || 84, 65, 120);
      const stepSec = soundtrackStyle === 'upbeat_pulse' ? beatSec * 0.5 : beatSec;
      const totalSteps = Math.floor(durationSeconds / stepSec);

      for (let i = 0; i < totalSteps; i++) {
        const noteTime = startTime + i * stepSec;
        const freq = pentatonic[(i * 2 + (i % 3)) % pentatonic.length];
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = soundtrackStyle === 'upbeat_pulse' ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq * (i % 4 === 0 ? 1 : 2), noteTime);

        g.gain.setValueAtTime(0.001, noteTime);
        g.gain.linearRampToValueAtTime(soundtrackStyle === 'upbeat_pulse' ? 0.14 : 0.1, noteTime + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0008, noteTime + Math.min(1.4, stepSec * 1.4));

        osc.connect(g);
        g.connect(masterGain);
        osc.start(noteTime);
        osc.stop(noteTime + Math.min(1.45, stepSec * 1.45));
      }
    }

    // 2. Scene Transition Sound Effects (soft atmospheric whoosh + chime on scene changes)
    if (photoCount > 1) {
      const sceneDur = durationSeconds / photoCount;
      for (let s = 1; s < photoCount; s++) {
        const cutTime = startTime + s * sceneDur - 0.15;
        const chime = audioCtx.createOscillator();
        const chimeGain = audioCtx.createGain();
        chime.type = 'sine';
        chime.frequency.setValueAtTime(587.33, cutTime);
        chime.frequency.exponentialRampToValueAtTime(880, cutTime + 0.35);

        chimeGain.gain.setValueAtTime(0.001, cutTime);
        chimeGain.gain.linearRampToValueAtTime(0.09, cutTime + 0.08);
        chimeGain.gain.exponentialRampToValueAtTime(0.0008, cutTime + 0.55);

        chime.connect(chimeGain);
        chimeGain.connect(masterGain);
        chime.start(cutTime);
        chime.stop(cutTime + 0.6);
      }
    }

    return {
      stream: dest.stream,
      stop: () => {
        try {
          stopNodes.forEach((n: any) => n.stop?.());
          audioCtx.close().catch(() => undefined);
        } catch {
          // ignore
        }
      },
    };
  } catch {
    return null;
  }
}

export async function renderPhotoToVideo(
  photos: StudioPhotoItem[],
  plan: ChoreographyPlan,
  config: VideoStudioConfig,
  onProgress: (percent: number, stageLabel: string) => void
): Promise<GeneratedVideoArtifact> {
  if (photos.length === 0) {
    throw new Error('Upload at least one photo to generate an animated video.');
  }
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('Your browser does not support video stream encoding (MediaRecorder API).');
  }

  onProgress(6, 'Decoding high-resolution photo layers...');
  const decodedImages = await Promise.all(photos.map((p) => loadHtmlImage(p.dataUrl)));

  const { width, height, bitrate } = getVideoResolution(config.aspectRatio, config.quality);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) {
    throw new Error('Could not initialize 2D hardware render canvas.');
  }

  // Paint initial frame immediately so stream starts clean
  drawStudioFrameAtTime(ctx, decodedImages, plan, config, 0, width, height);

  const canvasStream = canvas.captureStream(30);
  const audioBundle =
    config.includeAudioSfx && config.soundtrackStyle !== 'silent'
      ? scheduleSoundtrackAndSfx(
          config.soundtrackStyle,
          config.durationSeconds,
          decodedImages.length,
          plan.musicTempoBpm
        )
      : null;

  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...(audioBundle ? audioBundle.stream.getAudioTracks() : []),
  ]);

  const preferredMimes = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  const selectedMime = preferredMimes.find((m) => MediaRecorder.isTypeSupported(m)) || 'video/webm';
  const isMp4 = selectedMime.includes('mp4');

  const chunks: BlobPart[] = [];
  const recorder = new MediaRecorder(combinedStream, {
    mimeType: selectedMime,
    videoBitsPerSecond: bitrate,
  });

  recorder.ondataavailable = (ev) => {
    if (ev.data && ev.data.size > 0) {
      chunks.push(ev.data);
    }
  };

  const stopPromise = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: selectedMime }));
    };
    recorder.onerror = (ev: any) => {
      reject(new Error(ev?.error?.message || 'Video encoding interrupted.'));
    };
  });

  onProgress(12, `Encoding ${config.quality} (${width}x${height}) cinematic frames...`);
  recorder.start(250);

  const durationMs = config.durationSeconds * 1000;
  const startPerf = performance.now();

  await new Promise<void>((resolve) => {
    const tick = () => {
      const elapsedMs = performance.now() - startPerf;
      const elapsedSec = Math.min(config.durationSeconds, elapsedMs / 1000);
      drawStudioFrameAtTime(ctx, decodedImages, plan, config, elapsedSec, width, height);

      const pct = Math.min(96, Math.round(12 + (elapsedMs / durationMs) * 84));
      onProgress(pct, `Rendering motion ${elapsedSec.toFixed(1)}s / ${config.durationSeconds}s...`);

      if (elapsedMs < durationMs) {
        requestAnimationFrame(tick);
      } else {
        resolve();
      }
    };
    requestAnimationFrame(tick);
  });

  onProgress(98, 'Finalizing video container & audio sync...');
  if (recorder.state !== 'inactive') {
    recorder.stop();
  }
  audioBundle?.stop();
  combinedStream.getTracks().forEach((t) => t.stop());

  const blob = await stopPromise;
  const url = URL.createObjectURL(blob);

  onProgress(100, 'Animated video ready.');
  return {
    id: `vid_${Date.now().toString(36)}`,
    url,
    blob,
    mimeType: selectedMime,
    fileExtension: isMp4 ? 'mp4' : 'webm',
    fileSizeBytes: blob.size,
    durationSeconds: config.durationSeconds,
    aspectRatio: config.aspectRatio,
    quality: config.quality,
    resolutionLabel: `${width}×${height}`,
    photoCount: photos.length,
    prompt: config.prompt,
    createdAt: new Date().toISOString(),
    choreographySummary: plan.choreographySummary,
    hasAudio: Boolean(audioBundle),
  };
}
