/**
 * Astronomical Sunrise / Sunset & Adaptive Time-of-Day Calculator
 *
 * Uses NOAA solar declination, equation of time, and solar hour angle
 * formulas to compute local sunrise and sunset for the user's geolocation
 * coordinates or resolved IANA timezone.
 */

export type AdaptiveThemeMode = 'auto' | 'gold-ambient' | 'obsidian-deep';
export type AdaptiveAesthetic = 'gold-ambient' | 'obsidian-deep';
export type SunCycleSource = 'geolocation' | 'timezone' | 'custom-schedule';

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
  label?: string;
}

export interface AdaptiveThemeSettings {
  mode: AdaptiveThemeMode;
  useCustomSchedule: boolean;
  customSunrise: string; // "HH:MM" 24-hour local time
  customSunset: string; // "HH:MM" 24-hour local time
  coordinates: GeoCoordinates | null;
}

export interface SunCycleEvaluation {
  aesthetic: AdaptiveAesthetic;
  isDaytime: boolean;
  sunrise: Date;
  sunset: Date;
  sunriseFormatted: string;
  sunsetFormatted: string;
  nextTransitionAt: Date;
  nextTransitionAesthetic: AdaptiveAesthetic;
  nextTransitionFormatted: string;
  minutesUntilTransition: number;
  solarProgressPct: number;
  source: SunCycleSource;
  locationLabel: string;
}

export const DEFAULT_CUSTOM_SUNRISE = '06:30';
export const DEFAULT_CUSTOM_SUNSET = '18:30';

export const DEFAULT_ADAPTIVE_THEME_SETTINGS: AdaptiveThemeSettings = {
  mode: 'auto',
  useCustomSchedule: false,
  customSunrise: DEFAULT_CUSTOM_SUNRISE,
  customSunset: DEFAULT_CUSTOM_SUNSET,
  coordinates: null,
};

const TIMEZONE_COORDINATES: Record<string, { lat: number; lng: number; city: string }> = {
  'Africa/Asmara': { lat: 15.3229, lng: 38.9251, city: 'Asmara, Eritrea' },
  'Africa/Asmera': { lat: 15.3229, lng: 38.9251, city: 'Asmara, Eritrea' },
  'Africa/Addis_Ababa': { lat: 9.032, lng: 38.7469, city: 'Addis Ababa' },
  'Africa/Nairobi': { lat: -1.2921, lng: 36.8219, city: 'Nairobi' },
  'Africa/Khartoum': { lat: 15.5007, lng: 32.5599, city: 'Khartoum' },
  'Africa/Cairo': { lat: 30.0444, lng: 31.2357, city: 'Cairo' },
  'Europe/London': { lat: 51.5074, lng: -0.1278, city: 'London' },
  'Europe/Berlin': { lat: 52.52, lng: 13.405, city: 'Berlin' },
  'Europe/Frankfurt': { lat: 50.1109, lng: 8.6821, city: 'Frankfurt' },
  'Europe/Paris': { lat: 48.8566, lng: 2.3522, city: 'Paris' },
  'Europe/Rome': { lat: 41.9028, lng: 12.4964, city: 'Rome' },
  'Europe/Stockholm': { lat: 59.3293, lng: 18.0686, city: 'Stockholm' },
  'Europe/Oslo': { lat: 59.9139, lng: 10.7522, city: 'Oslo' },
  'Europe/Zurich': { lat: 47.3769, lng: 8.5417, city: 'Zurich' },
  'Asia/Riyadh': { lat: 24.7136, lng: 46.6753, city: 'Riyadh' },
  'Asia/Dubai': { lat: 25.2048, lng: 55.2708, city: 'Dubai' },
  'Asia/Jerusalem': { lat: 31.7683, lng: 35.2137, city: 'Jerusalem' },
  'Asia/Tokyo': { lat: 35.6762, lng: 139.6503, city: 'Tokyo' },
  'Australia/Sydney': { lat: -33.8688, lng: 151.2093, city: 'Sydney' },
  'America/New_York': { lat: 40.7128, lng: -74.006, city: 'New York' },
  'America/Chicago': { lat: 41.8781, lng: -87.6298, city: 'Chicago' },
  'America/Denver': { lat: 39.7392, lng: -104.9903, city: 'Denver' },
  'America/Los_Angeles': { lat: 34.0522, lng: -118.2437, city: 'Los Angeles' },
  'America/Toronto': { lat: 43.6532, lng: -79.3832, city: 'Toronto' },
  'America/Seattle': { lat: 47.6062, lng: -122.3321, city: 'Seattle' },
};

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

