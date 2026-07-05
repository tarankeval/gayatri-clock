/**
 * Gayatri Time Calculator
 *
 * Calculates Gayatri Muhurta, Brahma Muhurta, and Panchang (Hindu calendar)
 * based on geographical location and date.
 *
 * Gayatri Muhurta (Savitur Muhurta) = The 30th Muhurta ending at sunrise
 * Brahma Muhurta = The 29th Muhurta (the one before Gayatri Muhurta)
 *
 * In Vedic timekeeping, one day (sunrise-to-sunrise) is divided into 30
 * equal Muhurtas. The 30th Muhurta ends exactly at sunrise, making it
 * the most potent time for chanting the Gayatri Mantra.
 */

import { getTimes } from "suncalc";

// ─── Types ──────────────────────────────────────────────────────────────

export interface LocationInfo {
  lat: number;
  lng: number;
  name?: string;
}

export interface GayatriTimes {
  /** Current timestamp */
  now: Date;
  /** Today's sunrise */
  sunrise: Date;
  /** Today's sunset */
  sunset: Date;
  /** Tomorrow's sunrise (used for Muhurta calculation) */
  tomorrowSunrise: Date;
  /** Length of one Muhurta in minutes */
  muhurtaLengthMinutes: number;
  /** Brahma Muhurta start (96 min / 2 Muhurtas before sunrise) */
  brahmaMuhurtaStart: Date;
  /** Brahma Muhurta end / Gayatri Muhurta start */
  brahmaMuhurtaEnd: Date;
  /** Gayatri Muhurta start */
  gayatriMuhurtaStart: Date;
  /** Gayatri Muhurta end (sunrise) */
  gayatriMuhurtaEnd: Date;
  /** Whether we are currently in Gayatri time */
  isGayatriTime: boolean;
  /** Whether we are currently in Brahma Muhurta (includes Gayatri time) */
  isBrahmaMuhurta: boolean;
  /** Next event type */
  nextEvent: "gayatri" | "brahma" | "sunrise" | "none";
  /** Time of the next event */
  nextEventTime: Date | null;
  /** Milliseconds until next event */
  msUntilNextEvent: number;
}

export interface Tithi {
  index: number; // 0-29
  name: string;
  paksha: "Shukla" | "Krishna";
  day: number; // 1-15 within the paksha
}

export interface Nakshatra {
  index: number; // 0-26
  name: string;
  deity: string;
  symbol: string;
}

export interface Yoga {
  index: number; // 0-26
  name: string;
}

export interface Karana {
  index: number; // 0-10
  name: string;
}

export interface Panchang {
  tithi: Tithi;
  nakshatra: Nakshatra;
  yoga: Yoga;
  karana: Karana;
  /** Hindu month (approximate) */
  hinduMonth: string;
  /** Hindu year (approximate) */
  hinduYear: string;
  /** Samvat year */
  samvatYear: string;
  /** Ayanamsa used */
  ayanamsa: string;
}

// ─── Constants ──────────────────────────────────────────────────────────

const TITHI_NAMES: string[] = [
  "Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami",
  "Shashthi", "Saptami", "Ashtami", "Navami", "Dashami",
  "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi", "Purnima",
  "Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami",
  "Shashthi", "Saptami", "Ashtami", "Navami", "Dashami",
  "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi", "Amavasya",
];

const NAKSHATRA_NAMES: Array<{ name: string; deity: string; symbol: string }> = [
  { name: "Ashwini", deity: "Ashwini Kumaras", symbol: "Horse's head" },
  { name: "Bharani", deity: "Yama", symbol: "Yoni" },
  { name: "Krittika", deity: "Agni", symbol: "Razor / Flame" },
  { name: "Rohini", deity: "Prajapati (Brahma)", symbol: "Chariot / Temple" },
  { name: "Mrigashira", deity: "Soma (Chandra)", symbol: "Deer's head" },
  { name: "Ardra", deity: "Rudra (Shiva)", symbol: "Teardrop / Diamond" },
  { name: "Punarvasu", deity: "Aditi", symbol: "Bow and quiver" },
  { name: "Pushya", deity: "Brihaspati (Jupiter)", symbol: "Circle / Flower" },
  { name: "Ashlesha", deity: "Sarpas (Nagas)", symbol: "Serpent" },
  { name: "Magha", deity: "Pitris (Ancestors)", symbol: "Throne" },
  { name: "Purva Phalguni", deity: "Bhaga", symbol: "Front legs of bed" },
  { name: "Uttara Phalguni", deity: "Aryaman", symbol: "Back legs of bed" },
  { name: "Hasta", deity: "Savitur (Sun)", symbol: "Hand / Fist" },
  { name: "Chitra", deity: "Tvashtr (Vishvakarma)", symbol: "Pearl / Jewel" },
  { name: "Swati", deity: "Vayu (Wind god)", symbol: "Coral / Sprout" },
  { name: "Vishakha", deity: "Indra-Agni", symbol: "Decorative arch" },
  { name: "Anuradha", deity: "Mitra", symbol: "Row of lamps" },
  { name: "Jyeshtha", deity: "Indra", symbol: "Earring / Umbrella" },
  { name: "Mula", deity: "Nirriti", symbol: "Bunch of roots" },
  { name: "Purva Ashadha", deity: "Apas (Water)", symbol: "Elephant tusk / Fan" },
  { name: "Uttara Ashadha", deity: "Vishvadevas", symbol: "Elephant tusk" },
  { name: "Shravana", deity: "Vishnu", symbol: "Ear / Three footprints" },
  { name: "Dhanishta", deity: "Vasus", symbol: "Drum / Flute" },
  { name: "Shatabhisha", deity: "Varuna", symbol: "Empty circle / 100 doctors" },
  { name: "Purva Bhadrapada", deity: "Ajaikapada", symbol: "Sword / Front of cot" },
  { name: "Uttara Bhadrapada", deity: "Ahirbudhnya", symbol: "Twins / Back of cot" },
  { name: "Revati", deity: "Pushan", symbol: "Fish / Drum" },
];

