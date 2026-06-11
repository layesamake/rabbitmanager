import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

export type ThemeColors = {
  background: string;
  onBackground: string;
  surface: string;
  onSurface: string;
  surfaceVariant: string;
  onSurfaceVariant: string;
  surfaceCard: string;
  surfaceBorder: string;
  surfaceContainer: string;
  primary: string;
  onPrimary: string;
  secondary: string;
  onSecondary: string;
  tertiary: string;
  onTertiary: string;
  error: string;
  onError: string;
  textPrimary: string;
  textSecondary: string;
  statusCritical: string;
  statusBreeding: string;
  statusSuccess: string;
};

export type ThemePalette = {
  id: string;
  name: string;
  mode: 'dark' | 'light';
  colors: ThemeColors;
};

export const defaultThemes: ThemePalette[] = [
  {
    id: "farm-dark",
    name: "Ferme Sombre",
    mode: "dark",
    colors: {
      background: "#0f120e",
      onBackground: "#e2e3dd",
      surface: "#0f120e",
      onSurface: "#e2e3dd",
      surfaceVariant: "#283026",
      onSurfaceVariant: "#bec9b9",
      surfaceCard: "#151a14",
      surfaceBorder: "#2a3328",
      surfaceContainer: "#171d15",
      primary: "#FDE884",
      onPrimary: "#382D00",
      secondary: "#BAE8B1",
      onSecondary: "#083808",
      tertiary: "#FFD1C1",
      onTertiary: "#4A1603",
      error: "#ffb4ab",
      onError: "#690005",
      textPrimary: "#f2f5ec",
      textSecondary: "#a1ab9c",
      statusCritical: "#EF4444",
      statusBreeding: "#EAB308",
      statusSuccess: "#22C55E",
    }
  },
  {
    id: "farm-light",
    name: "Ferme Clair",
    mode: "light",
    colors: {
      background: "#f9fcf5",
      onBackground: "#191d17",
      surface: "#f9fcf5",
      onSurface: "#191d17",
      surfaceVariant: "#dfe4d7",
      onSurfaceVariant: "#43483f",
      surfaceCard: "#ffffff",
      surfaceBorder: "#c3c8bc",
      surfaceContainer: "#f3f6ee",
      primary: "#755b00",
      onPrimary: "#ffffff",
      secondary: "#2c6c29",
      onSecondary: "#ffffff",
      tertiary: "#9c4221",
      onTertiary: "#ffffff",
      error: "#ba1a1a",
      onError: "#ffffff",
      textPrimary: "#191d17",
      textSecondary: "#43483f",
      statusCritical: "#EF4444",
      statusBreeding: "#EAB308",
      statusSuccess: "#22C55E",
    }
  },
  {
    id: "blue-dark",
    name: "Océan Sombre",
    mode: "dark",
    colors: {
      background: "#0b1326",
      onBackground: "#dae2fd",
      surface: "#0b1326",
      onSurface: "#dae2fd",
      surfaceVariant: "#2d3449",
      onSurfaceVariant: "#bac9cc",
      surfaceCard: "#1E293B",
      surfaceBorder: "#334155",
      surfaceContainer: "#171f33",
      primary: "#c3f5ff",
      onPrimary: "#00363d",
      secondary: "#4ae183",
      onSecondary: "#003919",
      tertiary: "#ffe9d4",
      onTertiary: "#472a00",
      error: "#ffb4ab",
      onError: "#690005",
      textPrimary: "#F8FAFC",
      textSecondary: "#94A3B8",
      statusCritical: "#EF4444",
      statusBreeding: "#EAB308",
      statusSuccess: "#22C55E",
    }
  }
];

interface ThemeState {
  currentTheme: ThemePalette;
  setTheme: (themeId: string) => Promise<void>;
  loadTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set) => ({
  currentTheme: defaultThemes[0], // Par défaut, Ferme Sombre
  setTheme: async (themeId: string) => {
    const theme = defaultThemes.find(t => t.id === themeId) || defaultThemes[0];
    await SecureStore.setItemAsync('app-theme-preset', themeId);
    set({ currentTheme: theme });
  },
  loadTheme: async () => {
    try {
      const savedPreset = await SecureStore.getItemAsync('app-theme-preset');
      if (savedPreset) {
        const theme = defaultThemes.find(t => t.id === savedPreset);
        if (theme) {
          set({ currentTheme: theme });
        }
      }
    } catch (e) {
      console.error('Erreur lors du chargement du thème', e);
    }
  }
}));
