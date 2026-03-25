export const THEME_NAMES = [
  'midnight', 'dawn', 'glass', 'phantom', 'nebula',
  'carbon', 'paper', 'obsidian', 'slate', 'ember',
] as const;

export type ThemeName = typeof THEME_NAMES[number];

export interface ThemeMetadata {
  name: ThemeName;
  label: string;
  description: string;
  isDark: boolean;
  preview: {
    bg: string;
    surface: string;
    text: string;
  };
}

export const THEMES: Record<ThemeName, ThemeMetadata> = {
  midnight: {
    name: 'midnight',
    label: 'Midnight',
    description: 'Deep dark with purple undertones',
    isDark: true,
    preview: { bg: '#0a0a0f', surface: '#12121a', text: '#e4e4e7' },
  },
  dawn: {
    name: 'dawn',
    label: 'Dawn',
    description: 'Light mode with airy purple accents',
    isDark: false,
    preview: { bg: '#fafafa', surface: '#ffffff', text: '#18181b' },
  },
  glass: {
    name: 'glass',
    label: 'Glass',
    description: 'Frosted glassmorphism surfaces',
    isDark: true,
    preview: { bg: '#0c0c14', surface: '#1a1a2e', text: '#e4e4e7' },
  },
  phantom: {
    name: 'phantom',
    label: 'Phantom',
    description: 'High contrast monochrome + purple',
    isDark: true,
    preview: { bg: '#050505', surface: '#0e0e0e', text: '#f0f0f0' },
  },
  nebula: {
    name: 'nebula',
    label: 'Nebula',
    description: 'Rich purple gradient atmosphere',
    isDark: true,
    preview: { bg: '#0d0a1a', surface: '#16102a', text: '#e4e4e7' },
  },
  carbon: {
    name: 'carbon',
    label: 'Carbon',
    description: 'Matte industrial, borders only',
    isDark: true,
    preview: { bg: '#1a1a1a', surface: '#222222', text: '#d4d4d4' },
  },
  paper: {
    name: 'paper',
    label: 'Paper',
    description: 'Warm cream with soft shadows',
    isDark: false,
    preview: { bg: '#f5f0e8', surface: '#faf7f2', text: '#2c2416' },
  },
  obsidian: {
    name: 'obsidian',
    label: 'Obsidian',
    description: 'True black OLED, sharp accents',
    isDark: true,
    preview: { bg: '#000000', surface: '#0a0a0a', text: '#ffffff' },
  },
  slate: {
    name: 'slate',
    label: 'Slate',
    description: 'Cool blue-gray professional',
    isDark: true,
    preview: { bg: '#0f1219', surface: '#161b25', text: '#cbd5e1' },
  },
  ember: {
    name: 'ember',
    label: 'Ember',
    description: 'Dark with warm brown-gray tones',
    isDark: true,
    preview: { bg: '#121010', surface: '#1a1614', text: '#e8ddd0' },
  },
};
