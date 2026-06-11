export type ThemePalette = {
  id: string;
  name: string;
  mode: 'dark' | 'light';
  colors: Record<string, string>;
};

export const defaultThemes: ThemePalette[] = [
  {
    id: "farm-dark",
    name: "Ferme Sombre",
    mode: "dark",
    colors: {
      "--theme-background": "#0f120e",
      "--theme-on-background": "#e2e3dd",
      "--theme-surface": "#0f120e",
      "--theme-on-surface": "#e2e3dd",
      "--theme-surface-variant": "#283026",
      "--theme-on-surface-variant": "#bec9b9",
      "--theme-surface-card": "#151a14",
      "--theme-surface-border": "#2a3328",
      "--theme-surface-container": "#171d15",
      "--theme-surface-container-low": "#121610",
      "--theme-surface-container-high": "#1c241a",
      
      "--theme-primary": "#FDE884",
      "--theme-on-primary": "#382D00",
      "--theme-primary-container": "#EBB60D",
      "--theme-on-primary-container": "#423200",
      
      "--theme-secondary": "#BAE8B1",
      "--theme-on-secondary": "#083808",
      "--theme-secondary-container": "#4AA443",
      "--theme-on-secondary-container": "#0B420B",
    
      "--theme-tertiary": "#FFD1C1",
      "--theme-on-tertiary": "#4A1603",
      "--theme-tertiary-container": "#D15A36",
      "--theme-on-tertiary-container": "#401100",
      
      "--theme-error": "#ffb4ab",
      "--theme-on-error": "#690005",
      "--theme-error-container": "#93000a",
      "--theme-on-error-container": "#ffdad6",
      
      "--theme-text-primary": "#f2f5ec",
      "--theme-text-secondary": "#a1ab9c"
    }
  },
  {
    id: "farm-light",
    name: "Ferme Clair",
    mode: "light",
    colors: {
      "--theme-background": "#f9fcf5",
      "--theme-on-background": "#191d17",
      "--theme-surface": "#f9fcf5",
      "--theme-on-surface": "#191d17",
      "--theme-surface-variant": "#dfe4d7",
      "--theme-on-surface-variant": "#43483f",
      "--theme-surface-card": "#ffffff",
      "--theme-surface-border": "#c3c8bc",
      "--theme-surface-container": "#f3f6ee",
      "--theme-surface-container-low": "#f9fcf5",
      "--theme-surface-container-high": "#edebe5",
      
      "--theme-primary": "#755b00",
      "--theme-on-primary": "#ffffff",
      "--theme-primary-container": "#FDE884",
      "--theme-on-primary-container": "#241a00",
      
      "--theme-secondary": "#2c6c29",
      "--theme-on-secondary": "#ffffff",
      "--theme-secondary-container": "#BAE8B1",
      "--theme-on-secondary-container": "#002200",
    
      "--theme-tertiary": "#9c4221",
      "--theme-on-tertiary": "#ffffff",
      "--theme-tertiary-container": "#FFD1C1",
      "--theme-on-tertiary-container": "#3b0900",
      
      "--theme-error": "#ba1a1a",
      "--theme-on-error": "#ffffff",
      "--theme-error-container": "#ffdad6",
      "--theme-on-error-container": "#410002",
      
      "--theme-text-primary": "#191d17",
      "--theme-text-secondary": "#43483f"
    }
  },
  {
    id: "blue-dark",
    name: "Océan Sombre",
    mode: "dark",
    colors: {
      "--theme-background": "#0b1326",
      "--theme-on-background": "#dae2fd",
      "--theme-surface": "#0b1326",
      "--theme-on-surface": "#dae2fd",
      "--theme-surface-variant": "#2d3449",
      "--theme-on-surface-variant": "#bac9cc",
      "--theme-surface-card": "#1E293B",
      "--theme-surface-border": "#334155",
      "--theme-surface-container": "#171f33",
      "--theme-surface-container-low": "#131b2e",
      "--theme-surface-container-high": "#222a3d",
      
      "--theme-primary": "#c3f5ff",
      "--theme-on-primary": "#00363d",
      "--theme-primary-container": "#00e5ff",
      "--theme-on-primary-container": "#00626e",
      
      "--theme-secondary": "#4ae183",
      "--theme-on-secondary": "#003919",
      "--theme-secondary-container": "#06bb63",
      "--theme-on-secondary-container": "#00431f",
    
      "--theme-tertiary": "#ffe9d4",
      "--theme-on-tertiary": "#472a00",
      "--theme-tertiary-container": "#ffc683",
      "--theme-on-tertiary-container": "#7f4e00",
      
      "--theme-error": "#ffb4ab",
      "--theme-on-error": "#690005",
      "--theme-error-container": "#93000a",
      "--theme-on-error-container": "#ffdad6",
      
      "--theme-text-primary": "#F8FAFC",
      "--theme-text-secondary": "#94A3B8"
    }
  }
];

export function applyThemeColors(colors: Record<string, string>) {
  const root = document.documentElement;
  Object.entries(colors).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

export function loadSavedTheme() {
  const saved = localStorage.getItem('app-theme-custom');
  if (saved) {
    try {
      const colors = JSON.parse(saved);
      applyThemeColors(colors);
      return;
    } catch {
      // syntax error reading JSON
    }
  }
  
  const savedPreset = localStorage.getItem('app-theme-preset');
  if (savedPreset) {
    const preset = defaultThemes.find(t => t.id === savedPreset);
    if (preset) {
      applyThemeColors(preset.colors);
      return;
    }
  }
}