const YOGA_NAMES: string[] = [
  "Vishkumbha", "Priti", "Ayushman", "Saubhagya", "Shobhana",
  "Atiganda", "Sukarman", "Dhriti", "Shula", "Ganda",
  "Vriddhi", "Dhruva", "Vyaghata", "Harshana", "Vajra",
  "Siddhi", "Vyatipata", "Variyan", "Parigha", "Shiva",
  "Siddha", "Sadhya", "Shubha", "Shukla", "Brahma",
  "Indra", "Vaidhriti",
];

const KARANA_NAMES: string[] = [
  "Bava", "Balava", "Kaulava", "Taitula", "Garaja",
  "Vanija", "Vishti", "Shakuni", "Chatushpada", "Naga",
  "Kimstughna",
];

const HINDU_MONTHS: string[] = [
  "Chaitra", "Vaishakha", "Jyeshtha", "Ashadha",
  "Shravana", "Bhadrapada", "Ashvina", "Kartika",
  "Agrahayana", "Pausha", "Magha", "Phalguna",
];

// ─── Julian Day Helpers ────────────────────────────────────────────────

function toJulian(date: Date): number {
  const d = new Date(date);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  const hour = d.getUTCHours();
  const minute = d.getUTCMinutes();
  const second = d.getUTCSeconds();

  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;

  const jdn =
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045;

  const jd = jdn + (hour - 12) / 24 + minute / 1440 + second / 86400;
  return jd;
}

function fromJulian(jd: number): Date {
  const jd0 = Math.floor(jd + 0.5);
  const dayFraction = jd + 0.5 - jd0;

  const a = jd0;
  const b = a + 1524;
  const c = Math.floor((b - 122.1) / 365.25);
  const d = Math.floor(365.25 * c);
  const e = Math.floor((b - d) / 30.6001);

  const day = b - d - Math.floor(30.6001 * e);
  const month = e < 14 ? e - 1 : e - 13;
  const year = month > 2 ? c - 4716 : c - 4715;

  const totalSeconds = dayFraction * 86400;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  return new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
}

// ─── Solar Position (accuracy ~0.01°) ──────────────────────────────────

function calcSunLongitude(jd: number): number {
  const n = jd - 2451545.0;
  const L = 280.46646 + 0.98564736 * n; // mean longitude
  const g = (357.52911 + 0.98560028 * n) % 360; // mean anomaly

  const gRad = (g * Math.PI) / 180;
  const lambda =
    L +
    1.914602 * Math.sin(gRad) +
    0.019993 * Math.sin(2 * gRad) +
    0.000289 * Math.sin(3 * gRad);

  return ((lambda % 360) + 360) % 360;
}

// ─── Lunar Position (accuracy ~1°) ─────────────────────────────────────

function calcMoonLongitude(jd: number): number {
  const n = jd - 2451545.0;

  // Mean longitude of the Moon
  const L_moon = (218.3165 + 13.176396 * n) % 360;
  // Mean anomaly of the Moon
  const M_moon = (134.9634 + 13.064993 * n) % 360;
  // Mean elongation of the Moon
  const D = (297.8502 + 12.190749 * n) % 360;
  // Argument of latitude
  const F = (93.272 + 13.22935 * n) % 360;

  const M_rad = (M_moon * Math.PI) / 180;
  const D_rad = (D * Math.PI) / 180;
  const F_rad = (F * Math.PI) / 180;

  // Major corrections to ecliptic longitude (simplified ELP-2000)
  let lambda_moon =
    L_moon +
    6.289 * Math.sin(M_rad) +
    1.274 * Math.sin(2 * D_rad - M_rad) +
    0.658 * Math.sin(2 * D_rad) +
    0.214 * Math.sin(2 * M_rad) -
    0.186 * Math.sin(M_rad - 2 * D_rad) -
    0.114 * Math.sin(2 * F_rad) -
    0.059 * Math.sin(2 * D_rad - 2 * M_rad) -
    0.057 * Math.sin(2 * D_rad + M_rad) +
    0.053 * Math.sin(2 * D_rad + 2 * M_rad) +
    0.046 * Math.sin(2 * D_rad - 2 * F_rad) +
    0.041 * Math.sin(M_rad - 2 * D_rad - 2 * M_rad) -
    0.035 * Math.sin(M_rad + 2 * D_rad) -
    0.031 * Math.sin(M_rad - 2 * D_rad + 2 * M_rad) -
    0.015 * Math.sin(2 * F_rad - 2 * D_rad);

  return ((lambda_moon % 360) + 360) % 360;
}

