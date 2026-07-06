/**
 * i18n — Internationalization for Gayatri Time
 *
 * Simple React Context-based translation system with localStorage persistence.
 * Supports English (en) and Russian (ru).
 */

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────

export type Language = "en" | "ru";

type TranslationValue = string | ((...args: string[]) => string);

type TranslationMap = Record<string, TranslationValue>;

// ─── Persistence ──────────────────────────────────────────────────────────

const LANG_STORAGE_KEY = "gayatri-time-lang";

export function saveLanguage(lang: Language): void {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // ignore
  }
}

export function loadLanguage(): Language {
  try {
    const raw = localStorage.getItem(LANG_STORAGE_KEY);
    if (raw === "en" || raw === "ru") return raw;
  } catch {
    // ignore
  }
  // Auto-detect browser language
  if (typeof navigator !== "undefined") {
    const browserLang = navigator.language?.toLowerCase() || "";
    if (browserLang.startsWith("ru")) return "ru";
  }
  return "en";
}

// ─── English Dictionary ─────────────────────────────────────────────────

const en: TranslationMap = {
  // ── App title & header ──────────────────────────────────────────────
  "app.title": "Gayatri Time",
  "app.subtitle":
    "The intersection of three sacred conditions — the final Muhurta before sunrise, spatial alignment with the solar deity Savitur, and the daily cycle of spiritual renewal.",
  "app.dateFormat": "en-US",
  "app.install": "Install",
  "app.shareTitle": "Share today's times",
  "app.settingsTitle": "Settings",
  "app.switchTheme": "Switch theme",

  // ── Theme names ───────────────────────────────────────────────────
  "theme.light": "Light",
  "theme.sepia": "Sepia",
  "theme.dark": "Dark",

  // ── Loading state ──────────────────────────────────────────────────
  "loading.title": "Locating & calculating...",

  // ── Location prompt ────────────────────────────────────────────────
  "locationPrompt.title": "Where are you?",
  "locationPrompt.description":
    "Gayatri Muhurta is calculated based on your local sunrise time. Share your location or enter coordinates manually.",
  "locationPrompt.useMyLocation": "Use My Location",
  "locationPrompt.defaultLocation": "Varanasi (Default)",

  // ── Error state ────────────────────────────────────────────────────
  "error.title": "Calculation Error",
  "error.retry": "Try Again",

  // ── Current time ───────────────────────────────────────────────────
  "currentTime.label": "Current Time",

  // ── Location picker ────────────────────────────────────────────────
  "locationPicker.title": "Location",
  "locationPicker.searchCity": "Search for a city",
  "locationPicker.searchPlaceholder": "e.g. Varanasi, Delhi, Moscow...",
  "locationPicker.searching": "Searching...",
  "locationPicker.orEnterCoords": "Or enter coordinates",
  "locationPicker.latitude": "Latitude",
  "locationPicker.longitude": "Longitude",
  "locationPicker.latPlaceholder": "e.g. 27.1751",
  "locationPicker.lngPlaceholder": "e.g. 78.0421",
  "locationPicker.apply": "Apply Coordinates",
  "locationPicker.cancel": "Cancel",
  "locationPicker.autoDetect": "Auto-detect",
  "locationPicker.change": "Change",
  "locationPicker.save": "Save",
  "locationPicker.saved": "Saved",
  "locationPicker.saveFavorite": "Save this location",
  "locationPicker.savedLocations": "Saved Locations",
  "locationPicker.removeSaved": "Remove saved location",
  "locationPicker.clearSaved": "Clear saved location",
  "locationPicker.clearSavedSettings": "Clear saved location & re-prompt",
  "locationPicker.coordsFormat": "{lat}°N, {lng}°E",

  // ── Countdown / next event ─────────────────────────────────────────
  "countdown.gayatriActive": "Gayatri Muhurta — Active Now",
  "countdown.untilGayatri": "Time until Gayatri Muhurta",
  "countdown.untilBrahma": "Time until Brahma Muhurta",
  "countdown.untilSunrise": "Time until Sunrise",
  "countdown.description":
    "The sacred Gayatri Mantra is most potent now. Three conditions align: the final Muhurta before sunrise, the Savitur energy, and the transition from night to day.",
  "countdown.approaching":
    "Gayatri time is approaching. Prepare for meditation.",
  "countdown.browserAlert": "Browser Alert",
  "countdown.notifyMe": "Notify me",
  "countdown.audioOn": "Audio On",
  "countdown.soundOff": "Sound Off",
  "countdown.test": "Test",
  "countdown.next": "Next",
  "countdown.at": "at",

  // ── Time blocks ─────────────────────────────────────────────────────
  "timeBlocks.title": "Sacred Time Windows",
  "timeBlocks.brahma": "Brahma Muhurta",
  "timeBlocks.gayatri": "Gayatri Muhurta (Savitur)",
  "timeBlocks.gayatriShort": "Gayatri",
  "timeBlocks.sunrise": "Sunrise",
  "timeBlocks.sunset": "Sunset",
  "timeBlocks.now": "● NOW",

  // ── Timeline ───────────────────────────────────────────────────────
  "timeline.title": "Time Timeline",
  "timeline.predawn": "Pre-dawn",
  "timeline.brahma": "Brahma Muhurta",
  "timeline.gayatri": "Gayatri",
  "timeline.sunrise": "Sunrise",

  // ── Panchang card ──────────────────────────────────────────────────
  "panchang.title": "Hindu Calendar — Panchang",
  "panchang.tithi": "Tithi",
  "panchang.nakshatra": "Nakshatra",
  "panchang.yoga": "Yoga",
  "panchang.karana": "Karana",
  "panchang.month": "Month",
  "panchang.year": "Year",
  "panchang.footer":
    "Ayanamsa: {ayanamsa} · Calculated at local sunrise",

  // ── About calculation ──────────────────────────────────────────────
  "about.title": "About This Calculation",
  "about.p1":
    "In Vedic timekeeping, one full day (sunrise to next sunrise) is divided into {count} equal Muhurtas.",
  "about.p2":
    "The {strongStart}30th Muhurta{strongEnd} (Savitur/Gayatri) ends exactly at sunrise. Its length is {strongStart}{minutes} minutes{strongEnd} today, calculated from the duration between successive sunrises divided by 30.",
  "about.p3":
    "The {strongStart}29th Muhurta{strongEnd} (Brahma) precedes Gayatri, together forming the Brahma Muhurta period — the most auspicious time for spiritual practice in the Hindu tradition.",

  // ── Schedule view ─────────────────────────────────────────────────
  "schedule.title": "Upcoming Schedule",
  "schedule.days7": "7 Days",
  "schedule.days30": "30 Days",
  "schedule.loading": "Loading schedule...",
  "schedule.empty": "Could not load schedule for this location.",
  "schedule.date": "Date",
  "schedule.gayatri": "Gayatri",
  "schedule.brahma": "Brahma",
  "schedule.sunrise": "Sunrise",
  "schedule.tithi": "Tithi",
  "schedule.nakshatra": "Nakshatra",
  "schedule.today": "TODAY",
  "schedule.footer":
    "Based on Muhurta length ≈ {minutes} min/day",

  // ── Footer ─────────────────────────────────────────────────────────
  "footer.text": "Gayatri Time Calculator · Notebook Edition · {year}",

  // ── Settings Sheet ─────────────────────────────────────────────────
  "settings.title": "Settings",
  "settings.theme": "Theme",
  "settings.browserAlert": "Browser Alert",
  "settings.notifyLabel": "Notify when Gayatri time starts",
  "settings.notifyDesc":
    "Sends a browser notification when Gayatri Muhurta begins.",
  "settings.audioAlarm": "Audio Alarm",
  "settings.audioLabel": "Gentle chime on Gayatri time",
  "settings.audioDesc":
    "Plays a layered chime with OM drone when Gayatri time starts.",
  "settings.testChime": "Test chime",
  "settings.screenOn": "Keep Screen On",
  "settings.screenLabel": "Prevent screen dimming",
  "settings.screenStatusActive": "Active",
  "settings.screenStatusUnavailable": "Unavailable",
  "settings.screenStatusStandby": "Standby",
  "settings.screenDesc":
    "Automatically keeps your screen awake during Gayatri time.",
  "settings.export": "Export",
  "settings.exportCalendar": "Export to Calendar (.ics)",
  "settings.exportCalendarDesc":
    "Add 30 days of Gayatri times to Google / Apple Calendar",
  "settings.shareText": "Share as Text",
  "settings.shareTextDesc":
    "Copy today's times to clipboard or share via system share",
  "settings.exportSettings": "Export Settings",
  "settings.exportSettingsDesc":
    "Back up language, theme, sound, notifications, and saved locations",
  "settings.importSettings": "Import Settings",
  "settings.importSettingsDesc":
    "Restore settings from a Gayatri Time JSON backup",
  "settings.currentLocation": "Current Location",
  "settings.about": "About",
  "settings.aboutDesc":
    "Gayatri Time calculates the exact Muhurta (Vedic time window) when three sacred conditions align for chanting the Gayatri Mantra.",
  "settings.aboutTech":
    "The app uses the {strongStart}suncalc{strongEnd} library for accurate sunrise/sunset and {strongStart}@fusionstrings/panchangam{strongEnd} (Swiss Ephemeris via Wasm) for Hindu calendar calculations.",
  "settings.aboutVersion":
    "Version 1.0 · Notebook Edition · Built with React + Convex + shadcn/ui",

  // ── Notifications ─────────────────────────────────────────────────
  "notification.title": "Gayatri Muhurta",
  "notification.body":
    "The sacred Gayatri time has begun. Three conditions align for spiritual practice.",

  // ── Share text ─────────────────────────────────────────────────────
  "share.title": "🕉 Gayatri Time — Today",
  "share.location": "📍 {location}",
  "share.date": "📅 {date}",
  "share.sunrise": "🌅 Sunrise: {time}",
  "share.sunset": "🌇 Sunset: {time}",
  "share.brahma": "🕉 Brahma Muhurta: {start} — {end}",
  "share.gayatri": "☀ Gayatri Muhurta: {start} — {end}",
  "share.muhurtaLength": "⏱ Muhurta length: {minutes} min",
  "share.panchang": "📖 Panchang:",
  "share.tithi": "  Tithi: {name} ({paksha}, Day {day})",
  "share.nakshatra": "  Nakshatra: {name} — {deity}",
  "share.yoga": "  Yoga: {name}",
  "share.samvat": "  {year} · {month}",
  "share.footer": "Made with Gayatri Time — Notebook Edition",

  // ── Notification settings labels ─────────────────────────────────
  "notif.gayatriMuhurta": "Gayatri Muhurta",
  "notif.threeConditions":
    "The sacred Gayatri time has begun. Three conditions align for spiritual practice.",

  // ── Language ───────────────────────────────────────────────────────
  "language.label": "Language",
  "language.en": "English",
  "language.ru": "Русский",

  // ── Auth page ───────────────────────────────────────────────────────
  "auth.getStarted": "Get Started",
  "auth.description": "Enter your email to log in or sign up",
  "auth.emailPlaceholder": "name@example.com",
  "auth.or": "Or",
  "auth.continueAsGuest": "Continue as Guest",
  "auth.checkEmail": "Check your email",
  "auth.codeSent": "We've sent a code to {email}",
  "auth.didNotReceive": "Didn't receive a code?",
  "auth.tryAgain": "Try again",
  "auth.verifyCode": "Verify code",
  "auth.verifying": "Verifying...",
  "auth.useDifferentEmail": "Use different email",
  "auth.securedBy": "Secured by",
  "auth.failedToSend": "Failed to send verification code. Please try again.",
  "auth.invalidCode": "The verification code you entered is incorrect.",
  "auth.guestFailed": "Failed to sign in as guest: {error}",
};

