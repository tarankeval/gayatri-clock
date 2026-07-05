import { motion } from "framer-motion";
import {
  Sun,
  Moon,
  Sunrise as SunriseIcon,
  Sunset as SunsetIcon,
  MapPin,
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  Music,
  RefreshCw,
  Clock,
  Calendar,
  CalendarDays,
  Compass,
  Sparkles,
  AlertTriangle,
  Download,
  Search,
  Settings,
  Share2,
  SunMoon,
  Info,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  type GayatriTimes,
  type LocationInfo,
  type Panchang,
  type DaySchedule,
  type ThemeMode,
  type CitySearchResult,
  calcGayatriTimes,
  calcGayatriTimesForRange,
  calcPanchang,
  formatCountdown,
  formatTime,
  getCurrentLocation,
  getLocationName,
  searchCity,
  saveLocation,
  loadLocation,
  clearLocation,
  saveTheme,
  loadTheme,
  playGayatriChime,
  playTestChime,
  generateShareText,
  generateCalendarICS,
  downloadFile,
  shareOrCopy,
  requestWakeLock,
  releaseWakeLock,
  hasWakeLock,
} from "@/lib/gayatri";

// ─── Types ─────────────────────────────────────────────────────────────

type AppState = "loading" | "location-prompt" | "ready" | "error";

// ─── Sub-component: TimeBlock ──────────────────────────────────────────

function TimeBlock({
  label,
  time,
  icon: Icon,
  active = false,
  highlight = false,
}: {
  label: string;
  time: string;
  icon: React.ElementType;
  active?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "notebook-card flex items-center gap-3 transition-all duration-500",
        active && "gayatri-glow border-[oklch(0.65_0.15_50_/_0.3)]",
        highlight && "bg-[oklch(0.92_0.05_75_/_0.15)]",
      )}
    >
      <div
        className={cn(
          "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
          active
            ? "bg-[oklch(0.65_0.15_50_/_0.15)] text-[oklch(0.6_0.15_50)]"
            : "bg-secondary text-muted-foreground",
        )}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="notebook-label">{label}</div>
        <div
          className={cn(
            "text-lg font-semibold font-[var(--notebook-font)]",
            active && "text-[oklch(0.55_0.15_50)]",
          )}
        >
          {time}
        </div>
      </div>
      {active && (
        <span className="flex-shrink-0 text-xs font-semibold text-[oklch(0.55_0.15_50)] bg-[oklch(0.65_0.15_50_/_0.1)] px-2 py-1 rounded-full">
          ● NOW
        </span>
      )}
    </div>
  );
}

// ─── Sub-component: Timeline Bar ───────────────────────────────────────

function TimelineBar({ times }: { times: GayatriTimes }) {
  const totalDuration =
    times.sunrise.getTime() -
    times.brahmaMuhurtaStart.getTime() +
    90 * 60 * 1000; // extra padding

  const getPercent = (start: Date, end: Date) => {
    const startMs = times.brahmaMuhurtaStart.getTime() - 30 * 60 * 1000; // 30 min before brahma
    const total = totalDuration;
    const s = ((start.getTime() - startMs) / total) * 100;
    const e = ((end.getTime() - startMs) / total) * 100;
    return { left: `${Math.max(0, s)}%`, width: `${Math.min(100, e - s)}%` };
  };

  const nowPos = (() => {
    const startMs = times.brahmaMuhurtaStart.getTime() - 30 * 60 * 1000;
    const total = totalDuration;
    return ((times.now.getTime() - startMs) / total) * 100;
  })();

  const beforeDawn = getPercent(
    new Date(times.brahmaMuhurtaStart.getTime() - 30 * 60 * 1000),
    times.brahmaMuhurtaStart,
  );
  const brahma = getPercent(times.brahmaMuhurtaStart, times.gayatriMuhurtaStart);
  const gayatri = getPercent(
    times.gayatriMuhurtaStart,
    times.gayatriMuhurtaEnd,
  );

  return (
    <div className="notebook-card mt-4">
      <div className="notebook-label mb-3">Time Timeline</div>

      {/* Timeline track */}
      <div className="relative h-8 bg-secondary/50 rounded-sm overflow-hidden">
        {/* Before dawn */}
        <div
          className="absolute top-0 h-full bg-muted"
          style={{ left: beforeDawn.left, width: beforeDawn.width }}
        />

        {/* Brahma Muhurta */}
        <div
          className="absolute top-0 h-full bg-[oklch(0.6_0.08_50_/_0.2)]"
          style={{ left: brahma.left, width: brahma.width }}
        />

        {/* Gayatri Muhurta */}
        <div
          className={cn(
            "absolute top-0 h-full transition-all duration-1000",
            times.isGayatriTime
              ? "bg-[oklch(0.65_0.15_50_/_0.35)]"
              : "bg-[oklch(0.65_0.12_50_/_0.2)]",
          )}
          style={{ left: gayatri.left, width: gayatri.width }}
        />

        {/* Sunrise marker */}
        <div
          className="absolute top-0 h-full w-0.5 bg-foreground/40"
          style={{ left: `calc(${gayatri.left} + ${gayatri.width})` }}
        />

        {/* NOW indicator */}
        <div
          className={cn(
            "absolute top-0 w-2.5 h-full -ml-1 transition-all duration-1000",
            times.isGayatriTime
              ? "bg-[oklch(0.65_0.15_50)]"
              : "bg-foreground/50",
          )}
          style={{ left: `${Math.min(100, Math.max(0, nowPos))}%` }}
        >
          <div
            className={cn(
              "absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] whitespace-nowrap font-semibold",
              times.isGayatriTime
                ? "text-[oklch(0.55_0.15_50)]"
                : "text-muted-foreground",
            )}
          >
            NOW
          </div>
        </div>
      </div>

      {/* Timeline labels */}
      <div className="flex justify-between mt-2 text-[11px] text-muted-foreground font-[var(--notebook-font)]">
        <span>Pre-dawn</span>
        <span>Brahma Muhurta</span>
        <span className="text-[oklch(0.55_0.12_50)] font-semibold">
          Gayatri
        </span>
        <span>Sunrise</span>
      </div>
    </div>
  );
}

