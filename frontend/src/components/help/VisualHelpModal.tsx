import { useState } from "react";
import { useTranslation } from "react-i18next";
import { triggerHaptic } from "../../utils/haptics";

interface VisualHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRole?: "PATIENT" | "DOCTOR" | "NURSE" | "ADMIN";
}

export default function VisualHelpModal({ isOpen, onClose, defaultRole = "PATIENT" }: VisualHelpModalProps) {
  const { t } = useTranslation();
  const [selectedRole, setSelectedRole] = useState<"PATIENT" | "DOCTOR" | "NURSE" | "ADMIN">(defaultRole);
  const [showVideoSimulation, setShowVideoSimulation] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-6 text-slate-900 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span>📖</span>
              <span>{t("help.title")}</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t("help.subtitle")}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              triggerHaptic(10);
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label={t("common.actions.close")}
          >
            ✕
          </button>
        </div>

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
          {(["PATIENT", "DOCTOR", "NURSE", "ADMIN"] as const).map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => {
                setSelectedRole(role);
                triggerHaptic(5);
              }}
              className={`py-2 px-2 rounded-lg transition text-center truncate ${
                selectedRole === role
                  ? "bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-2xs font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              {t(`common.roles.${role.toLowerCase()}`)}
            </button>
          ))}
        </div>

        {/* Optional 1-Minute Visual Guide Simulation */}
        <div className="p-3.5 bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200/60 dark:border-teal-800/60 rounded-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">🎬</span>
            <div>
              <p className="text-xs font-bold text-teal-900 dark:text-teal-200">
                1-Minute Visual Guide ({t(`common.roles.${selectedRole.toLowerCase()}`)})
              </p>
              <p className="text-[11px] text-teal-700 dark:text-teal-300">
                Optional visual animation. Step-by-step text is provided below.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowVideoSimulation(!showVideoSimulation)}
            className="btn-tactile text-xs font-bold bg-teal hover:bg-teal-dark text-white px-3 py-1.5 rounded-lg transition shrink-0"
          >
            {showVideoSimulation ? t("common.actions.close") : "▶ Play Guide"}
          </button>
        </div>

        {showVideoSimulation && (
          <div className="bg-slate-950 text-slate-200 rounded-xl overflow-hidden border border-slate-800 space-y-2">
            <div className="aspect-video w-full bg-slate-950 flex items-center justify-center">
              <video
                controls
                playsInline
                preload="metadata"
                poster="/media/how-it-works-poster.svg"
                className="w-full h-full object-contain"
              >
                <source src="/media/how-it-works.mp4" type="video/mp4" />
                {t("howItWorksModal.browserNotSupported", "Your browser does not support the video tag.")}
              </video>
            </div>
            <div className="px-4 pb-3 pt-1 text-center">
              <p className="text-xs font-semibold text-slate-300">
                {t("howItWorksModal.title", "How ArogyaMitra Works")} ({t(`common.roles.${selectedRole.toLowerCase()}`)})
              </p>
            </div>
          </div>
        )}

        {/* Step-by-Step Text Instructions */}
        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {selectedRole === "PATIENT" && (
            <>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">{t("help.patientGuide.step1")}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">{t("help.patientGuide.step2")}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">{t("help.patientGuide.step3")}</p>
              </div>
            </>
          )}

          {selectedRole === "DOCTOR" && (
            <>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">{t("help.doctorGuide.step1")}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">{t("help.doctorGuide.step2")}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">{t("help.doctorGuide.step3")}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">{t("help.doctorGuide.step4")}</p>
              </div>
            </>
          )}

          {selectedRole === "NURSE" && (
            <>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">{t("help.nurseGuide.step1")}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">{t("help.nurseGuide.step2")}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">{t("help.nurseGuide.step3")}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">{t("help.nurseGuide.step4")}</p>
              </div>
            </>
          )}

          {selectedRole === "ADMIN" && (
            <>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">{t("help.adminGuide.step1")}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">{t("help.adminGuide.step2")}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">{t("help.adminGuide.step3")}</p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={() => {
              triggerHaptic(10);
              onClose();
            }}
            className="btn-tactile text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 px-4 py-2 rounded-xl transition"
          >
            {t("common.actions.done")}
          </button>
        </div>
      </div>
    </div>
  );
}
