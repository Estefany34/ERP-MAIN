import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { darkTheme, lightTheme, type FanixTheme } from './fanixTheme';

export type ThemeMode = 'light' | 'dark' | 'system';

type FanixThemeContextValue = {
  theme: FanixTheme;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  isDark: boolean;
};

const STORAGE_KEY = 'fanix-global-theme-mode';
const FanixThemeContext = createContext<FanixThemeContextValue | null>(null);

export function FanixThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('dark');

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((storedMode) => {
        if (mounted && (storedMode === 'light' || storedMode === 'dark' || storedMode === 'system')) {
          setModeState(storedMode);
        }
      })
      .catch(() => undefined);
    return () => { mounted = false; };
  }, []);

  const setMode = (nextMode: ThemeMode) => {
    setModeState(nextMode);
    AsyncStorage.setItem(STORAGE_KEY, nextMode).catch(() => undefined);
  };

  const isDark = mode === 'system' ? systemColorScheme === 'dark' : mode === 'dark';
  const value = useMemo(() => ({ theme: isDark ? darkTheme : lightTheme, mode, setMode, isDark }), [isDark, mode]);

  return <FanixThemeContext.Provider value={value}>{children}</FanixThemeContext.Provider>;
}

export function useFanixTheme() {
  const context = useContext(FanixThemeContext);
  if (!context) throw new Error('useFanixTheme debe utilizarse dentro de FanixThemeProvider');
  return context;
}