export function getResolvedTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function resolveCoordinatesFromTimezone(now: Date = new Date()): {
  latitude: number;
  longitude: number;
  label: string;
} {
  const tz = getResolvedTimeZone();
  const known = TIMEZONE_COORDINATES[tz];
  if (known) {
    return { latitude: known.lat, longitude: known.lng, label: known.city };
  }

  // Fallback estimation based on UTC offset longitude
  const offsetHours = -now.getTimezoneOffset() / 60;
  const approxLng = Math.max(-180, Math.min(180, offsetHours * 15));
  const label = tz.includes('/') ? tz.split('/').pop()!.replace(/_/g, ' ') : tz;
  return { latitude: 20, longitude: approxLng, label };
}

export function formatTimeHHMM(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export function parseTimeHHMM(value: string, baseDate: Date): Date {
  const match = /^(\d{1,2}):(\d{2})$/.exec((value || '').trim());
  const d = new Date(baseDate);
  if (!match) {
    d.setHours(6, 30, 0, 0);
    return d;
  }
  const hours = Math.max(0, Math.min(23, Number(match[1])));
  const minutes = Math.max(0, Math.min(59, Number(match[2])));
  d.setHours(hours, minutes, 0, 0);
  return d;
}

/**
 * NOAA General Solar Position sunrise/sunset calculation for the local calendar day.
 */
export function calculateSunTimes(
  baseDate: Date,
  latitude: number,
  longitude: number
): { sunrise: Date; sunset: Date } {
  const localMidnight = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate(),
    12,
    0,
    0,
    0
  );

  // Day of year (1..366)
  const startOfYear = new Date(baseDate.getFullYear(), 0, 1);
  const dayOfYear =
    Math.floor((localMidnight.getTime() - startOfYear.getTime()) / 86400000) + 1;

  // Fractional year (radians)
  const gamma = ((2 * Math.PI) / 365) * (dayOfYear - 1);

  // Equation of time (minutes)
  const eqTime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));

  // Solar declination angle (radians)
  const decl =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);

  const clampedLat = Math.max(-65, Math.min(65, latitude));
  const latRad = clampedLat * DEG_TO_RAD;
  const zenithRad = 90.833 * DEG_TO_RAD;

  const cosHourAngle =
    Math.cos(zenithRad) / (Math.cos(latRad) * Math.cos(decl)) -
    Math.tan(latRad) * Math.tan(decl);

  const clampedCos = Math.max(-0.98, Math.min(0.98, cosHourAngle));
  const hourAngleDeg = Math.acos(clampedCos) * RAD_TO_DEG;

  const tzOffsetMinutes = -baseDate.getTimezoneOffset();
  const solarNoonMinutes = 720 - 4 * longitude - eqTime + tzOffsetMinutes;

  const sunriseMinutes = solarNoonMinutes - 4 * hourAngleDeg;
  const sunsetMinutes = solarNoonMinutes + 4 * hourAngleDeg;

  const makeLocalDateFromMinutes = (mins: number) => {
    const d = new Date(
      baseDate.getFullYear(),
      baseDate.getMonth(),
      baseDate.getDate(),
      0,
      0,
      0,
      0
    );
    d.setMinutes(Math.round(mins));
    return d;
  };

  let sunrise = makeLocalDateFromMinutes(sunriseMinutes);
  let sunset = makeLocalDateFromMinutes(sunsetMinutes);

  // Guard against edge-case inverted custom timezone offsets
  if (sunset.getTime() <= sunrise.getTime()) {
    sunrise = parseTimeHHMM(DEFAULT_CUSTOM_SUNRISE, baseDate);
    sunset = parseTimeHHMM(DEFAULT_CUSTOM_SUNSET, baseDate);
  }

  return { sunrise, sunset };
}

