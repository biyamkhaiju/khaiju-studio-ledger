export type Theme = "dark" | "light";
export const THEME_KEY = "khaiju-studio-theme-v1";
export function parseTheme(value: string | null): Theme {
  return value === "light" ? "light" : "dark";
}