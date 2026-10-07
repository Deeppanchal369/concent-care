import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { LongitudinalClinicalInsights, RiskPredictionResult } from "../../api/client";
import { triggerHaptic } from "../../utils/haptics";

interface HealthInsightsSectionProps {
  insights: LongitudinalClinicalInsights | null;
  riskAssessment: RiskPredictionResult | null;
  loading: boolean;
  onGenerate: () => void;
  isDoctor?: boolean;
}

export default function HealthInsightsSection({
  insights,
  riskAssessment,
  loading,
  onGenerate,
  isDoctor = false,
}: HealthInsightsSectionProps) {
  const { t, i18n } = useTranslation();
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<number>(1);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [timedOut, setTimedOut] = useState<boolean>(false);
  const timerRef = useRef<any>(null);

  // Phased progress tracking during AI generation
  useEffect(() => {
    if (loading) {
      setElapsedSeconds(0);
      setTimedOut(false);
      setCurrentPhase(1);

      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        const secs = Math.floor((Date.now() - startTime) / 1000);
        setElapsedSeconds(secs);

        if (secs < 3) setCurrentPhase(1);
        else if (secs < 7) setCurrentPhase(2);
        else if (secs < 12) setCurrentPhase(3);
        else if (secs < 20) setCurrentPhase(4);
        else setCurrentPhase(5);

        if (secs >= 45) {
          setTimedOut(true);
        }
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setTimedOut(false);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loading]);

  const isSafeFallback =
    insights?.synthesis_type === "SAFE NON-LLM FALLBACK" ||
    insights?.model_provider?.includes("SAFE NON-LLM") ||
    insights?.model_provider?.includes("deterministic");

  const phaseLabels = [
    t("ai.status.phases.phase1"),
    t("ai.status.phases.phase2"),
    t("ai.status.phases.phase3"),
    t("ai.status.phases.phase4"),
    t("ai.status.phases.phase5"),
  ];

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-teal dark:text-teal-400 uppercase tracking-wider block">
              {t("ai.title")}
            </span>
            {insights && (
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5 ${
                  isSafeFallback
                    ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                    : "bg-teal-50 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300 border border-teal-200/70 dark:border-teal-800"
                }`}
              >
                <span>{isSafeFallback ? "🛡️" : "⚡"}</span>
                <span>{isSafeFallback ? t("ai.status.fallbackBadge") : t("ai.status.aiBadge")}</span>
              </span>
            )}
          </div>
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">
            {t("ai.title")}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t("ai.subtitle")}
          </p>
        </div>

        {isDoctor && (
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              triggerHaptic(10);
              onGenerate();
            }}
            className="btn-tactile px-4 py-2.5 rounded-xl bg-teal hover:bg-teal-dark text-white text-xs font-bold shadow-xs transition disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2 shrink-0"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>{phaseLabels[currentPhase - 1] || t("ai.status.analyzing")}</span>
              </>
            ) : (
              <span>⚡ {t("common.actions.refresh")} {t("ai.title")}</span>
            )}
          </button>
        )}
      </div>

      {/* Non-Diagnostic Disclaimer */}
      <div className="p-3.5 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 rounded-xl flex items-start gap-2.5">
        <span className="text-base shrink-0">🛡️</span>
        <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
          {insights?.clinical_disclaimer || t("ai.disclaimer")}
        </p>
      </div>

      {/* Loading Phased Progress Box */}
      {loading && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs text-center space-y-5 animate-in fade-in duration-200">
          <div className="relative flex justify-center">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 dark:bg-teal-950/80 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-600 dark:text-teal-300">
              <svg className="animate-spin h-7 w-7 text-teal" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
              {phaseLabels[currentPhase - 1]}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {i18n.language === "gu" ? `તબક્કો ${currentPhase} / 5 (${elapsedSeconds} સેકન્ડ)` : `Phase ${currentPhase} of 5 (${elapsedSeconds}s)`}
            </p>
          </div>

          {/* Stepper Dots */}
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5].map((p) => (
              <div
                key={p}
                className={`h-2 rounded-full transition-all duration-300 ${
                  p === currentPhase
                    ? "w-8 bg-teal"
                    : p < currentPhase
                    ? "w-2 bg-teal/60"
                    : "w-2 bg-slate-200 dark:bg-slate-700"
                }`}
              />
            ))}
          </div>

          {/* Timeout Warning */}
          {timedOut && (
            <div className="mt-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/60 max-w-md mx-auto text-center space-y-3">
              <p className="text-xs text-amber-900 dark:text-amber-200 font-semibold">
                ⚠️ {t("ai.status.timeout.message")}
              </p>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(10);
                    onGenerate();
                  }}
                  className="btn-tactile px-3 py-1.5 rounded-lg bg-teal text-white text-xs font-bold shadow-xs hover:bg-teal-dark cursor-pointer"
                >
                  🔄 {t("ai.status.timeout.retry")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Insights Content */}
      {!loading && !insights && (
        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 space-y-3">
          <span className="text-3xl block">💡</span>
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            {t("ai.status.ready")}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            {t("ai.subtitle")}
          </p>
          {isDoctor && (
            <button
              type="button"
              onClick={onGenerate}
              className="btn-tactile mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal text-white text-xs font-bold shadow-xs hover:bg-teal-dark transition cursor-pointer"
            >
              ⚡ Generate Health Insights
            </button>
          )}
        </div>
      )}

      {!loading && insights && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ========================================================================= */}
          {/* LEFT COLUMN (70%): Key Narrative Sections */}
          {/* ========================================================================= */}
          <div className="lg:col-span-8 space-y-4">
            {/* Card 1: PAST CLINICAL TRAJECTORY */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-2.5 transition hover:border-slate-300 dark:hover:border-slate-700">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold text-sm shrink-0">
                  📜
                </span>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {t("ai.sections.past")}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {t("ai.sections.pastDesc")}
                  </p>
                </div>
              </div>
              <div className="bg-slate-50/80 dark:bg-slate-850 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-normal">
                  {insights.past_clinical_trajectory || t("common.noData")}
                </p>
              </div>
            </div>

            {/* Card 2: CURRENT CLINICAL STATUS */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-2.5 transition hover:border-slate-300 dark:hover:border-slate-700">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-sm shrink-0">
                  🩺
                </span>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {t("ai.sections.present")}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {t("ai.sections.presentDesc")}
                  </p>
                </div>
              </div>
              <div className="bg-slate-50/80 dark:bg-slate-850 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-normal">
                  {insights.current_clinical_status || t("common.noData")}
                </p>
              </div>
            </div>

            {/* Card 3: TREND & PROGRESSION ANALYSIS */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-2.5 transition hover:border-slate-300 dark:hover:border-slate-700">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-sm shrink-0">
                  📈
                </span>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {t("ai.sections.trends")}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {t("ai.sections.trendsDesc")}
                  </p>
                </div>
              </div>
              <div className="bg-slate-50/80 dark:bg-slate-850 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-normal">
                  {insights.trend_progression_analysis || t("common.noData")}
                </p>
              </div>
            </div>

            {/* Card 4: FUTURE RISK STRATIFICATION */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-2.5 transition hover:border-slate-300 dark:hover:border-slate-700">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold text-sm shrink-0">
                  ⚠️
                </span>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {t("ai.sections.risks")}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {t("ai.sections.risksDesc")}
                  </p>
                </div>
              </div>
              <div className="bg-slate-50/80 dark:bg-slate-850 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-normal">
                  {insights.future_risk_stratification || t("common.noData")}
                </p>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* RIGHT COLUMN (30%): At-a-Glance, Symptoms to Monitor, Evidence */}
          {/* ========================================================================= */}
          <div className="lg:col-span-4 space-y-4">
            {/* Quick Summary / Status Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <span>🛡️</span>
                <span>{i18n.language === "gu" ? "ઝડપી સારાંશ (At-a-Glance)" : "At-a-Glance Summary"}</span>
              </h4>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                    {t("ai.technicalDetails.modelVersion")}
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 text-[11px]">
                    {insights.model_version || "readmission-30d v1.0"}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                    {t("ai.technicalDetails.dataset")}
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 text-[11px] truncate max-w-[140px]" title={insights.active_dataset}>
                    {insights.active_dataset || "UCI Diabetes 130-US"}
                  </span>
                </div>

                {riskAssessment?.riskScore !== undefined && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                      {t("ai.technicalDetails.riskScore")}
                    </span>
                    <span className="font-bold text-amber-700 dark:text-amber-400 text-[11px]">
                      {(Number(riskAssessment.riskScore) * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Symptoms to Watch (Structured Cards) */}
            {insights.symptoms_to_monitor && insights.symptoms_to_monitor.length > 0 && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-base">👀</span>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {t("ai.sections.symptoms")}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {t("ai.sections.symptomsDesc")}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  {insights.symptoms_to_monitor.map((symp, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 flex items-start gap-2.5 text-xs text-slate-800 dark:text-slate-200"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 mt-1.5" />
                      <span className="leading-relaxed">{symp}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Evidence & Provenance Chips */}
            {insights.evidence_provenance && insights.evidence_provenance.length > 0 && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-base">🔗</span>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {t("ai.sections.evidence")}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {t("ai.sections.evidenceDesc")}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  {insights.evidence_provenance.map((ev, idx) => (
                    <div
                      key={idx}
                      className="text-[11px] font-mono text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-850 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800"
                    >
                      {ev}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Collapsible Technical Details */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowTechnicalDetails(!showTechnicalDetails);
                  triggerHaptic(5);
                }}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1.5 cursor-pointer"
              >
                <span>{showTechnicalDetails ? "▼" : "▶"}</span>
                <span>{showTechnicalDetails ? t("ai.technicalDetails.hide") : t("ai.technicalDetails.show")}</span>
              </button>

              {showTechnicalDetails && (
                <div className="mt-2.5 p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-700/80 text-xs space-y-2 animate-in fade-in duration-100">
                  <div className="space-y-2">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">
                        {t("ai.technicalDetails.provider")}
                      </span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200 break-words">
                        {insights.model_provider || "deterministic"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Research Benchmark</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {insights.primary_research_dataset || "MIMIC-IV v3.1"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

