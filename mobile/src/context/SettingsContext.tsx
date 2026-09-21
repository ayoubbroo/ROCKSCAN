import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import i18nInstance, { detectInitialLocale, setLocale, SupportedLocale } from '../i18n';
import { getAllSettings, setSetting } from '../db/repositories/settingsRepo';

export type UnitSystem = 'metric';
export type Currency = 'MAD' | 'USD' | 'EUR';

interface SettingsState {
  locale: SupportedLocale;
  currency: Currency;
  units: UnitSystem;
  ready: boolean;
  changeLocale: (locale: SupportedLocale) => Promise<void>;
  changeCurrency: (currency: Currency) => Promise<void>;
}

const SettingsContext = createContext<SettingsState | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>('fr');
  const [currency, setCurrencyState] = useState<Currency>('MAD');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await getAllSettings();
        const savedLocale = (stored.locale as SupportedLocale) || detectInitialLocale();
        const savedCurrency = (stored.currency as Currency) || 'MAD';
        setLocale(savedLocale);
        setLocaleState(savedLocale);
        setCurrencyState(savedCurrency);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const changeLocale = useCallback(async (next: SupportedLocale) => {
    setLocale(next);
    setLocaleState(next);
    await setSetting('locale', next);
  }, []);

  const changeCurrency = useCallback(async (next: Currency) => {
    setCurrencyState(next);
    await setSetting('currency', next);
  }, []);

  const value = useMemo(
    () => ({ locale, currency, units: 'metric' as UnitSystem, ready, changeLocale, changeCurrency }),
    [locale, currency, ready, changeLocale, changeCurrency]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsState {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider');
  return ctx;
}

export { i18nInstance };
