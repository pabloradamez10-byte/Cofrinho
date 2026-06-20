import React from "react";

export default function JarProgress({ percent, size = 132 }) {
  const p = Math.max(0, Math.min(100, percent));
  const fillHeight = (p / 100) * 78;
  const fillY = 96 - fillHeight;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" width={size} height={size}>
        <defs>
          <linearGradient id="jarFill" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#0B5C3F" />
            <stop offset="100%" stopColor="#1FAE78" />
          </linearGradient>
          <clipPath id="jarClip">
            <path d="M30 22 h60 a6 6 0 0 1 6 6 v62 a10 10 0 0 1 -10 10 H34 a10 10 0 0 1 -10 -10 V28 a6 6 0 0 1 6 -6 Z" />
          </clipPath>
        </defs>

        {/* jar lid */}
        <rect x="46" y="8" width="28" height="12" rx="3" fill="#D8CFB8" />

        {/* jar body outline */}
        <path
          d="M30 22 h60 a6 6 0 0 1 6 6 v62 a10 10 0 0 1 -10 10 H34 a10 10 0 0 1 -10 -10 V28 a6 6 0 0 1 6 -6 Z"
          fill="#FFFFFF"
          stroke="#E8E2D4"
          strokeWidth="2"
        />

        {/* liquid fill */}
        <g clipPath="url(#jarClip)">
          <rect x="20" y={fillY} width="80" height="80" fill="url(#jarFill)">
            <animate attributeName="y" values={`96;${fillY}`} dur="0.8s" fill="freeze" />
          </rect>
          <circle cx="46" cy={fillY + 6} r="3.2" fill="#F4C95D" opacity="0.9" />
          <circle cx="68" cy={fillY + 14} r="2.4" fill="#F4C95D" opacity="0.8" />
        </g>

        {/* outline on top of fill */}
        <path
          d="M30 22 h60 a6 6 0 0 1 6 6 v62 a10 10 0 0 1 -10 10 H34 a10 10 0 0 1 -10 -10 V28 a6 6 0 0 1 6 -6 Z"
          fill="none"
          stroke="#16241D"
          strokeOpacity="0.08"
          strokeWidth="2"
        />
      </svg>

      <div className="absolute inset-0 flex items-center justify-center pt-2">
        <span className="font-display font-semibold text-[#16241D]" style={{ fontSize: size * 0.16 }}>
          {Math.round(p)}%
        </span>
      </div>
    </div>
  );
}

