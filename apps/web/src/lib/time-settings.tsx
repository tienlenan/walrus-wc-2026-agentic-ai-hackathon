import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useI18n } from "./i18n";

export type TimeZoneSetting = "auto" | string;

interface TimeValue {
  selectedTimeZone: TimeZoneSetting;
  effectiveTimeZone: string;
  timeZoneLabel: string;
  timeZoneOptions: string[];
  setSelectedTimeZone: (timeZone: TimeZoneSetting) => void;
  formatDate: (value: string | Date, options?: Intl.DateTimeFormatOptions) => string;
  formatTime: (value: string | Date, options?: Intl.DateTimeFormatOptions) => string;
  formatDateTime: (value: string | Date, options?: Intl.DateTimeFormatOptions) => string;
}

const LS_KEY = "dw.timezone";
const COMMON_TIME_ZONES = [
  "UTC",
  "Asia/Ho_Chi_Minh",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Mexico_City",
  "America/Toronto",
];

const TimeContext = createContext<TimeValue | null>(null);

function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function supportedTimeZones(): string[] {
  try {
    const supported = Intl.supportedValuesOf?.("timeZone") ?? [];
    const common = COMMON_TIME_ZONES.filter((zone, index) => COMMON_TIME_ZONES.indexOf(zone) === index);
    const rest = supported.filter((zone) => !common.includes(zone)).sort((a, b) => a.localeCompare(b));
    return [...common, ...rest];
  } catch {
    return COMMON_TIME_ZONES;
  }
}

export function loadTimeZoneSetting(): TimeZoneSetting {
  try {
    const saved = localStorage.getItem(LS_KEY);
    return saved && saved.trim() ? saved : "auto";
  } catch {
    return "auto";
  }
}

export function saveTimeZoneSetting(timeZone: TimeZoneSetting): void {
  try {
    if (timeZone === "auto") localStorage.removeItem(LS_KEY);
    else localStorage.setItem(LS_KEY, timeZone);
  } catch {
    /* ignore */
  }
}

function toDate(value: string | Date): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function TimeProvider({ children }: { children: ReactNode }) {
  const { lang } = useI18n();
  const [selectedTimeZone, setSelectedTimeZoneState] = useState<TimeZoneSetting>(loadTimeZoneSetting);
  const effectiveTimeZone = selectedTimeZone === "auto" ? browserTimeZone() : selectedTimeZone;
  const locale = lang === "en" ? "en-US" : "vi-VN";
  const timeZoneOptions = useMemo(() => supportedTimeZones(), []);

  const setSelectedTimeZone = useCallback((timeZone: TimeZoneSetting) => {
    saveTimeZoneSetting(timeZone);
    setSelectedTimeZoneState(timeZone);
  }, []);

  const format = useCallback(
    (value: string | Date, options: Intl.DateTimeFormatOptions) => {
      const date = toDate(value);
      if (!date) return "-";
      try {
        return new Intl.DateTimeFormat(locale, { ...options, timeZone: effectiveTimeZone }).format(date);
      } catch {
        return new Intl.DateTimeFormat(locale, options).format(date);
      }
    },
    [effectiveTimeZone, locale],
  );

  const value = useMemo<TimeValue>(
    () => ({
      selectedTimeZone,
      effectiveTimeZone,
      timeZoneLabel: selectedTimeZone === "auto" ? `${effectiveTimeZone} (auto)` : effectiveTimeZone,
      timeZoneOptions,
      setSelectedTimeZone,
      formatDate: (date, options) =>
        format(date, {
          year: "numeric",
          month: "long",
          day: "numeric",
          ...options,
        }),
      formatTime: (date, options) =>
        format(date, {
          hour: "2-digit",
          minute: "2-digit",
          second: options?.second,
          timeZoneName: "short",
          ...options,
        }),
      formatDateTime: (date, options) =>
        format(date, {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          timeZoneName: "short",
          ...options,
        }),
    }),
    [effectiveTimeZone, format, selectedTimeZone, setSelectedTimeZone, timeZoneOptions],
  );

  return <TimeContext.Provider value={value}>{children}</TimeContext.Provider>;
}

export function useTimeSettings(): TimeValue {
  const ctx = useContext(TimeContext);
  if (!ctx) throw new Error("useTimeSettings must be used inside TimeProvider");
  return ctx;
}
