import React, { createContext, useContext, useState, ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceElevated: string;
  primary: string;
  primaryLight: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  danger: string;
  dangerLight: string;
  success: string;
  cardShadow: string;
  overlay: string;
  toggleTrack: string;
  toggleThumb: string;
  headerBg: string;
  emptyIcon: string;
  textInstruct: string;
}

const lightColors: ThemeColors = {
  background: '#F5F0EB',
  surface: '#FFFFFF',
  surfaceElevated: '#FDF8F3',
  primary: '#3e9284',
  primaryLight: '#cee9f4',
  text: '#10282c',
  textSecondary: '#35576b',
  textMuted: '#6091a0',
  textInstruct: '#8aa1b1',
  border: '#bed4e8',
  danger: '#D64545',
  dangerLight: '#FDEAEA',
  success: '#4CAF50',
  cardShadow: 'rgba(16, 33, 44, 0.12)',
  overlay: 'rgba(44, 24, 16, 0.5)',
  toggleTrack: '#bed0e8',
  toggleThumb: '#ffffff',
  headerBg: '#97efff',
  emptyIcon: '#a1d5ff',
};

const darkColors: ThemeColors = {
  background: '#0F0A06',
  surface: '#1C1209',
  surfaceElevated: '#251A0F',
  primary: '#E8943A',
  primaryLight: '#3A2010',
  text: '#F5E6D3',
  textSecondary: '#C4956A',
  textMuted: '#a17848',
  textInstruct: '#805f39',
  border: '#3A2A1A',
  danger: '#FF6B6B',
  dangerLight: '#3A1515',
  success: '#66BB6A',
  cardShadow: 'rgba(0, 0, 0, 0.5)',
  overlay: 'rgba(0, 0, 0, 0.7)',
  toggleTrack: '#3A2A1A',
  toggleThumb: '#E8943A',
  headerBg: '#1C1209',
  emptyIcon: '#3A2A1A',
};

interface ThemeContextType {
  mode: ThemeMode;
  colors: ThemeColors;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setMode] = useState<ThemeMode>('light');

  const toggleTheme = () => {
    setMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const colors = mode === 'dark' ? darkColors : lightColors;
  const isDark = mode === 'dark';

  return (
    <ThemeContext.Provider value={{ mode, colors, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};