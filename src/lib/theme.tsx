import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { parseTheme, THEME_KEY, type Theme } from "./theme-preference";

const ThemeContext = createContext<{ theme: Theme; setTheme: (theme: Theme) => void } | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  useEffect(() => {
    try { setThemeState(parseTheme(localStorage.getItem(THEME_KEY))); } catch { /* Dark is the storage-free default. */ }
    const sync = (event: StorageEvent) => {
      if (event.key === THEME_KEY) setThemeState(parseTheme(event.newValue));
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);
  const setTheme = (next: Theme) => {
    setThemeState(next);
    try { localStorage.setItem(THEME_KEY, next); } catch { /* Theme still works without browser persistence. */ }
  };
  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme requires ThemeProvider");
  return value;
}