export function evaluateSunCycleState(
  now: Date,
  settings: AdaptiveThemeSettings
): SunCycleEvaluation {
  let sunrise: Date;
  let sunset: Date;
  let source: SunCycleSource;
  let locationLabel: string;

  if (settings.useCustomSchedule) {
    sunrise = parseTimeHHMM(settings.customSunrise, now);
    sunset = parseTimeHHMM(settings.customSunset, now);
    if (sunset.getTime() <= sunrise.getTime()) {
      sunset = new Date(sunrise.getTime() + 12 * 3600000);
    }
    source = 'custom-schedule';
    locationLabel = 'Custom Schedule';
  } else if (settings.coordinates) {
    const computed = calculateSunTimes(
      now,
      settings.coordinates.latitude,
      settings.coordinates.longitude
    );
    sunrise = computed.sunrise;
    sunset = computed.sunset;
    source = 'geolocation';
    locationLabel =
      settings.coordinates.label ||
      `${settings.coordinates.latitude.toFixed(2)}°, ${settings.coordinates.longitude.toFixed(2)}°`;
  } else {
    const tzCoords = resolveCoordinatesFromTimezone(now);
    const computed = calculateSunTimes(now, tzCoords.latitude, tzCoords.longitude);
    sunrise = computed.sunrise;
    sunset = computed.sunset;
    source = 'timezone';
    locationLabel = tzCoords.label;
  }

  const nowMs = now.getTime();
  const sunriseMs = sunrise.getTime();
  const sunsetMs = sunset.getTime();
  const isDaytime = nowMs >= sunriseMs && nowMs < sunsetMs;
  const sunBasedAesthetic: AdaptiveAesthetic = isDaytime ? 'gold-ambient' : 'obsidian-deep';

  const aesthetic: AdaptiveAesthetic =
    settings.mode === 'auto' ? sunBasedAesthetic : settings.mode;

  // Compute next boundary & progress
  let nextTransitionAt: Date;
  let nextTransitionAesthetic: AdaptiveAesthetic;
  let solarProgressPct: number;

  if (isDaytime) {
    nextTransitionAt = sunset;
    nextTransitionAesthetic = 'obsidian-deep';
    const dayDuration = Math.max(1, sunsetMs - sunriseMs);
    solarProgressPct = Math.max(
      0,
      Math.min(100, Math.round(((nowMs - sunriseMs) / dayDuration) * 100))
    );
  } else if (nowMs < sunriseMs) {
    // Early morning before today's sunrise
    const prevSunsetMs = sunsetMs - 24 * 3600000;
    nextTransitionAt = sunrise;
    nextTransitionAesthetic = 'gold-ambient';
    const nightDuration = Math.max(1, sunriseMs - prevSunsetMs);
    solarProgressPct = Math.max(
      0,
      Math.min(100, Math.round(((nowMs - prevSunsetMs) / nightDuration) * 100))
    );
  } else {
    // Evening after today's sunset -> tomorrow's sunrise
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextDayTimes = settings.useCustomSchedule
      ? { sunrise: parseTimeHHMM(settings.customSunrise, tomorrow) }
      : settings.coordinates
      ? calculateSunTimes(tomorrow, settings.coordinates.latitude, settings.coordinates.longitude)
      : (() => {
          const c = resolveCoordinatesFromTimezone(tomorrow);
          return calculateSunTimes(tomorrow, c.latitude, c.longitude);
        })();
    nextTransitionAt = nextDayTimes.sunrise;
    nextTransitionAesthetic = 'gold-ambient';
    const nightDuration = Math.max(1, nextTransitionAt.getTime() - sunsetMs);
    solarProgressPct = Math.max(
      0,
      Math.min(100, Math.round(((nowMs - sunsetMs) / nightDuration) * 100))
    );
  }

  const minutesUntilTransition = Math.max(
    1,
    Math.ceil((nextTransitionAt.getTime() - nowMs) / 60000)
  );

  return {
    aesthetic,
    isDaytime,
    sunrise,
    sunset,
    sunriseFormatted: formatTimeHHMM(sunrise),
    sunsetFormatted: formatTimeHHMM(sunset),
    nextTransitionAt,
    nextTransitionAesthetic,
    nextTransitionFormatted: formatTimeHHMM(nextTransitionAt),
    minutesUntilTransition,
    solarProgressPct,
    source,
    locationLabel,
  };
}
