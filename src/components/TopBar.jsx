import React from "react";

export default function TopBar({ title, subtitle }) {
  return (
    <div className="px-5 pt-7 pb-4">
      <div className="flex items-center gap-2 mb-0.5">
        <span className="text-xl">🐷</span>
        <span className="font-display font-semibold text-base" style={{ color: "var(--ink)" }}>
          Cofrinho
        </span>
      </div>
      <h1 className="font-display text-[26px] leading-tight font-medium mt-2" style={{ color: "var(--ink)" }}>
        {title}
      </h1>
      {subtitle && (
        <p className="text-sm mt-1" style={{ color: "var(--ink-soft)" }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

