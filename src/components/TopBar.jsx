import React from "react";
import { ArrowLeft } from "lucide-react";

export default function TopBar({ title, subtitle, onBack }) {
  return (
    <div className="px-5 pt-7 pb-4">
      <div className="flex items-center gap-2 mb-0.5">
        {onBack ? (
          <button type="button" onClick={onBack} aria-label="Voltar" className="w-9 h-9 -ml-2 rounded-full flex items-center justify-center" style={{ color: "var(--ink)" }}>
            <ArrowLeft size={21} />
          </button>
        ) : null}
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
