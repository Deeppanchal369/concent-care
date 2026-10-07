import { useEffect, useRef, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { triggerHaptic } from "../../utils/haptics";

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HowItWorksModal({ isOpen, onClose }: HowItWorksModalProps) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const modalContainerRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [videoError, setVideoError] = useState(false);

  // Stop video playback and reset time safely
  const stopPlayback = useCallback(() => {
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      } catch {
        // Ignore abort/pause interruption
      }
    }
  }, []);

  const handleClose = useCallback(() => {
    triggerHaptic(10);
    stopPlayback();
    onClose();
  }, [stopPlayback, onClose]);

  // Handle escape key & stop playback when modal closes
  useEffect(() => {
    if (!isOpen) {
      stopPlayback();
      return;
    }

    // Reset error state on fresh open
    setVideoError(false);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    // Focus close button on open
    setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      stopPlayback();
    };
  }, [isOpen, handleClose, stopPlayback]);

  const handleVideoError = () => {
    setVideoError(true);
  };

  const handleRetryVideo = () => {
    setVideoError(false);
    if (videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(() => {
        // Browser autoplay restrictions may require explicit user interaction
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 md:p-6 transition-opacity duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="how-it-works-modal-title"
    >
      <div
        ref={modalContainerRef}
        className="relative bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-4xl text-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-600/20 text-teal-400 border border-teal-500/30 flex items-center justify-center font-bold text-sm">
              ▶
            </div>
            <div>
              <h2
                id="how-it-works-modal-title"
                className="text-base sm:text-lg font-bold text-white tracking-tight"
              >
                {t("howItWorksModal.title", "How ArogyaMitra Works")}
              </h2>
              <p className="text-xs text-slate-400">
                {t("howItWorksModal.subtitle", "1-minute guide to patient-governed healthcare and care team coordination")}
              </p>
            </div>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={handleClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent hover:border-slate-700 transition focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:outline-none"
            aria-label={t("howItWorksModal.close", "Close video modal")}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 16:9 Responsive Video Viewport */}
        <div className="relative aspect-video w-full bg-slate-950 flex items-center justify-center overflow-hidden">
          {!videoError ? (
            <video
              ref={videoRef}
              controls
              playsInline
              preload="metadata"
              poster="/media/how-it-works-poster.svg"
              onError={handleVideoError}
              className="w-full h-full object-contain bg-slate-950"
            >
              <source src="/media/how-it-works.mp4" type="video/mp4" />
              {t("howItWorksModal.browserNotSupported", "Your browser does not support the video tag.")}
            </video>
          ) : (
            /* Graceful Fallback Container when video fails to load */
            <div className="p-6 text-center max-w-lg mx-auto space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center text-2xl shadow-inner">
                ⚠️
              </div>
              <div>
                <h3 className="text-base font-bold text-white mb-1">
                  {t("howItWorksModal.videoUnavailable", "How It Works video is currently unavailable.")}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {t(
                    "howItWorksModal.videoFallbackHint",
                    "You can follow the 4-step care flow below, or retry loading the video player."
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={handleRetryVideo}
                className="btn-tactile inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>{t("howItWorksModal.retry", "Try Again")}</span>
              </button>
            </div>
          )}
        </div>

        {/* 4-Step Visual Walkthrough Grid */}
        <div className="p-4 sm:p-5 bg-slate-900 border-t border-slate-800">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Step 1 */}
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-400 block mb-1">
                  {t("careCircle.step1", "Step 1")}
                </span>
                <h4 className="text-xs font-bold text-white mb-1">
                  {t("howItWorksModal.step1Title", "Patient Grants Consent")}
                </h4>
                <p className="text-[11px] text-slate-300 leading-normal">
                  {t("howItWorksModal.step1Desc", "You decide which doctors can access your health record and for how long.")}
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-400 block mb-1">
                  {t("careCircle.step2", "Step 2")}
                </span>
                <h4 className="text-xs font-bold text-white mb-1">
                  {t("howItWorksModal.step2Title", "Doctor Requests Specific Records")}
                </h4>
                <p className="text-[11px] text-slate-300 leading-normal">
                  {t("howItWorksModal.step2Desc", "Attending physicians submit access requests for specific clinical categories.")}
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 block mb-1">
                  {t("careCircle.step3", "Step 3")}
                </span>
                <h4 className="text-xs font-bold text-white mb-1">
                  {t("howItWorksModal.step3Title", "Patient Approves or Revokes")}
                </h4>
                <p className="text-[11px] text-slate-300 leading-normal">
                  {t("howItWorksModal.step3Desc", "Approve access with one tap, or revoke instantly whenever you choose.")}
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 block mb-1">
                  {t("howItWorksModal.step4Badge", "Step 4")}
                </span>
                <h4 className="text-xs font-bold text-white mb-1">
                  {t("howItWorksModal.step4Title", "Care Circle Coordinates")}
                </h4>
                <p className="text-[11px] text-slate-300 leading-normal">
                  {t("howItWorksModal.step4Desc", "Doctors, nurses, and patients work with verified, up-to-date health records.")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