// ─── Sunrise / Sunset ──────────────────────────────────────────────────

/**
 * Calculate sunrise time for a given date, latitude, and longitude.
 * Returns the sunrise Date, or null if there is no sunrise (polar night).
 */
export function calcSunrise(
  lat: number,
  lng: number,
  date: Date,
): Date | null {    const times = getTimes(date, lat, lng);
    return times.sunrise || null;
}

/**
 * Calculate sunset time for a given date, latitude, and longitude.
 */
export function calcSunset(
  lat: number,
  lng: number,
  date: Date,
): Date | null {    const times = getTimes(date, lat, lng);
    return times.sunset || null;
}

// ─── Gayatri / Brahma Muhurta Calculation ──────────────────────────────

/**
 * Calculate the Gayatri and Brahma Muhurta times for a given location.
 *
 * In Vedic timekeeping, one full day (sunrise to next sunrise) is divided
 * into 30 equal Muhurtas. The 30th Muhurta (Savitur/Gayatri) ends at sunrise.
 * The 29th Muhurta (Brahma) precedes it.
 *
 * Gayatri Muhurta = The last Muhurta before sunrise (~48 min)
 * Brahma Muhurta = The two Muhurtas before sunrise (~96 min)
 */
export function calcGayatriTimes(lat: number, lng: number): GayatriTimes {
  const now = new Date();

  // Get today's sunrise
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const sunrise = calcSunrise(lat, lng, today);

  if (!sunrise) {
    // Fallback: if no sunrise (polar), use a default
    throw new Error("Could not calculate sunrise for this location and date.");
  }

  // If we are before sunrise today, use yesterday's sunrise for calculation
  // Actually, let's recalculate: the "day" starts at sunrise
  let currentSunrise: Date;
  let nextSunrise: Date;

  if (now < sunrise) {
    // We are before sunrise, so use yesterday's sunrise as the start
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdaySunrise = calcSunrise(lat, lng, yesterday);
    currentSunrise = yesterdaySunrise || sunrise;
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    nextSunrise = calcSunrise(lat, lng, tomorrow) || new Date(sunrise.getTime() + 86400000);
  } else {
    currentSunrise = sunrise;
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    nextSunrise = calcSunrise(lat, lng, tomorrow) || new Date(sunrise.getTime() + 86400000);
  }

  // Calculate Muhurta length
  const dayDurationMs = nextSunrise.getTime() - currentSunrise.getTime();
  const muhurtaLengthMinutes = dayDurationMs / (30 * 60 * 1000);

  // Gayatri Muhurta = last Muhurta (30th), ending at sunrise
  const gayatriMuhurtaStart = new Date(
    nextSunrise.getTime() - muhurtaLengthMinutes * 60 * 1000,
  );
  const gayatriMuhurtaEnd = nextSunrise;

  // Brahma Muhurta = 29th + 30th Muhurtas, ending at sunrise
  const brahmaMuhurtaStart = new Date(
    nextSunrise.getTime() - 2 * muhurtaLengthMinutes * 60 * 1000,
  );
  const brahmaMuhurtaEnd = nextSunrise;

  const isGayatriTime = now >= gayatriMuhurtaStart && now < gayatriMuhurtaEnd;
  const isBrahmaMuhurta = now >= brahmaMuhurtaStart && now < brahmaMuhurtaEnd;

  // Find the next event
  const events: Array<{ type: "gayatri" | "brahma" | "sunrise"; time: Date }> = [];

  // If current brahma has already passed, look to next cycle
  const todayEvening = new Date(now);
  todayEvening.setHours(23, 59, 59, 999);

  if (brahmaMuhurtaStart > now) {
    events.push({ type: "brahma", time: brahmaMuhurtaStart });
    events.push({ type: "gayatri", time: gayatriMuhurtaStart });
    events.push({ type: "sunrise", time: nextSunrise });
  } else if (gayatriMuhurtaStart > now) {
    events.push({ type: "gayatri", time: gayatriMuhurtaStart });
    events.push({ type: "sunrise", time: nextSunrise });
  } else {
    // Brahma and Gayatri have passed, look to tomorrow
    const dayAfter = new Date(today);
    dayAfter.setDate(dayAfter.getDate() + 2);
    const dayAfterSunrise = calcSunrise(lat, lng, dayAfter);
    const nextBrahmaStart = dayAfterSunrise
      ? new Date(dayAfterSunrise.getTime() - 2 * muhurtaLengthMinutes * 60 * 1000)
      : null;
    const nextGayatriStart = dayAfterSunrise
      ? new Date(dayAfterSunrise.getTime() - muhurtaLengthMinutes * 60 * 1000)
      : null;
    if (nextBrahmaStart) events.push({ type: "brahma", time: nextBrahmaStart });
    if (nextGayatriStart) events.push({ type: "gayatri", time: nextGayatriStart });
    if (dayAfterSunrise) events.push({ type: "sunrise", time: dayAfterSunrise });
  }

  events.sort((a, b) => a.time.getTime() - b.time.getTime());

  // Get sunset
  const sunset = calcSunset(lat, lng, today) || new Date(sunrise.getTime() + 43200000);

  let nextEvent: "gayatri" | "brahma" | "sunrise" | "none" = "none";
  let nextEventTime: Date | null = null;
  let msUntilNextEvent = 0;

  if (events.length > 0) {
    // Filter to events that are still in the future
    const futureEvents = events.filter((e) => e.time > now);
    if (futureEvents.length > 0) {
      nextEvent = futureEvents[0].type;
      nextEventTime = futureEvents[0].time;
      msUntilNextEvent = nextEventTime.getTime() - now.getTime();
    }
  }

  return {
    now,
    sunrise: currentSunrise,
    sunset,
    tomorrowSunrise: nextSunrise,
    muhurtaLengthMinutes,
    brahmaMuhurtaStart,
    brahmaMuhurtaEnd,
    gayatriMuhurtaStart,
    gayatriMuhurtaEnd,
    isGayatriTime,
    isBrahmaMuhurta,
    nextEvent,
    nextEventTime,
    msUntilNextEvent,
  };
}