// ─── Russian Dictionary ─────────────────────────────────────────────────

const ru: TranslationMap = {
  // ── App title & header ──────────────────────────────────────────────
  "app.title": "Гаятри Время",
  "app.subtitle":
    "Пересечение трёх священных условий — последняя Мухурта перед восходом, пространственное выравнивание с солнечным божеством Савитуром и ежедневный цикл духовного обновления.",
  "app.dateFormat": "ru-RU",
  "app.install": "Установить",
  "app.shareTitle": "Поделиться сегодняшним временем",
  "app.settingsTitle": "Настройки",
  "app.switchTheme": "Сменить тему",

  // ── Theme names ───────────────────────────────────────────────────
  "theme.light": "Светлая",
  "theme.sepia": "Сепия",
  "theme.dark": "Тёмная",

  // ── Loading state ──────────────────────────────────────────────────
  "loading.title": "Определяем местоположение и рассчитываем...",

  // ── Location prompt ────────────────────────────────────────────────
  "locationPrompt.title": "Где вы находитесь?",
  "locationPrompt.description":
    "Гаятри Мухурта рассчитывается на основе времени местного восхода солнца. Разрешите доступ к геолокации или введите координаты вручную.",
  "locationPrompt.useMyLocation": "Моё местоположение",
  "locationPrompt.defaultLocation": "Варанаси (по умолчанию)",

  // ── Error state ────────────────────────────────────────────────────
  "error.title": "Ошибка расчёта",
  "error.retry": "Попробовать снова",

  // ── Current time ───────────────────────────────────────────────────
  "currentTime.label": "Текущее время",

  // ── Location picker ────────────────────────────────────────────────
  "locationPicker.title": "Местоположение",
  "locationPicker.searchCity": "Поиск города",
  "locationPicker.searchPlaceholder": "например, Варанаси, Дели, Москва...",
  "locationPicker.searching": "Поиск...",
  "locationPicker.orEnterCoords": "Или введите координаты",
  "locationPicker.latitude": "Широта",
  "locationPicker.longitude": "Долгота",
  "locationPicker.latPlaceholder": "например, 55.7558",
  "locationPicker.lngPlaceholder": "например, 37.6173",
  "locationPicker.apply": "Применить координаты",
  "locationPicker.cancel": "Отмена",
  "locationPicker.autoDetect": "Автоопределение",
  "locationPicker.change": "Изменить",
  "locationPicker.save": "Сохранить",
  "locationPicker.saved": "Сохранено",
  "locationPicker.saveFavorite": "Сохранить это место",
  "locationPicker.savedLocations": "Сохранённые места",
  "locationPicker.removeSaved": "Удалить сохранённое место",
  "locationPicker.clearSaved": "Очистить сохранённое местоположение",
  "locationPicker.clearSavedSettings": "Очистить и запросить заново",
  "locationPicker.coordsFormat": "{lat}° с.ш., {lng}° в.д.",

  // ── Countdown / next event ─────────────────────────────────────────
  "countdown.gayatriActive": "Гаятри Мухурта — сейчас активно",
  "countdown.untilGayatri": "До Гаятри Мухурты",
  "countdown.untilBrahma": "До Брахма Мухурты",
  "countdown.untilSunrise": "До восхода солнца",
  "countdown.description":
    "Священная Гаятри-мантра наиболее сильна сейчас. Три условия совпадают: последняя Мухурта перед восходом, энергия Савитура и переход от ночи ко дню.",
  "countdown.approaching":
    "Время Гаятри приближается. Приготовьтесь к медитации.",
  "countdown.browserAlert": "Уведомление",
  "countdown.notifyMe": "Уведомить меня",
  "countdown.audioOn": "Звук включён",
  "countdown.soundOff": "Звук выключен",
  "countdown.test": "Тест",
  "countdown.next": "Далее",
  "countdown.at": "в",

  // ── Time blocks ─────────────────────────────────────────────────────
  "timeBlocks.title": "Священные временные окна",
  "timeBlocks.brahma": "Брахма Мухурта",
  "timeBlocks.gayatri": "Гаятри Мухурта (Савитур)",
  "timeBlocks.gayatriShort": "Гаятри",
  "timeBlocks.sunrise": "Восход",
  "timeBlocks.sunset": "Закат",
  "timeBlocks.now": "● СЕЙЧАС",

  // ── Timeline ───────────────────────────────────────────────────────
  "timeline.title": "Временная шкала",
  "timeline.predawn": "Предрассветье",
  "timeline.brahma": "Брахма Мухурта",
  "timeline.gayatri": "Гаятри",
  "timeline.sunrise": "Восход",

  // ── Panchang card ──────────────────────────────────────────────────
  "panchang.title": "Индуистский календарь — Панчанг",
  "panchang.tithi": "Титхи",
  "panchang.nakshatra": "Накшатра",
  "panchang.yoga": "Йога",
  "panchang.karana": "Карана",
  "panchang.month": "Месяц",
  "panchang.year": "Год",
  "panchang.footer":
    "Аянамса: {ayanamsa} · Рассчитано на местный восход",

  // ── About calculation ──────────────────────────────────────────────
  "about.title": "О расчёте",
  "about.p1":
    "В ведическом времяисчислении один полный день (от восхода до следующего восхода) делится на {count} равных Мухурт.",
  "about.p2":
    "{strongStart}30-я Мухурта{strongEnd} (Савитур/Гаятри) заканчивается точно на восходе. Её длина сегодня составляет {strongStart}{minutes} минут{strongEnd}, рассчитанная из продолжительности между последовательными восходами, делённой на 30.",
  "about.p3":
    "{strongStart}29-я Мухурта{strongEnd} (Брахма) предшествует Гаятри, вместе образуя период Брахма Мухурты — самое благоприятное время для духовной практики в индуистской традиции.",

  // ── Schedule view ─────────────────────────────────────────────────
  "schedule.title": "Расписание",
  "schedule.days7": "7 дней",
  "schedule.days30": "30 дней",
  "schedule.loading": "Загрузка расписания...",
  "schedule.empty": "Не удалось загрузить расписание для этого местоположения.",
  "schedule.date": "Дата",
  "schedule.gayatri": "Гаятри",
  "schedule.brahma": "Брахма",
  "schedule.sunrise": "Восход",
  "schedule.tithi": "Титхи",
  "schedule.nakshatra": "Накшатра",
  "schedule.today": "СЕГОДНЯ",
  "schedule.footer":
    "Длина Мухурты ≈ {minutes} мин/день",

  // ── Footer ─────────────────────────────────────────────────────────
  "footer.text": "Калькулятор Гаятри Времени · Notebook Edition · {year}",

  // ── Settings Sheet ─────────────────────────────────────────────────
  "settings.title": "Настройки",
  "settings.theme": "Тема",
  "settings.browserAlert": "Уведомления",
  "settings.notifyLabel": "Уведомлять о начале Гаятри Мухурты",
  "settings.notifyDesc":
    "Отправляет уведомление в браузере при начале Гаятри Мухурты.",
  "settings.audioAlarm": "Звуковой сигнал",
  "settings.audioLabel": "Мелодичный звон в начале Гаятри",
  "settings.audioDesc":
    "Воспроизводит многослойный перезвон с гудением ОМ при начале Гаятри.",
  "settings.testChime": "Проверить звук",
  "settings.screenOn": "Экран всегда включён",
  "settings.screenLabel": "Не давать экрану гаснуть",
  "settings.screenStatusActive": "Активно",
  "settings.screenStatusUnavailable": "Недоступно",
  "settings.screenStatusStandby": "Ожидание",
  "settings.screenDesc":
    "Автоматически не даёт экрану гаснуть во время Гаятри.",
  "settings.export": "Экспорт",
  "settings.exportCalendar": "Экспорт в календарь (.ics)",
  "settings.exportCalendarDesc":
    "Добавьте 30 дней Гаятри в Google / Apple Календарь",
  "settings.shareText": "Поделиться текстом",
  "settings.shareTextDesc":
    "Скопировать сегодняшнее время в буфер обмена или поделиться",
  "settings.exportSettings": "Экспорт настроек",
  "settings.exportSettingsDesc":
    "Сохранить язык, тему, звук, уведомления и сохранённые места",
  "settings.importSettings": "Импорт настроек",
  "settings.importSettingsDesc":
    "Восстановить настройки из JSON-копии Gayatri Time",
  "settings.currentLocation": "Текущее местоположение",
  "settings.about": "О приложении",
  "settings.aboutDesc":
    "Gayatri Time рассчитывает точную Мухурту (ведическое временное окно), когда три священных условия совпадают для чтения Гаятри-мантры.",
  "settings.aboutTech":
    "Приложение использует библиотеку {strongStart}suncalc{strongEnd} для точного восхода/заката и {strongStart}@fusionstrings/panchangam{strongEnd} (Швейцарский эфемерид через Wasm) для расчётов индуистского календаря.",
  "settings.aboutVersion":
    "Версия 1.0 · Notebook Edition · Создано с React + Convex + shadcn/ui",

  // ── Notifications ─────────────────────────────────────────────────
  "notification.title": "Гаятри Мухурта",
  "notification.body":
    "Священное время Гаятри началось. Три условия совпадают для духовной практики.",

  // ── Share text ─────────────────────────────────────────────────────
  "share.title": "🕉 Гаятри Время — Сегодня",
  "share.location": "📍 {location}",
  "share.date": "📅 {date}",
  "share.sunrise": "🌅 Восход: {time}",
  "share.sunset": "🌇 Закат: {time}",
  "share.brahma": "🕉 Брахма Мухурта: {start} — {end}",
  "share.gayatri": "☀ Гаятри Мухурта: {start} — {end}",
  "share.muhurtaLength": "⏱ Длина Мухурты: {minutes} мин",
  "share.panchang": "📖 Панчанг:",
  "share.tithi": "  Титхи: {name} ({paksha}, День {day})",
  "share.nakshatra": "  Накшатра: {name} — {deity}",
  "share.yoga": "  Йога: {name}",
  "share.samvat": "  {year} · {month}",
  "share.footer": "Создано в Gayatri Time — Notebook Edition",

  // ── Language ───────────────────────────────────────────────────────
  "language.label": "Язык",
  "language.en": "English",
  "language.ru": "Русский",

  // ── Auth page ───────────────────────────────────────────────────────
  "auth.getStarted": "Начать",
  "auth.description": "Введите email для входа или регистрации",
  "auth.emailPlaceholder": "name@example.com",
  "auth.or": "Или",
  "auth.continueAsGuest": "Продолжить как гость",
  "auth.checkEmail": "Проверьте почту",
  "auth.codeSent": "Мы отправили код на {email}",
  "auth.didNotReceive": "Не получили код?",
  "auth.tryAgain": "Попробовать снова",
  "auth.verifyCode": "Подтвердить код",
  "auth.verifying": "Проверка...",
  "auth.useDifferentEmail": "Использовать другой email",
  "auth.securedBy": "Защищено",
  "auth.failedToSend": "Не удалось отправить код подтверждения. Попробуйте снова.",
  "auth.invalidCode": "Введён неверный код подтверждения.",
  "auth.guestFailed": "Не удалось войти как гость: {error}",
};

