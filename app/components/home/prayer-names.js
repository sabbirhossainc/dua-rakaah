import { t } from "@/lib/i18n";

const KEYS = {
  fajr: "prayerFajr",
  sunrise: "prayerSunrise",
  dhuhr: "prayerDhuhr",
  asr: "prayerAsr",
  maghrib: "prayerMaghrib",
  isha: "prayerIsha",
};

export const prayerName = (key, lang) => t(lang, KEYS[key]);