// ─── Panchang (Hindu Calendar) Calculations ─────────────────────────────

// Lazy-loaded wasm panchangam library for high-precision calculations
let _panchangamModule: typeof import("@fusionstrings/panchangam") | null = null;
let _panchangamLoadAttempted = false;

async function loadPanchangam(): Promise<typeof import("@fusionstrings/panchangam") | null> {
  if (_panchangamModule) return _panchangamModule;
  if (_panchangamLoadAttempted) return null;
  _panchangamLoadAttempted = true;
  try {
    // Dynamic import — may fail in some browser/Vite setups due to Wasm loading
    const mod = await import("@fusionstrings/panchangam");
    _panchangamModule = mod;
    return mod;
  } catch {
    return null;
  }
}

/**
 * Calculate the Hindu calendar elements (Panchang) for a given date and location.
 * Uses Swiss Ephemeris via @fusionstrings/panchangam when available, with
 * graceful fallback to our simplified calculations.
 */
export async function calcPanchangAsync(
  date: Date,
  lat: number,
  lng: number,
): Promise<Panchang> {
  const mod = await loadPanchangam();
  if (mod) {
    try {
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      // Use the Location class from the library
      const loc = new mod.Location(lat, lng, 0);
      try {
        // Mode 1 = Lahiri (standard Chitrapaksha Ayanamsa)
        const result = mod.calculate_daily_panchang(year, month, day, loc, 1);

        // Tithi: index is 1-30, 15 = Purnima, 30 = Amavasya
        const tithiIdx = result.tithi_index; // 1-30

        const tithi: Tithi = {
          index: tithiIdx - 1,
          name: result.tithi_name.replace("Shukla-", "").replace("Krishna-", ""),
          paksha: tithiIdx <= 15 ? "Shukla" : "Krishna",
          day: tithiIdx <= 15 ? tithiIdx : tithiIdx - 15,
        };

        // Nakshatra: index is 1-27
        const nakshatraIdx = result.nakshatra_index - 1;
        const nakshatraData = NAKSHATRA_NAMES[nakshatraIdx] || {
          name: result.nakshatra_name,
          deity: "",
          symbol: "",
        };

        const nakshatra: Nakshatra = {
          index: nakshatraIdx,
          name: result.nakshatra_name,
          deity: nakshatraData.deity,
          symbol: nakshatraData.symbol,
        };

        // Yoga: index is 1-27
        const yoga: Yoga = {
          index: result.yoga_index - 1,
          name: result.yoga_name,
        };

        // Karana: use the library's name directly; index is best-effort
        const karana: Karana = {
          index: KARANA_NAMES.indexOf(result.karana_name) >= 0
            ? KARANA_NAMES.indexOf(result.karana_name)
            : 0,
          name: result.karana_name,
        };

        // Hindu month from Sun longitude (approximation)
        const jdLocal = toJulian(date);
        const sunLong = calcSunLongitude(jdLocal);
        const solarMonthIndex = Math.floor(
          (((sunLong - 23.5) % 360) + 360) % 360 / 30,
        );
        const hinduMonth = HINDU_MONTHS[solarMonthIndex % 12];

        const gregYear = date.getFullYear();
        const samvatYear = `${gregYear + 57}`;

        const resultObj = {
          tithi,
          nakshatra,
          yoga,
          karana,
          hinduMonth,
          hinduYear: `${gregYear}`,
          samvatYear: `Vikram Samvat ${samvatYear}`,
          ayanamsa: `Lahiri (Swiss Eph) — ${result.ayanamsha_value.toFixed(4)}°`,
        };

        result.free();
        return resultObj;
      } finally {
        loc.free();
      }
    } catch {
      // Fall through to simplified calculation
    }
  }

  return calcPanchangSimple(date, lat, lng);
}