// ─── Dictionary Registry ────────────────────────────────────────────────

const dictionaries: Record<Language, TranslationMap> = { en, ru };

// ─── Simple string interpolation, including support for <tag>...</tag> pairs ──────

function interpolate(text: string, args?: Record<string, string>): string {
  if (!args) return text;
  let result = text;
  for (const [key, value] of Object.entries(args)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value);
  }
  return result;
}

// ─── React Context ────────────────────────────────────────────────────────

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string, args?: Record<string, string>) => string;
  /** Returns translated string with HTML tag markers replaced by actual tag spans.
   *  Args with names ending in "Start" / "End" are treated as paired tag delimiters.
   *  E.g. t("about.p2", { strongStart: "<strong>", strongEnd: "</strong>", minutes: "48.2" })
   *  will render the translated text with <strong> wrapping the minutes value. */
  tHtml: (key: string, args?: Record<string, string>) => React.ReactNode;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Language>(() => loadLanguage());

  const setLangAndSave = useCallback((l: Language) => {
    setLang(l);
    saveLanguage(l);
  }, []);

  const t = useCallback(
    (key: string, args?: Record<string, string>): string => {
      const dict = dictionaries[lang];
      const value = dict[key];
      if (value === undefined) {
        // Fallback to English
        const fallback = en[key];
        if (fallback === undefined) return key;
        return typeof fallback === "function"
          ? (fallback as (...a: string[]) => string)(...(args ? Object.values(args) : []))
          : interpolate(fallback, args);
      }
      return typeof value === "function"
        ? (value as (...a: string[]) => string)(...(args ? Object.values(args) : []))
        : interpolate(value, args);
    },
    [lang],
  );

  const tHtml = useCallback(
    (key: string, args?: Record<string, string>): React.ReactNode => {
      let text = t(key, args);
      // Replace paired tag markers with actual elements
      // Match any <tag>...</tag> pattern
      const parts: React.ReactNode[] = [];
      let remaining = text;
      let partIdx = 0;

      // Find all paired tags like <strong>...</strong>
      const tagRegex = /<(\w+)>(.*?)<\/\1>/g;
      let lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = tagRegex.exec(text)) !== null) {
        // Add text before the tag
        if (match.index > lastIndex) {
          parts.push(text.slice(lastIndex, match.index));
        }
        const Tag = match[1]; // e.g. "strong"
        parts.push(React.createElement(Tag, { key: partIdx++ }, match[2]));
        lastIndex = match.index + match[0].length;
      }

      // Add remaining text
      if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
      }

      return parts.length > 0 ? parts : text;
    },
    [t],
  );

  return (
    <I18nContext.Provider value={{ lang, setLang: setLangAndSave, t, tHtml }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation(): I18nContextType {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useTranslation must be used within a LanguageProvider");
  }
  return ctx;
}
