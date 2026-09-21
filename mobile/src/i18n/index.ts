import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';
import { I18nManager } from 'react-native';

import fr from './fr.json';
import en from './en.json';
import ar from './ar.json';

export const SUPPORTED_LOCALES = ['fr', 'en', 'ar'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const RTL_LOCALES: SupportedLocale[] = ['ar'];

const i18n = new I18n({ fr, en, ar });

// French is the default per product spec, regardless of device locale,
// unless the user has explicitly chosen another language in Settings
// (see SettingsContext, which calls setLocale after reading the saved preference).
i18n.defaultLocale = 'fr';
i18n.locale = 'fr';
i18n.enableFallback = true;

export function detectInitialLocale(): SupportedLocale {
  const deviceLocales = Localization.getLocales?.() ?? [];
  const deviceCode = deviceLocales[0]?.languageCode;
  if (deviceCode && (SUPPORTED_LOCALES as readonly string[]).includes(deviceCode)) {
    return deviceCode as SupportedLocale;
  }
  return 'fr';
}

export function setLocale(locale: SupportedLocale) {
  i18n.locale = locale;
  const shouldBeRTL = RTL_LOCALES.includes(locale);
  if (I18nManager.isRTL !== shouldBeRTL) {
    I18nManager.allowRTL(shouldBeRTL);
    I18nManager.forceRTL(shouldBeRTL);
    // NOTE: React Native requires a reload for forceRTL to take full effect.
    // SettingsScreen prompts the user to restart the app after a language
    // change that flips text direction (FR/EN <-> AR).
  }
}

export function t(key: string, options?: Record<string, unknown>): string {
  return i18n.t(key, options);
}

export default i18n;