/**
 * Simplified Panchang calculation (fallback when Wasm library is unavailable).
 */
export function calcPanchangSimple(
  date: Date,
  lat: number,
  lng: number,
): Panchang {
  const jd = toJulian(date);

  const sunrise = calcSunrise(lat, lng, date);
  const sunriseJD = sunrise ? toJulian(sunrise) : jd;

  const sunLong = calcSunLongitude(sunriseJD);
  const moonLong = calcMoonLongitude(sunriseJD);

  let diff = moonLong - sunLong;
  if (diff < 0) diff += 360;
  const tithiIndex = Math.floor(diff / 12);
  const clampedIndex = Math.max(0, Math.min(29, tithiIndex));

  const tithi: Tithi = {
    index: clampedIndex,
    name: TITHI_NAMES[clampedIndex],
    paksha: clampedIndex < 15 ? "Shukla" : "Krishna",
    day: clampedIndex < 15 ? clampedIndex + 1 : clampedIndex - 14,
  };

  const nakshatraIndex = Math.floor(moonLong / 13.333333);
  const nIndex = Math.max(0, Math.min(26, nakshatraIndex));
  const nakshatraData = NAKSHATRA_NAMES[nIndex];

  const nakshatra: Nakshatra = {
    index: nIndex,
    name: nakshatraData.name,
    deity: nakshatraData.deity,
    symbol: nakshatraData.symbol,
  };

  let sum = sunLong + moonLong;
  sum = sum % 360;
  const yogaIndex = Math.floor(sum / 13.333333);
  const yIndex = Math.max(0, Math.min(26, yogaIndex));

  const yoga: Yoga = {
    index: yIndex,
    name: YOGA_NAMES[yIndex],
  };

  const halfTithiIndex = tithiIndex * 2;
  const karanaIdx = halfTithiIndex % 7 < 7
    ? halfTithiIndex % 7
    : (halfTithiIndex >= 56 ? (halfTithiIndex - 56) + 7 : halfTithiIndex % 7);
  const kIndex = Math.max(0, Math.min(10, karanaIdx));

  const karana: Karana = {
    index: kIndex,
    name: KARANA_NAMES[kIndex],
  };

  const solarMonthIndex = Math.floor(
    (((sunLong - 23.5) % 360) + 360) % 360 / 30,
  );
  const hinduMonth = HINDU_MONTHS[solarMonthIndex % 12];

  const gregYear = date.getFullYear();
  const samvatYear = `${gregYear + 57}`;

  return {
    tithi,
    nakshatra,
    yoga,
    karana,
    hinduMonth,
    hinduYear: `${gregYear}`,
    samvatYear: `Vikram Samvat ${samvatYear}`,
    ayanamsa: "Lahiri (simplified)",
  };
}

/**
 * Calculate the Hindu calendar elements (Panchang) for a given date and location.
 * Synchronous version that uses the simplified calculation.
 */
export function calcPanchang(date: Date, lat: number, lng: number): Panchang {
  return calcPanchangSimple(date, lat, lng);
}

// ─── Theme Persistence ──────────────────────────────────────────────────

const THEME_STORAGE_KEY = "gayatri-time-theme";

export type ThemeMode = "light" | "sepia" | "dark";

/**
 * Save the theme preference to localStorage.
 */
export function saveTheme(theme: ThemeMode): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // ignore
  }
}

/**
 * Load a previously saved theme preference from localStorage.
 */
export function loadTheme(): ThemeMode {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (raw === "light" || raw === "sepia" || raw === "dark") return raw;
  } catch {
    // ignore
  }
  return "light";
}

// ─── Location Persistence ──────────────────────────────────────────────

const STORAGE_KEY = "gayatri-time-location";

/**
 * Save the user's location to localStorage so it persists across sessions.
 */
export function saveLocation(loc: LocationInfo): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
  } catch {
    // Storage may be full or unavailable — silently ignore
  }
}

/**
 * Load a previously saved location from localStorage.
 */
export function loadLocation(): LocationInfo | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocationInfo;
    if (
      typeof parsed.lat === "number" &&
      typeof parsed.lng === "number" &&
      parsed.lat >= -90 &&
      parsed.lat <= 90 &&
      parsed.lng >= -180 &&
      parsed.lng <= 180
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Clear the saved location from localStorage.
 */
export function clearLocation(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

// ─── Location ──────────────────────────────────────────────────────────

/**
 * Get the user's current location using the Geolocation API.
 */
export function getCurrentLocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000,
    });
  });
}

/**
 * Get a location name from coordinates using reverse geocoding.
 */
