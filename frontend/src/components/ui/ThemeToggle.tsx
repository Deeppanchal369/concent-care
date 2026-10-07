import { useTheme } from "../../context/ThemeContext";

interface ThemeToggleProps {
  className?: string;
  variant?: "segmented" | "button";
}

export default function ThemeToggle({ className = "", variant = "button" }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();

  if (variant === "segmented") {
    return (
      <div
        className={`inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs ${className}`}
        role="group"
        aria-label="Theme preference"
      >
        <button
          type="button"
          onClick={() => setTheme("light")}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all ${
            theme === "light"
              ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs font-semibold"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
          title="Light mode"
          aria-pressed={theme === "light"}
        >
          <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <span className="hidden sm:inline">Light</span>
        </button>

        <button
          type="button"
          onClick={() => setTheme("system")}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all ${
            theme === "system"
              ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs font-semibold"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
          title="System default"
          aria-pressed={theme === "system"}
        >
          <svg className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span className="hidden sm:inline">System</span>
        </button>

        <button
          type="button"
          onClick={() => setTheme("dark")}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all ${
            theme === "dark"
              ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs font-semibold"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
          title="Dark mode"
          aria-pressed={theme === "dark"}
        >
          <svg className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
          <span className="hidden sm:inline">Dark</span>
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:outline-none ${className}`}
      title={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
      aria-label={`Toggle theme (currently ${theme})`}
    >
      {resolvedTheme === "dark" ? (
        <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
}
