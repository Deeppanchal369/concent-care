import { useTranslation } from "react-i18next";
import { setAppLanguage } from "../../i18n";
import { triggerHaptic } from "../../utils/haptics";

export default function LanguageToggle() {
  const { i18n } = useTranslation();
  const currentLang = i18n.language || "en";

  const toggleLanguage = () => {
    const nextLang = currentLang === "en" ? "gu" : "en";
    setAppLanguage(nextLang);
    triggerHaptic(10);
  };

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-teal-50 dark:hover:bg-teal-950/50 hover:text-teal-700 dark:hover:text-teal-300 border border-slate-200/80 dark:border-slate-700/80 transition active:scale-95 focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:outline-none"
      title={currentLang === "en" ? "ગુજરાતીમાં જુઓ" : "Switch to English"}
      aria-label="Toggle language"
    >
      <span className="text-[11px] opacity-75">🌐</span>
      <span>{currentLang === "en" ? "ગુજરાતી" : "English"}</span>
    </button>
  );
}