export async function getLocationName(
  lat: number,
  lng: number,
): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=10`,
      {
        headers: { "User-Agent": "GayatriTimeApp/1.0" },
      },
    );
    const data = await res.json();
    return (
      data.address?.city ||
      data.address?.town ||
      data.address?.village ||
      data.address?.county ||
      data.display_name?.split(",")[0] ||
      `${lat.toFixed(2)}°, ${lng.toFixed(2)}°`
    );
  } catch {
    return `${lat.toFixed(2)}°, ${lng.toFixed(2)}°`;
  }
}

/**
 * Search for a city by name using Nominatim's search API.
 * Returns matching locations with lat/lng and display names.
 */
export interface CitySearchResult {
  lat: number;
  lng: number;
  name: string;
  displayName: string;
  country: string;
  type: string;
}

export async function searchCity(
  query: string,
): Promise<CitySearchResult[]> {
  if (!query || query.trim().length < 2) return [];
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query.trim())}&limit=5&addressdetails=1`,
      {
        headers: { "User-Agent": "GayatriTimeApp/1.0" },
      },
    );
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map((item: any) => ({
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      name: item.address?.city || item.address?.town || item.address?.village || item.display_name?.split(",")[0] || item.display_name || "Unknown",
      displayName: item.display_name || "",
      country: item.address?.country || "",
      type: item.type || "",
    }));
  } catch {
    return [];
  }
}

// ─── Multi-Day Calendar ─────────────────────────────────────────────

/**
 * A lightweight day summary for the schedule view.
 */
export interface DaySchedule {
  /** The date of this day (midnight local time) */
  date: Date;
  /** Formatted weekday name */
  weekday: string;
  /** Formatted date string */
  dateStr: string;
  /** Whether this day is today */
  isToday: boolean;
  /** Gayatri Muhurta start time */
  gayatriStart: Date;
  /** Gayatri Muhurta end (sunrise) */
  gayatriEnd: Date;
  /** Brahma Muhurta start time */
  brahmaStart: Date;
  /** Brahma Muhurta end (same as gayatriStart) */
  brahmaEnd: Date;
  /** Sunrise time */
  sunrise: Date;
  /** Muhurta length in minutes */
  muhurtaLengthMinutes: number;
  /** Tithi name (approximate) */
  tithi: string;
  /** Nakshatra name (approximate) */
  nakshatra: string;
}

/**
 * Calculate Gayatri times for a specific date at a given location.
 *
 * For a given date D, returns the Gayatri Muhurta ending at D's sunrise
 * (i.e. the sacred time window on the morning of date D).
 */
export function calcGayatriTimesForDate(
  lat: number,
  lng: number,
  date: Date,
): Omit<GayatriTimes, "now" | "isGayatriTime" | "isBrahmaMuhurta" | "nextEvent" | "nextEventTime" | "msUntilNextEvent"> {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);

  const sunrise = calcSunrise(lat, lng, dayStart);
  if (!sunrise) {
    throw new Error(`No sunrise for ${dayStart.toDateString()}`);
  }

  // Use yesterday's sunrise as the day start to compute Muhurta length
  // The Gayatri Muhurta ends at today's sunrise, so the day duration
  // is from yesterday's sunrise to today's sunrise.
  const prevDay = new Date(dayStart);
  prevDay.setDate(prevDay.getDate() - 1);
  const prevSunrise = calcSunrise(lat, lng, prevDay);
  if (!prevSunrise) {
    throw new Error(`No sunrise for ${prevDay.toDateString()}`);
  }

  const dayDurationMs = sunrise.getTime() - prevSunrise.getTime();
  const muhurtaLengthMinutes = dayDurationMs / (30 * 60 * 1000);

  // Gayatri Muhurta ends at today's sunrise (the 30th Muhurta)
  const gayatriStart = new Date(
    sunrise.getTime() - muhurtaLengthMinutes * 60 * 1000,
  );
  const gayatriEnd = sunrise;

  // Brahma Muhurta = 29th + 30th Muhurtas, ending at today's sunrise
  const brahmaStart = new Date(
    sunrise.getTime() - 2 * muhurtaLengthMinutes * 60 * 1000,
  );
  const brahmaEnd = sunrise;

  // Tomorrow's sunrise (for reference)
  const nextDay = new Date(dayStart);
  nextDay.setDate(nextDay.getDate() + 1);
  const nextSunrise = calcSunrise(lat, lng, nextDay) || new Date(sunrise.getTime() + 86400000);

  // Today's sunset
  const sunset = calcSunset(lat, lng, dayStart) || new Date(sunrise.getTime() + 43200000);

  return {
    sunrise,
    sunset,
    tomorrowSunrise: nextSunrise,
    muhurtaLengthMinutes,
    brahmaMuhurtaStart: brahmaStart,
    brahmaMuhurtaEnd: brahmaEnd,
    gayatriMuhurtaStart: gayatriStart,
    gayatriMuhurtaEnd: gayatriEnd,
  };
}

/**
 * Calculate Gayatri times and Panchang for a range of upcoming days.
 * Uses the Swiss Ephemeris library for accurate Panchang when available.
 */
