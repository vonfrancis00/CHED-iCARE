import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

export default function ThemeToggle({ floating = false }) {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === "dark";
  return <button type="button" className={`theme-toggle${floating ? " theme-toggle-floating" : ""}`} onClick={toggleTheme} aria-label={`Switch to ${dark ? "light" : "dark"} mode`} aria-pressed={dark} title={`Switch to ${dark ? "light" : "dark"} mode`}>
    {dark ? <Sun size={floating ? 24 : 18} aria-hidden="true" /> : <Moon size={floating ? 24 : 18} aria-hidden="true" />}{!floating && <span>{dark ? "Light mode" : "Dark mode"}</span>}
  </button>;
}