// ─── Sub-component: Panchang Card ─────────────────────────────────────

function PanchangCard({ panchang }: { panchang: Panchang | null }) {
  if (!panchang) return null;

  return (
    <div className="notebook-card mt-4">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="w-4 h-4 text-muted-foreground" />
        <span className="notebook-label">Hindu Calendar — Panchang</span>
      </div>

      <table className="notebook-timetable">
        <tbody>
          <tr>
            <td className="text-muted-foreground w-28">Tithi</td>
            <td className="font-medium">
              {panchang.tithi.name}
              <span className="text-muted-foreground text-xs ml-1">
                ({panchang.tithi.paksha} — Day {panchang.tithi.day})
              </span>
            </td>
          </tr>
          <tr>
            <td className="text-muted-foreground">Nakshatra</td>
            <td className="font-medium">
              {panchang.nakshatra.name}
              <span className="text-muted-foreground text-xs ml-1">
                — {panchang.nakshatra.deity}
              </span>
            </td>
          </tr>
          <tr>
            <td className="text-muted-foreground">Yoga</td>
            <td className="font-medium">{panchang.yoga.name}</td>
          </tr>
          <tr>
            <td className="text-muted-foreground">Karana</td>
            <td className="font-medium">{panchang.karana.name}</td>
          </tr>
          <tr>
            <td className="text-muted-foreground">Month</td>
            <td className="font-medium">{panchang.hinduMonth}</td>
          </tr>
          <tr>
            <td className="text-muted-foreground">Year</td>
            <td className="font-medium">{panchang.samvatYear}</td>
          </tr>
        </tbody>
      </table>

      <div className="notebook-note mt-3">
        Ayanamsa: {panchang.ayanamsa} · Calculated at local sunrise
      </div>
    </div>
  );
}

// ─── Sub-component: Countdown Timer ────────────────────────────────────

