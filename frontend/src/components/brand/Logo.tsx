export type LogoVariant = "icon" | "wordmark" | "full" | "appIcon" | "loadingMark";

interface LogoProps {
  variant?: LogoVariant;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  dark?: boolean;
  showBadge?: boolean;
}

/**
 * ConsentCare Brand Identity
 * 
 * Communicates: Privacy (protective shield contour) + Care (central heart nexus) + Connected Health (care circle nodes).
 * Avoids: generic red crosses, AI robots, neon gradients, and stock hospital iconography.
 */
export function LogoIcon({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Outer Soft Shield Background */}
      <rect width="40" height="40" rx="10" fill="#0F766E" />
      
      {/* Protective Care Shield Arc */}
      <path
        d="M20 7C14.2 7 11 9.8 11 14.5C11 22.2 17.5 28 20 31C22.5 28 29 22.2 29 14.5C29 9.8 25.8 7 20 7Z"
        stroke="#FFFFFF"
        strokeWidth="2.2"
        strokeLinejoin="round"
        fill="#0D9488"
      />
      
      {/* Central Patient Sovereign Node */}
      <circle cx="20" cy="15" r="3.2" fill="#FFFFFF" />
      
      {/* Connected Care Team Nodes: Doctor (right) & Nurse (left) */}
      <circle cx="15.2" cy="22.5" r="2" fill="#CCFBF1" />
      <circle cx="24.8" cy="22.5" r="2" fill="#CCFBF1" />
      
      {/* Coordinated Data Pathways */}
      <path
        d="M16.8 21.2L18.6 17.5M23.2 21.2L21.4 17.5"
        stroke="#CCFBF1"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LogoAppIcon({ size = 48, className = "" }: { size?: number; className?: string }) {
  return (
    <div
      style={{ width: size, height: size }}
      className={`relative rounded-2xl bg-gradient-to-b from-teal-700 to-teal-850 p-2 shadow-md border border-teal-600/30 flex items-center justify-center ${className}`}
      aria-label="ConsentCare App Icon"
    >
      <LogoIcon size={Math.round(size * 0.72)} />
    </div>
  );
}

export function LoadingMark({ size = 44, message = "Loading securely..." }: { size?: number; message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-4" role="status" aria-live="polite">
      <div className="relative flex items-center justify-center">
        {/* Subtle breathing ripple ring - calm healthcare pulse */}
        <div
          style={{ width: size + 16, height: size + 16 }}
          className="absolute rounded-2xl bg-teal-100/60 animate-ping opacity-35"
        />
        <div
          style={{ width: size, height: size }}
          className="relative rounded-xl bg-teal-700 flex items-center justify-center shadow-sm"
        >
          <LogoIcon size={Math.round(size * 0.75)} />
        </div>
      </div>
      {message && (
        <span className="text-xs font-medium text-slate-500 tracking-normal">
          {message}
        </span>
      )}
      <span className="sr-only">Loading ConsentCare healthcare session</span>
    </div>
  );
}

export function Wordmark({
  size = "md",
  dark = false,
  showBadge = true,
}: {
  size?: "sm" | "md" | "lg" | "xl";
  dark?: boolean;
  showBadge?: boolean;
}) {
  const textSizes = {
    sm: "text-base",
    md: "text-xl",
    lg: "text-2xl",
    xl: "text-3xl",
  };

  const badgeSizes = {
    sm: "text-[9px] px-1 py-0.2",
    md: "text-[10px] px-1.5 py-0.5",
    lg: "text-xs px-2 py-0.5",
    xl: "text-xs px-2 py-0.5",
  };

  return (
    <div className="inline-flex items-center gap-1.5 tracking-tight font-sans">
      <span className={`font-extrabold ${textSizes[size]} ${dark ? "text-white" : "text-slate-900"}`}>
        Consent<span className="text-teal-600">Care</span>
      </span>
      {showBadge && (
        <span
          className={`font-bold tracking-wider rounded-md uppercase border ${badgeSizes[size]} ${
            dark
              ? "bg-teal-950/80 text-teal-300 border-teal-800"
              : "bg-teal-50 text-teal-700 border-teal-200"
          }`}
        >
          EHR
        </span>
      )}
    </div>
  );
}

export default function Logo({
  variant = "full",
  size = "md",
  className = "",
  dark = false,
  showBadge = true,
}: LogoProps) {
  const pixelSizes = {
    sm: 28,
    md: 36,
    lg: 44,
    xl: 52,
  };

  const px = pixelSizes[size];

  if (variant === "icon") {
    return <LogoIcon size={px} className={className} />;
  }

  if (variant === "appIcon") {
    return <LogoAppIcon size={px * 1.25} className={className} />;
  }

  if (variant === "loadingMark") {
    return <LoadingMark size={px} />;
  }

  if (variant === "wordmark") {
    return <Wordmark size={size} dark={dark} showBadge={showBadge} />;
  }

  // Full lockup: icon + wordmark
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoIcon size={px} />
      <Wordmark size={size} dark={dark} showBadge={showBadge} />
    </div>
  );
}