export async function calcGayatriTimesForRange(
  lat: number,
  lng: number,
  numDays: number,
  locale: string = "en-US",
): Promise<DaySchedule[]> {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();

  const days: DaySchedule[] = [];

  for (let i = 0; i < numDays; i++) {
    const day = new Date(today);
    day.setDate(day.getDate() + i);

    try {
      const times = calcGayatriTimesForDate(lat, lng, day);
      // Try async panchang (Swiss Eph) first; fallback is handled internally
      const panch = await calcPanchangAsync(day, lat, lng);

      days.push({
        date: day,
        weekday: day.toLocaleDateString(locale, { weekday: "short" }),
        dateStr: day.toLocaleDateString(locale, {
          month: "short",
          day: "numeric",
        }),
        isToday: day.getTime() === todayMs,
        gayatriStart: times.gayatriMuhurtaStart,
        gayatriEnd: times.gayatriMuhurtaEnd,
        brahmaStart: times.brahmaMuhurtaStart,
        brahmaEnd: times.brahmaMuhurtaEnd,
        sunrise: times.sunrise,
        muhurtaLengthMinutes: times.muhurtaLengthMinutes,
        tithi: panch.tithi.name,
        nakshatra: panch.nakshatra.name,
      });
    } catch {
      // Skip days where sunrise can't be calculated (polar regions)
    }
  }

  return days;
}

// ─── Audio Alarm (Web Audio API) ─────────────────────────────────────

let _audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!_audioCtx) {
    _audioCtx = new AudioContext();
  }
  return _audioCtx;
}

/**
 * Play a gentle chime / bell sound to signal the start of Gayatri Muhurta.
 * Uses layered sine oscillators with exponential decay for a soft, resonant bell tone.
 */
export function playGayatriChime(): void {
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.25, now);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + 5);
    masterGain.connect(ctx.destination);

    // ── Bell / Chime Layer ──────────────────────────────────────────
    // A C major-like chord with gentle inharmonic partials for a bell timbre
    const bellFreqs = [523.25, 659.25, 783.99, 1046.5, 1318.5]; // C5, E5, G5, C6, E6
    const bellGain = ctx.createGain();
    bellGain.gain.setValueAtTime(0.3, now);
    bellGain.gain.exponentialRampToValueAtTime(0.001, now + 4.5);
    bellGain.connect(masterGain);

    bellFreqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq * (1 + i * 0.003), now); // slight detune for richness
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.15 / (i + 1), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 4.5 - i * 0.3);
      osc.connect(gain);
      gain.connect(bellGain);
      osc.start(now + 0.05);
      osc.stop(now + 5);
    });

    // ── Soft attack transient ─────────────────────────────────────
    const transientOsc = ctx.createOscillator();
    transientOsc.type = "triangle";
    transientOsc.frequency.setValueAtTime(1800, now);
    const transientGain = ctx.createGain();
    transientGain.gain.setValueAtTime(0.08, now);
    transientGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    transientOsc.connect(transientGain);
    transientGain.connect(masterGain);
    transientOsc.start(now);
    transientOsc.stop(now + 0.5);

    // ── OM / Drone Layer ───────────────────────────────────────────
    // A low, meditative drone with subtle harmonics
    const droneFundamental = 65.41; // C2 — deep grounding tone
    const droneHarmonics = [1, 3, 5, 7, 9]; // odd harmonics for a rich, reed-like timbre
    const droneGain = ctx.createGain();
    droneGain.gain.setValueAtTime(0, now + 0.2);
    droneGain.gain.linearRampToValueAtTime(0.12, now + 1.0);
    droneGain.gain.setValueAtTime(0.12, now + 3.5);
    droneGain.gain.exponentialRampToValueAtTime(0.001, now + 5.5);
    droneGain.connect(masterGain);

    droneHarmonics.forEach((h, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(droneFundamental * h, now);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.04 / (i + 1), now);
      osc.connect(g);
      g.connect(droneGain);
      osc.start(now + 0.2);
      osc.stop(now + 6);
    });

    // ── Subtle wind/pad layer ─────────────────────────────────────
    const padGain = ctx.createGain();
    padGain.gain.setValueAtTime(0, now + 0.5);
    padGain.gain.linearRampToValueAtTime(0.04, now + 1.5);
    padGain.gain.exponentialRampToValueAtTime(0.001, now + 6);
    padGain.connect(masterGain);

    [261.63, 329.63, 392.0].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, now);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.008, now);
      osc.connect(g);
      g.connect(padGain);
      osc.start(now + 0.5);
      osc.stop(now + 6.5);
    });

    // ── Conclude ────────────────────────────────────────────────
    masterGain.gain.setValueAtTime(0.001, now + 6);
  } catch {
    // Silently fail — audio is a non-critical feature
  }
}

/**
 * Play a short test chime so users can preview the alarm sound.
 */
export function playTestChime(): void {
  playGayatriChime();
}

// ─── Share / Export ────────────────────────────────────────────────────

/**
 * Generate a shareable text summary of today's Gayatri and Brahma Muhurta times.
 */
