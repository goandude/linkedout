export function Logo({ size = 34, showWordmark = true }: { size?: number; showWordmark?: boolean }) {
  return (
    <div className="inline-flex items-center gap-2.5 select-none">
      <svg
        width={size}
        height={size}
        viewBox="0 0 512 512"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-[0_0_12px_rgba(52,211,153,0.28)]"
      >
        <defs>
          <linearGradient id="loBg" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#050811" />
          </linearGradient>
          <linearGradient id="loAccent" x1="96" y1="96" x2="416" y2="416" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="50%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>
        <rect width="512" height="512" rx="112" fill="url(#loBg)" />
        <rect x="12" y="12" width="488" height="488" rx="102" stroke="url(#loAccent)" strokeOpacity="0.35" strokeWidth="8" />
        <path
          d="M236 128H156C138.327 128 124 142.327 124 160V356C124 373.673 138.327 388 156 388H352C369.673 388 384 373.673 384 356V276"
          stroke="url(#loAccent)"
          strokeWidth="30"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M196 204V316H276"
          stroke="#f1f5f9"
          strokeWidth="30"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M268 244L388 124M388 124H304M388 124V208"
          stroke="url(#loAccent)"
          strokeWidth="30"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="196" cy="204" r="20" fill="#34d399" />
      </svg>

      {showWordmark && (
        <span className="text-lg font-bold tracking-tight text-slate-900">
          Linked
          <span className="bg-gradient-to-r from-emerald-600 via-cyan-600 to-indigo-600 bg-clip-text text-transparent">
            Out
          </span>
        </span>
      )}
    </div>
  );
}
