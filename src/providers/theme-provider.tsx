import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { type ThemeName } from "@/themes";

const STORAGE_KEY = "arkade-theme";

interface ThemeContextType {
    theme: ThemeName;
    isDark: boolean;
    setTheme: (theme: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType>({
    theme: "dawn",
    isDark: false,
    setTheme: () => {},
});

function getSystemTheme(): ThemeName {
    if (typeof window === "undefined") return "dawn";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "midnight" : "dawn";
}

function applyTheme(t: ThemeName) {
    document.documentElement.setAttribute("data-theme", t);
    if (t === "midnight") {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
    } else {
        document.documentElement.classList.remove("dark");
        document.documentElement.classList.add("light");
    }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<ThemeName>("dawn");

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY) as ThemeName | null;
        const initial = stored === "dawn" || stored === "midnight" ? stored : getSystemTheme();
        setThemeState(initial);
        applyTheme(initial);

        if (!stored) {
            const mq = window.matchMedia("(prefers-color-scheme: dark)");
            const handler = (e: MediaQueryListEvent) => {
                const t = e.matches ? "midnight" : "dawn";
                setThemeState(t);
                applyTheme(t);
            };
            mq.addEventListener("change", handler);
            return () => mq.removeEventListener("change", handler);
        }
    }, []);

    const setTheme = useCallback((t: ThemeName) => {
        localStorage.setItem(STORAGE_KEY, t);
        setThemeState(t);
        applyTheme(t);
    }, []);

    return (
        <ThemeContext.Provider value={{ theme, isDark: theme === "midnight", setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}
