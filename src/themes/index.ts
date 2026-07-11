export type ThemeName = "dawn" | "midnight";

export const THEMES: Record<ThemeName, { isDark: boolean }> = {
    dawn: { isDark: false },
    midnight: { isDark: true },
};