function CountdownDisplay({
  times,
  notificationsEnabled,
  audioAlarmEnabled,
  onToggleNotifications,
  onToggleAudio,
  onTestAlarm,
}: {
  times: GayatriTimes;
  notificationsEnabled: boolean;
  audioAlarmEnabled: boolean;
  onToggleNotifications: () => void;
  onToggleAudio: () => void;
  onTestAlarm: () => void;
}) {
  const [display, setDisplay] = useState("");

  useEffect(() => {
    const update = () => {
      if (times.isGayatriTime) {
        setDisplay("◆ Gayatri Time is Now ◆");
      } else {
        setDisplay(formatCountdown(times.msUntilNextEvent));
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [times]);

  const isActive = times.isGayatriTime;
  const isSoon = !isActive && times.msUntilNextEvent < 10 * 60 * 1000; // within 10 min

  return (
    <div className="notebook-card mt-4 text-center">
      <div className="notebook-label mb-2">
        {isActive
          ? "Gayatri Muhurta — Active Now"
          : times.nextEvent === "gayatri"
            ? "Time until Gayatri Muhurta"
            : times.nextEvent === "brahma"
              ? "Time until Brahma Muhurta"
              : "Time until Sunrise"}
      </div>

      <div
        className={cn(
          "text-4xl font-bold font-[var(--notebook-font)] tracking-tight transition-all duration-500 py-2",
          isActive && "gayatri-active text-5xl",
          isSoon && !isActive && "text-[oklch(0.6_0.12_50)]",
        )}
      >
        {isActive ? (
          <span className="inline-flex items-center gap-2">
            <Sparkles className="w-8 h-8" />
            {display}
            <Sparkles className="w-8 h-8" />
          </span>
        ) : (
          display
        )}
      </div>

      {isActive && (
        <div className="notebook-annotation mt-2">
          The sacred Gayatri Mantra is most potent now. Three conditions align:
          the final Muhurta before sunrise, the Savitur energy, and the
          transition from night to day.
        </div>
      )}

      {isSoon && !isActive && (
        <div className="notebook-annotation mt-2 text-[oklch(0.6_0.1_45)]">
          Gayatri time is approaching. Prepare for meditation.
        </div>
      )}

      <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-dashed border-border flex-wrap">
        <button
          onClick={onToggleNotifications}
          className={cn(
            "flex items-center gap-2 text-sm transition-colors",
            notificationsEnabled
              ? "text-foreground"
              : "text-muted-foreground",
          )}
        >
          {notificationsEnabled ? (
            <Bell className="w-4 h-4" />
          ) : (
            <BellOff className="w-4 h-4" />
          )}
          <span className="font-[var(--notebook-font)]">
            {notificationsEnabled ? "Browser Alert" : "Notify me"}
          </span>
        </button>

        <span className="w-px h-4 bg-border" />

        <button
          onClick={onToggleAudio}
          className={cn(
            "flex items-center gap-2 text-sm transition-colors",
            audioAlarmEnabled
              ? "text-foreground"
              : "text-muted-foreground",
          )}
        >
          {audioAlarmEnabled ? (
            <Volume2 className="w-4 h-4" />
          ) : (
            <VolumeX className="w-4 h-4" />
          )}
          <span className="font-[var(--notebook-font)]">
            {audioAlarmEnabled ? "Audio On" : "Sound Off"}
          </span>
        </button>

        {audioAlarmEnabled && (
          <button
            onClick={onTestAlarm}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Music className="w-3 h-3" />
            <span className="font-[var(--notebook-font)]">Test</span>
          </button>
        )}

        <span className="text-muted-foreground text-xs font-[var(--notebook-font)]">
          Next: {times.nextEvent === "gayatri" ? "Gayatri" : times.nextEvent === "brahma" ? "Brahma" : "Sunrise"} at{" "}
          {times.nextEventTime ? formatTime(times.nextEventTime) : "—"}
        </span>
      </div>
    </div>
  );
}

// ─── Sub-component: Location Picker ────────────────────────────────────

function LocationPicker({
  location,
  onLocationChange,
  onClearSaved,
}: {
  location: LocationInfo;
  onLocationChange: (loc: LocationInfo) => void;
  onClearSaved?: () => void;
}) {
  const [latInput, setLatInput] = useState(location.lat.toString());
  const [lngInput, setLngInput] = useState(location.lng.toString());
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CitySearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleApply = () => {
    const lat = parseFloat(latInput);
    const lng = parseFloat(lngInput);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      onLocationChange({ lat, lng, name: `${lat.toFixed(2)}°, ${lng.toFixed(2)}°` });
      setIsEditing(false);
    }
  };

  const handleDetect = async () => {
    try {
      const pos = await getCurrentLocation();
      const name = await getLocationName(pos.coords.latitude, pos.coords.longitude);
      onLocationChange({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        name,
      });
      setLatInput(pos.coords.latitude.toString());
      setLngInput(pos.coords.longitude.toString());
      setIsEditing(false);
    } catch {
      // ignore
    }
  };

  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (value.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      const results = await searchCity(value);
      setSearchResults(results);
      setIsSearching(false);
    }, 400);
  };

  const handleSelectCity = (result: CitySearchResult) => {
    onLocationChange({
      lat: result.lat,
      lng: result.lng,
      name: result.name,
    });
    setSearchQuery("");
    setSearchResults([]);
    setLatInput(result.lat.toString());
    setLngInput(result.lng.toString());
    setIsEditing(false);
  };

  return (
    <div className="notebook-card">
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="w-4 h-4 text-muted-foreground" />
        <span className="notebook-label">Location</span>
      </div>

      {isEditing ? (
        <div className="space-y-3">
          {/* City search */}
          <div>
            <Label className="notebook-note">Search for a city</Label>
            <div className="relative mt-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => handleSearchInput(e.target.value)}
                placeholder="e.g. Varanasi, Delhi, Moscow..."
                className="h-9 pl-8 text-sm font-[var(--notebook-font)]"
              />
            </div>
            {isSearching && (
              <div className="text-xs text-muted-foreground mt-1 italic font-[var(--notebook-font)]">
                Searching...
              </div>
            )}
            {searchResults.length > 0 && (
              <div className="mt-1 rounded-sm border border-border overflow-hidden">
                {searchResults.map((result, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectCity(result)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-[oklch(0.65_0.12_50_/_0.06)] transition-colors border-b border-border last:border-b-0 font-[var(--notebook-font)]"
                  >
                    <div className="font-medium">{result.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {result.country}
                      <span className="mx-1">·</span>
                      {result.lat.toFixed(4)}°N, {result.lng.toFixed(4)}°E
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Manual coordinate entry */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="notebook-note">Or enter coordinates</span>
              <span className="flex-1 border-t border-dashed border-border" />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <Label className="notebook-note">Latitude</Label>
                <Input
                  value={latInput}
                  onChange={(e) => setLatInput(e.target.value)}
                  placeholder="e.g. 27.1751"
                  className="h-8 text-sm font-[var(--notebook-font)]"
                />
              </div>
              <div className="flex-1">
                <Label className="notebook-note">Longitude</Label>
                <Input
                  value={lngInput}
                  onChange={(e) => setLngInput(e.target.value)}
                  placeholder="e.g. 78.0421"
                  className="h-8 text-sm font-[var(--notebook-font)]"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleApply}
              className="h-8 text-xs font-[var(--notebook-font)]"
            >
              Apply Coordinates
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditing(false)}
              className="h-8 text-xs font-[var(--notebook-font)]"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDetect}
              className="h-8 text-xs font-[var(--notebook-font)] ml-auto"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Auto-detect
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium font-[var(--notebook-font)]">
                {location.name || `${location.lat.toFixed(2)}°, ${location.lng.toFixed(2)}°`}
              </div>
              <div className="notebook-note">
                {location.lat.toFixed(4)}°N, {location.lng.toFixed(4)}°E
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditing(true)}
                className="h-8 text-xs font-[var(--notebook-font)]"
              >
                Change
              </Button>
            </div>
          </div>
          {onClearSaved && (
            <button
              onClick={onClearSaved}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors mt-1 font-[var(--notebook-font)]"
            >
              Clear saved location
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sub-component: Schedule View ────────────────────────────────────

function ScheduleView({ lat, lng }: { lat: number; lng: number }) {
  const [schedule, setSchedule] = useState<DaySchedule[]>([]);
  const [viewMode, setViewMode] = useState<7 | 30>(7);
  const [isLoading, setIsLoading] = useState(true);

  // Compute schedule whenever location or view mode changes
  useEffect(() => {
    setIsLoading(true);
    let cancelled = false;
    const timeout = setTimeout(async () => {
      try {
        const days = await calcGayatriTimesForRange(lat, lng, viewMode);
        if (!cancelled) setSchedule(days);
      } catch {
        if (!cancelled) setSchedule([]);
      }
      if (!cancelled) setIsLoading(false);
    }, 50);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [lat, lng, viewMode]);

  return (
    <div className="notebook-card mt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-muted-foreground" />
          <span className="notebook-label">Upcoming Schedule</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewMode(7)}
            className={cn(
              "px-2.5 py-1 text-xs rounded-sm transition-colors font-[var(--notebook-font)]",
              viewMode === 7
                ? "bg-[oklch(0.65_0.12_50_/_0.12)] text-[oklch(0.55_0.12_50)] font-semibold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            7 Days
          </button>
          <button
            onClick={() => setViewMode(30)}
            className={cn(
              "px-2.5 py-1 text-xs rounded-sm transition-colors font-[var(--notebook-font)]",
              viewMode === 30
                ? "bg-[oklch(0.65_0.12_50_/_0.12)] text-[oklch(0.55_0.12_50)] font-semibold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            30 Days
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-6">
          <div className="notebook-note">Loading schedule...</div>
        </div>
      ) : schedule.length === 0 ? (
        <div className="text-center py-6">
          <div className="notebook-note">Could not load schedule for this location.</div>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-1">
          {/* Table header */}
          <table className="notebook-timetable text-xs min-w-full">
            <thead>
              <tr>
                <th className="py-1.5 px-1 w-20">Date</th>
                <th className="py-1.5 px-1">Gayatri</th>
                <th className="py-1.5 px-1 hidden sm:table-cell">Brahma</th>
                <th className="py-1.5 px-1">Sunrise</th>
                <th className="py-1.5 px-1 hidden md:table-cell">Tithi</th>
                <th className="py-1.5 px-1 hidden lg:table-cell">Nakshatra</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((day, idx) => (
                <tr
                  key={idx}
                  className={cn(
                    "transition-colors",
                    day.isToday &&
                      "bg-[oklch(0.65_0.15_50_/_0.06)]",
                  )}
                >
                  <td className="py-2 px-1">
                    <div
                      className={cn(
                        "flex flex-col leading-tight",
                        day.isToday && "font-bold",
                      )}
                    >
                      <span>{day.weekday}</span>
                      <span className="text-muted-foreground">
                        {day.dateStr}
                      </span>
                    </div>
                    {day.isToday && (
                      <span className="text-[10px] font-semibold text-[oklch(0.55_0.15_50)]">
                        TODAY
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-1 whitespace-nowrap">
                    <span
                      className={cn(
                        day.isToday &&
                          "text-[oklch(0.55_0.15_50)] font-semibold",
                      )}
                    >
                      {formatTime(day.gayatriStart)}
                    </span>
                    <span className="text-muted-foreground mx-0.5">—</span>
                    <span className="text-muted-foreground">
                      {formatTime(day.gayatriEnd)}
                    </span>
                  </td>
                  <td className="py-2 px-1 whitespace-nowrap hidden sm:table-cell">
                    <span>{formatTime(day.brahmaStart)}</span>
                    <span className="text-muted-foreground mx-0.5">—</span>
                    <span className="text-muted-foreground">
                      {formatTime(day.brahmaEnd)}
                    </span>
                  </td>
                  <td className="py-2 px-1 whitespace-nowrap">
                    {formatTime(day.sunrise)}
                  </td>
                  <td className="py-2 px-1 text-muted-foreground hidden md:table-cell">
                    {day.tithi}
                  </td>
                  <td className="py-2 px-1 text-muted-foreground hidden lg:table-cell">
                    {day.nakshatra}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="notebook-note mt-2">
        Based on Muhurta length ≈ {schedule[0]?.muhurtaLengthMinutes.toFixed(1) || "—"} min/day
      </div>
    </div>
  );
}

// ─── Main App ──────────────────────────────────────────────────────────

export default function Landing() {
  const [location, setLocation] = useState<LocationInfo | null>(null);
  const [appState, setAppState] = useState<AppState>("loading");
  const [times, setTimes] = useState<GayatriTimes | null>(null);
  const [panchang, setPanchang] = useState<Panchang | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [audioAlarmEnabled, setAudioAlarmEnabled] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const notificationSentRef = useRef(false);
  const audioAlarmSentRef = useRef(false);
  const deferredPromptRef = useRef<Event | null>(null);
  const [installPromptAvailable, setInstallPromptAvailable] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>(() => loadTheme());
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const wakeLockRef = useRef(false);

  // ── Theme management ────────────────────────────────────────────

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    saveTheme(theme);
  }, [theme]);

  const cycleTheme = () => {
    setTheme((prev) => {
      const modes: ThemeMode[] = ["light", "sepia", "dark"];
      const idx = modes.indexOf(prev);
      return modes[(idx + 1) % modes.length];
    });
  };

  const themeLabel: Record<ThemeMode, string> = {
    light: "Light",
    sepia: "Sepia",
    dark: "Dark",
  };

  const themeNextIcon: Record<ThemeMode, React.ReactNode> = {
    light: <Sun className="w-3.5 h-3.5" />,
    sepia: <Sun className="w-3.5 h-3.5" />,
    dark: <Moon className="w-3.5 h-3.5" />,
  };

  // ── Settings Sheet ────────────────────────────────────────────

  const [settingsOpen, setSettingsOpen] = useState(false);

  // ── PWA Install Prompt ─────────────────────────────────────────

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e;
      setInstallPromptAvailable(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPromptRef.current) return;
    const promptEvent = deferredPromptRef.current as any;
    promptEvent.prompt();
    const result = await promptEvent.userChoice;
    if (result.outcome === "accepted") {
      setInstallPromptAvailable(false);
      deferredPromptRef.current = null;
    }
  };

  // ── Service Worker Registration ─────────────────────────────────

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch(() => {
          // Service worker registration failed — not critical
        });
    }
  }, []);

  // ── Initialize location ──────────────────────────────────────────

  const initLocation = useCallback(async () => {
    // Try to load a saved location first
    const saved = loadLocation();
    if (saved) {
      setLocation(saved);
      setAppState("ready");
      // Refresh the location name in the background
      getLocationName(saved.lat, saved.lng)
        .then((name) => {
          if (name) {
            setLocation((prev) =>
              prev ? { ...prev, name } : prev,
            );
          }
        })
        .catch(() => {});
      return;
    }

    setAppState("loading");
    try {
      const pos = await getCurrentLocation();
      const name = await getLocationName(
        pos.coords.latitude,
        pos.coords.longitude,
      );
      const loc: LocationInfo = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        name,
      };
      setLocation(loc);
      saveLocation(loc);
      setAppState("ready");
    } catch {
      setAppState("location-prompt");
    }
  }, []);

  useEffect(() => {
    initLocation();
  }, [initLocation]);

  // ── Calculate times ─────────────────────────────────────────────

  const calculate = useCallback((loc: LocationInfo) => {
    try {
      const newTimes = calcGayatriTimes(loc.lat, loc.lng);
      setTimes(newTimes);
      const newPanchang = calcPanchang(newTimes.now, loc.lat, loc.lng);
      setPanchang(newPanchang);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to calculate times",
      );
      setAppState("error");
    }
  }, []);

  useEffect(() => {
    if (location) {
      calculate(location);
    }
  }, [location, calculate]);

  // ── Adaptive refresh (10s visible / 60s hidden) ─────────────────

  useEffect(() => {
    if (!location) return;

    const REFRESH_VISIBLE = 10000;
    const REFRESH_HIDDEN = 60000;

    const tick = () => calculate(location);

    let interval: ReturnType<typeof setInterval>;

    const startInterval = (ms: number) => {
      clearInterval(interval);
      interval = setInterval(tick, ms);
    };

    const handleVisibility = () => {
      startInterval(
        document.hidden ? REFRESH_HIDDEN : REFRESH_VISIBLE,
      );
    };

    // Start with visible interval
    interval = setInterval(tick, REFRESH_VISIBLE);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [location, calculate]);

  // ── Notifications ───────────────────────────────────────────────

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    const result = await Notification.requestPermission();
    return result === "granted";
  };

  const toggleNotifications = async () => {
    if (notificationsEnabled) {
      setNotificationsEnabled(false);
      notificationSentRef.current = false;
    } else {
      const granted = await requestNotificationPermission();
      setNotificationsEnabled(granted);
    }
  };

  const toggleAudioAlarm = () => {
    setAudioAlarmEnabled((prev) => !prev);
    audioAlarmSentRef.current = false;
  };

  const handleTestAlarm = () => {
    playTestChime();
  };

  // Send notification when Gayatri time starts
  useEffect(() => {
    if (
      notificationsEnabled &&
      times?.isGayatriTime &&
      !notificationSentRef.current
    ) {
      notificationSentRef.current = true;
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Gayatri Muhurta", {
          body: "The sacred Gayatri time has begun. Three conditions align for spiritual practice.",
          icon: "/favicon.ico",
        });
      }
    }
    if (!times?.isGayatriTime) {
      notificationSentRef.current = false;
    }
  }, [times?.isGayatriTime, notificationsEnabled]);

  // Play audio alarm when Gayatri time starts
  useEffect(() => {
    if (
      audioAlarmEnabled &&
      times?.isGayatriTime &&
      !audioAlarmSentRef.current
    ) {
      audioAlarmSentRef.current = true;
      playGayatriChime();
    }
    if (!times?.isGayatriTime) {
      audioAlarmSentRef.current = false;
    }
  }, [times?.isGayatriTime, audioAlarmEnabled]);

  // ── Screen Wake Lock ────────────────────────────────────────────
  // Keep screen on during Gayatri time so the user can meditate without interruption

  useEffect(() => {
    if (times?.isGayatriTime && !wakeLockRef.current) {
      wakeLockRef.current = true;
      requestWakeLock().then(setWakeLockActive);
    }
    if (!times?.isGayatriTime && wakeLockRef.current) {
      wakeLockRef.current = false;
      releaseWakeLock();
      setWakeLockActive(false);
    }
  }, [times?.isGayatriTime]);

  // Re-acquire wake lock if it gets released (e.g. after full-screen video)
  useEffect(() => {
    const handleVisibility = () => {
      if (
        !document.hidden &&
        times?.isGayatriTime &&
        !hasWakeLock()
      ) {
        requestWakeLock().then(setWakeLockActive);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [times?.isGayatriTime]);

  // ── Manual refresh ─────────────────────────────────────────────

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (location) {
      calculate(location);
    } else {
      await initLocation();
    }
    setTimeout(() => setIsRefreshing(false), 800);
  };

  // ── Share / Export ──────────────────────────────────────────────

  const handleShare = async () => {
    if (!times || !location) return;
    const text = generateShareText(times, location.name || `${location.lat.toFixed(2)}°, ${location.lng.toFixed(2)}°`, panchang);
    await shareOrCopy(text, "Gayatri Time — Today");
  };

  const handleExportICS = async () => {
    if (!location) return;
    // Fetch schedule for 30 days and export as .ics
    const days = await calcGayatriTimesForRange(location.lat, location.lng, 30);
    const ics = generateCalendarICS(days, location.name || "My Location");
    downloadFile(ics, "gayatri-times.ics", "text/calendar;charset=utf-8");
  };

  // ── Location change handler ────────────────────────────────────

  const handleLocationChange = (loc: LocationInfo) => {
    setLocation(loc);
    saveLocation(loc);
    setAppState("ready");
  };

  const handleClearSavedLocation = () => {
    clearLocation();
    setLocation(null);
    setAppState("location-prompt");
  };

  // ── Set default location ───────────────────────────────────────

  const handleUseDefaultLocation = () => {
    // Default: Varanasi, India (sacred city on the Ganges)
    const defaultLoc: LocationInfo = {
      lat: 25.3176,
      lng: 82.9739,
      name: "Varanasi, India",
    };
    setLocation(defaultLoc);
    setAppState("ready");
  };

  // ── Render ─────────────────────────────────────────────────────

  return (
    <div className="notebook-paper min-h-screen">
      <div className="notebook-ruled min-h-screen">
        <div className="notebook-container">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="notebook-header"
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="notebook-title flex items-center gap-3">
                  <Sun className="w-7 h-7 text-[oklch(0.65_0.12_50)]" />
                  Gayatri Time
                </h1>
                <div className="notebook-date mt-1">
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {installPromptAvailable && (
                  <button
                    onClick={handleInstall}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-[var(--notebook-font)]"
                    title="Install app"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Install</span>
                  </button>
                )}
                <button
                  onClick={handleShare}
                  className="flex items-center justify-center h-8 w-8 text-muted-foreground hover:text-foreground transition-colors"
                  title="Share today's times"
                  disabled={appState !== "ready"}
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={cycleTheme}
                  className="flex items-center justify-center h-8 w-8 text-muted-foreground hover:text-foreground transition-colors"
                  title={`Switch theme (${themeLabel[theme]})`}
                >
                  {themeNextIcon[theme]}
                </button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSettingsOpen(true)}
                  className="h-8 w-8 p-0"
                >
                  <Settings className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="h-8 w-8 p-0"
                >
                  <RefreshCw
                    className={cn(
                      "w-4 h-4",
                      isRefreshing && "animate-spin",
                    )}
                  />
                </Button>
              </div>
            </div>
            <div className="notebook-annotation mt-3">
              The intersection of three sacred conditions — the final Muhurta
              before sunrise, spatial alignment with the solar deity Savitur,
              and the daily cycle of spiritual renewal.
            </div>
          </motion.div>

          {/* ── Loading State ── */}
          {appState === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <div className="w-12 h-12 rounded-full border-2 border-border border-t-[oklch(0.65_0.12_50)] animate-spin mb-4" />
              <div className="notebook-note">Locating & calculating...</div>
            </motion.div>
          )}

          {/* ── Location Prompt ── */}
          {appState === "location-prompt" && (
            <motion.div
              key="location-prompt"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="notebook-card mt-4 text-center py-8"
            >
              <MapPin className="w-10 h-10 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-bold font-[var(--notebook-font)] mb-2">
                Where are you?
              </h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto font-[var(--notebook-font)]">
                Gayatri Muhurta is calculated based on your local sunrise
                time. Share your location or enter coordinates manually.
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={initLocation} className="font-[var(--notebook-font)]">
                  <MapPin className="w-4 h-4 mr-2" />
                  Use My Location
                </Button>
                <Button
                  variant="outline"
                  onClick={handleUseDefaultLocation}
                  className="font-[var(--notebook-font)]"
                >
                  <Compass className="w-4 h-4 mr-2" />
                  Varanasi (Default)
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── Error State ── */}
          {appState === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="notebook-card mt-4 text-center py-8"
            >
              <AlertTriangle className="w-10 h-10 mx-auto mb-4 text-destructive" />
              <h2 className="text-xl font-bold font-[var(--notebook-font)] mb-2">
                Calculation Error
              </h2>
              <p className="text-sm text-muted-foreground mb-4 font-[var(--notebook-font)]">
                {errorMessage}
              </p>
              <Button onClick={handleRefresh} className="font-[var(--notebook-font)]">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </motion.div>
          )}

          {/* ── Main Content ── */}
          {appState === "ready" && times && (
            <motion.div
              key="ready"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              {/* Location */}
              {location && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className="notebook-reveal notebook-reveal-delay-1"
                >
                  <LocationPicker
                    location={location}
                    onLocationChange={handleLocationChange}
                    onClearSaved={handleClearSavedLocation}
                  />
                </motion.div>
              )}

              {/* Current Time */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="notebook-reveal notebook-reveal-delay-2"
              >
                <div className="notebook-card text-center py-3">
                  <div className="notebook-label">Current Time</div>
                  <div className="text-3xl font-bold font-[var(--notebook-font)] tracking-tight mt-1">
                    {formatTime(times.now)}
                  </div>
                </div>
              </motion.div>

              {/* Countdown */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="notebook-reveal notebook-reveal-delay-3"
              >
                <CountdownDisplay
                  times={times}
                  notificationsEnabled={notificationsEnabled}
                  audioAlarmEnabled={audioAlarmEnabled}
                  onToggleNotifications={toggleNotifications}
                  onToggleAudio={toggleAudioAlarm}
                  onTestAlarm={handleTestAlarm}
                />
              </motion.div>

              {/* Time Blocks */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="notebook-reveal notebook-reveal-delay-4 space-y-3"
              >
                <div className="notebook-label mb-1 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  Sacred Time Windows
                </div>

                <TimeBlock
                  label="Brahma Muhurta"
                  time={`${formatTime(times.brahmaMuhurtaStart)} — ${formatTime(times.brahmaMuhurtaEnd)}`}
                  icon={Moon}
                  active={times.isBrahmaMuhurta && !times.isGayatriTime}
                  highlight={times.isBrahmaMuhurta}
                />
                <TimeBlock
                  label="Gayatri Muhurta (Savitur)"
                  time={`${formatTime(times.gayatriMuhurtaStart)} — ${formatTime(times.gayatriMuhurtaEnd)}`}
                  icon={Sun}
                  active={times.isGayatriTime}
                  highlight={times.isGayatriTime}
                />
                <TimeBlock
                  label="Sunrise"
                  time={formatTime(times.sunrise)}                icon={SunriseIcon}
              />
                <TimeBlock
                  label="Sunset"
                  time={formatTime(times.sunset)}
                  icon={SunsetIcon}
                />
              </motion.div>

              {/* Timeline */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="notebook-reveal notebook-reveal-delay-5"
              >
                <TimelineBar times={times} />
              </motion.div>

              {/* Panchang */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <PanchangCard panchang={panchang} />
              </motion.div>

              {/* Muhurta detail */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="notebook-card"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Compass className="w-4 h-4 text-muted-foreground" />
                  <span className="notebook-label">About This Calculation</span>
                </div>
                <div className="space-y-2 text-sm font-[var(--notebook-font)] leading-relaxed">
                  <p>
                    In Vedic timekeeping, one full day (sunrise to next
                    sunrise) is divided into <span className="notebook-highlight">30 equal Muhurtas</span>.
                  </p>
                  <p>
                    The <strong>30th Muhurta</strong> (Savitur/Gayatri) ends
                    exactly at sunrise. Its length is{" "}
                    <strong>{times.muhurtaLengthMinutes.toFixed(1)} minutes</strong>{" "}
                    today, calculated from the duration between successive
                    sunrises divided by 30.
                  </p>
                  <p>
                    The <strong>29th Muhurta</strong> (Brahma) precedes Gayatri,
                    together forming the Brahma Muhurta period — the most
                    auspicious time for spiritual practice in the Hindu
                    tradition.
                  </p>
                </div>
              </motion.div>

              {/* Schedule View */}
              {location && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <ScheduleView lat={location.lat} lng={location.lng} />
                </motion.div>
              )}

              {/* Footer */}
              <div className="notebook-note text-center pt-4 pb-8">
                Gayatri Time Calculator · Notebook Edition ·{" "}
                {new Date().getFullYear()}
              </div>
            </motion.div>
          )}

          {/* ── Settings Sheet ── */}
          <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
            <SheetContent side="right" className="notebook-paper">
              <SheetHeader className="notebook-header !pb-3 !mb-0">
                <SheetTitle className="notebook-title !text-xl flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Settings
                </SheetTitle>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto px-4 space-y-5 pb-6 font-[var(--notebook-font)]">
                {/* ── Theme ── */}
                <div>
                  <div className="notebook-label flex items-center gap-2 mb-2">
                    <SunMoon className="w-3.5 h-3.5" />
                    Theme
                  </div>
                  <div className="flex gap-2">
                    {(["light", "sepia", "dark"] as ThemeMode[]).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setTheme(mode)}
                        className={cn(
                          "flex-1 py-2 px-3 text-xs rounded-sm border transition-all font-[var(--notebook-font)] capitalize",
                          theme === mode
                            ? "border-[oklch(0.65_0.12_50)] bg-[oklch(0.65_0.12_50_/_0.1)] text-[oklch(0.55_0.12_50)] font-semibold"
                            : "border-border text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {mode === "light" ? <Sun className="w-3 h-3 mx-auto mb-1" /> : mode === "sepia" ? <Sun className="w-3 h-3 mx-auto mb-1" /> : <Moon className="w-3 h-3 mx-auto mb-1" />}
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* ── Notifications ── */}
                <div>
                  <div className="notebook-label flex items-center gap-2 mb-2">
                    <Bell className="w-3.5 h-3.5" />
                    Browser Alert
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-[var(--notebook-font)]">
                      Notify when Gayatri time starts
                    </span>
                    <Switch
                      checked={notificationsEnabled}
                      onCheckedChange={toggleNotifications}
                    />
                  </div>
                  <div className="notebook-note mt-1">
                    Sends a browser notification when Gayatri Muhurta begins.
                  </div>
                </div>

                <Separator />

                {/* ── Audio Alarm ── */}
                <div>
                  <div className="notebook-label flex items-center gap-2 mb-2">
                    <Volume2 className="w-3.5 h-3.5" />
                    Audio Alarm
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-[var(--notebook-font)]">
                      Gentle chime on Gayatri time
                    </span>
                    <Switch
                      checked={audioAlarmEnabled}
                      onCheckedChange={toggleAudioAlarm}
                    />
                  </div>
                  <div className="notebook-note mt-1 mb-2">
                    Plays a layered chime with OM drone when Gayatri time starts.
                  </div>
                  {audioAlarmEnabled && (
                    <button
                      onClick={handleTestAlarm}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-[var(--notebook-font)]"
                    >
                      <Music className="w-3 h-3" />
                      Test chime
                    </button>
                  )}
                </div>

                <Separator />

                {/* ── Screen Wake Lock ── */}
                <div>
                  <div className="notebook-label flex items-center gap-2 mb-2">
                    <Sun className="w-3.5 h-3.5" />
                    Keep Screen On
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-[var(--notebook-font)]">
                      Prevent screen dimming
                    </span>
                    <div className={cn(
                      "text-xs font-semibold px-2 py-0.5 rounded-full",
                      wakeLockActive
                        ? "bg-green-500/10 text-green-600"
                        : times?.isGayatriTime
                          ? "bg-yellow-500/10 text-yellow-600"
                          : "text-muted-foreground"
                    )}>
                      {wakeLockActive ? "Active" : times?.isGayatriTime ? "Unavailable" : "Standby"}
                    </div>
                  </div>
                  <div className="notebook-note mt-1">
                    Automatically keeps your screen awake during Gayatri time.
                  </div>
                </div>

                <Separator />

                {/* ── Export Calendar ── */}
                <div>
                  <div className="notebook-label flex items-center gap-2 mb-2">
                    <CalendarDays className="w-3.5 h-3.5" />
                    Export
                  </div>
                  <button
                    onClick={handleExportICS}
                    className="w-full text-left text-sm py-2 px-3 rounded-sm border border-border hover:bg-muted/50 transition-colors font-[var(--notebook-font)]"
                  >
                    <div className="font-medium">Export to Calendar (.ics)</div>
                    <div className="notebook-note">
                      Add 30 days of Gayatri times to Google / Apple Calendar
                    </div>
                  </button>
                  {times && location && (
                    <button
                      onClick={handleShare}
                      className="w-full text-left text-sm py-2 px-3 rounded-sm border border-border hover:bg-muted/50 transition-colors font-[var(--notebook-font)] mt-2"
                    >
                      <div className="font-medium">Share as Text</div>
                      <div className="notebook-note">
                        Copy today's times to clipboard or share via system share
                      </div>
                    </button>
                  )}
                </div>

                <Separator />

                {/* ── Location Info ── */}
                <div>
                  <div className="notebook-label flex items-center gap-2 mb-2">
                    <MapPin className="w-3.5 h-3.5" />
                    Current Location
                  </div>
                  {location && (
                    <div className="text-sm font-[var(--notebook-font)]">
                      <div>{location.name || `${location.lat.toFixed(2)}°, ${location.lng.toFixed(2)}°`}</div>
                      <div className="notebook-note">
                        {location.lat.toFixed(4)}°N, {location.lng.toFixed(4)}°E
                      </div>
                    </div>
                  )}
                  <button
                    onClick={handleClearSavedLocation}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors mt-2 font-[var(--notebook-font)]"
                  >
                    Clear saved location &amp; re-prompt
                  </button>
                </div>

                <Separator />

                {/* ── About ── */}
                <div>
                  <div className="notebook-label flex items-center gap-2 mb-2">
                    <Info className="w-3.5 h-3.5" />
                    About
                  </div>
                  <div className="text-sm font-[var(--notebook-font)] leading-relaxed">
                    <p className="mb-2">
                      Gayatri Time calculates the exact Muhurta (Vedic time
                      window) when three sacred conditions align for chanting
                      the Gayatri Mantra.
                    </p>
                    <p className="mb-2">
                      The app uses the <strong>suncalc</strong> library for
                      accurate sunrise/sunset and{" "}
                      <strong>@fusionstrings/panchangam</strong> (Swiss
                      Ephemeris via Wasm) for Hindu calendar calculations.
                    </p>
                    <p className="notebook-note">
                      Version 1.0 · Notebook Edition · Built with React +
                      Convex + shadcn/ui
                    </p>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  );
}