export function generateShareText(
  times: GayatriTimes,
  locationName: string,
  panchang: Panchang | null,
  locale: string = "en-US",
): string {
  const lines: string[] = [];
  const now = times.now;
  lines.push("🕉 Gayatri Time — Today");
  lines.push("");
  lines.push(`📍 ${locationName}`);
  lines.push(`📅 ${now.toLocaleDateString(locale, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`);
  lines.push("");
  lines.push(`🌅 Sunrise: ${formatTime(times.sunrise, locale)}`);
  lines.push(`🌇 Sunset: ${formatTime(times.sunset, locale)}`);
  lines.push("");
  lines.push(`🕉 Brahma Muhurta: ${formatTime(times.brahmaMuhurtaStart, locale)} — ${formatTime(times.brahmaMuhurtaEnd, locale)}`);
  lines.push(`☀ Gayatri Muhurta: ${formatTime(times.gayatriMuhurtaStart, locale)} — ${formatTime(times.gayatriMuhurtaEnd, locale)}`);
  lines.push(`⏱ Muhurta length: ${times.muhurtaLengthMinutes.toFixed(1)} min`);
  lines.push("");
  if (panchang) {
    lines.push(`📖 Panchang:`);
    lines.push(`  Tithi: ${panchang.tithi.name} (${panchang.tithi.paksha}, Day ${panchang.tithi.day})`);
    lines.push(`  Nakshatra: ${panchang.nakshatra.name} — ${panchang.nakshatra.deity}`);
    lines.push(`  Yoga: ${panchang.yoga.name}`);
    lines.push(`  ${panchang.samvatYear} · ${panchang.hinduMonth}`);
    lines.push("");
  }
  lines.push("Made with Gayatri Time — Notebook Edition");

  return lines.join("\n");
}

/**
 * Generate an .ics calendar file content for the upcoming Gayatri times.
 * Can be downloaded and imported into Google Calendar, Apple Calendar, etc.
 */
export function generateCalendarICS(schedule: DaySchedule[], locationName: string): string {
  const lines: string[] = [];
  lines.push("BEGIN:VCALENDAR");
  lines.push("VERSION:2.0");
  lines.push("PRODID:-//Gayatri Time//Notebook Edition//EN");
  lines.push("CALSCALE:GREGORIAN");
  lines.push("METHOD:PUBLISH");
  lines.push("X-WR-CALNAME:Gayatri Muhurta");
  lines.push("X-WR-TIMEZONE:UTC");

  for (const day of schedule) {
    const uid = `gayatri-${day.date.toISOString().slice(0, 10)}@gayatri-time`;
    const dtStart = day.gayatriStart.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const dtEnd = day.gayatriEnd.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${uid}`);
    lines.push(`DTSTART:${dtStart}`);
    lines.push(`DTEND:${dtEnd}`);
    lines.push(`SUMMARY:Gayatri Muhurta — ${day.dateStr}`);
    lines.push(`DESCRIPTION:Gayatri Muhurta (Savitur Muhurta) — the sacred 30th Muhurta before sunrise.\\nLocation: ${locationName}\\nMuhurta length: ${day.muhurtaLengthMinutes.toFixed(1)} min\\nTithi: ${day.tithi}\\nNakshatra: ${day.nakshatra}`);
    lines.push(`LOCATION:${locationName}`);
    lines.push("BEGIN:VALARM");
    lines.push("TRIGGER:-PT10M");
    lines.push("ACTION:DISPLAY");
    lines.push("DESCRIPTION:Gayatri Muhurta begins in 10 minutes");
    lines.push("END:VALARM");
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

/**
 * Trigger a browser download of a file with the given content.
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Share text using the Web Share API (mobile-friendly). Falls back to clipboard.
 */
export async function shareOrCopy(text: string, title?: string): Promise<void> {
  if (navigator.share) {
    try {
      await navigator.share({ title: title || "Gayatri Time", text });
      return;
    } catch {
      // User cancelled or share failed — fall through to clipboard
    }
  }
  // Fallback: copy to clipboard
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Clipboard unavailable — silently fail
  }
}

// ─── Screen Wake Lock ────────────────────────────────────────────

let _wakeLock: WakeLockSentinel | null = null;

/**
 * Request a screen wake lock to prevent the device from dimming.
 * Useful during Gayatri time when the user is meditating.
 */
export async function requestWakeLock(): Promise<boolean> {
  if (!("wakeLock" in navigator)) return false;
  if (_wakeLock) return true; // Already acquired
  try {
    _wakeLock = await navigator.wakeLock.request("screen");
    _wakeLock.addEventListener("release", () => {
      _wakeLock = null;
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Release the currently held screen wake lock.
 */
export function releaseWakeLock(): void {
  if (_wakeLock) {
    _wakeLock.release()?.catch(() => {});
    _wakeLock = null;
  }
}

/**
 * Check if a screen wake lock is currently active.
 */
export function hasWakeLock(): boolean {
  return _wakeLock !== null;
}

// ─── Time Formatting ───────────────────────────────────────────────────

/**
 * Format a Date to a time string (HH:MM AM/PM or HH:MM for 24h).
 * @param locale - locale string (e.g. "en-US" for 12h, "ru-RU" for 24h)
 */
export function formatTime(date: Date, locale: string = "en-US"): string {
  return date.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: locale.startsWith("en"),
  });
}

/**
 * Format milliseconds as a human-readable countdown string.
 */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return "Now";

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);

  return parts.join(" ");
}
