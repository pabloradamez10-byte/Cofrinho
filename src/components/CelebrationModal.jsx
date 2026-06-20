import React from "react";
import { Sparkles } from "lucide-react";
import { MILESTONE_MSG } from "../lib/constants";

export default function CelebrationModal({ milestone, onClose }) {
  if (!milestone) return null;
  const msg = MILESTONE_MSG[milestone];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center px-6" style={{ background: "rgba(22,36,29,0.55)" }}>
      <div className="w-full max-w-sm rounded-3xl p-7 text-center" style={{ background: "var(--surface)" }}>
        <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: "var(--gold-lt)" }}>
          <Sparkles size={28} color="var(--gold)" />
        </div>
        <h3 className="font-display text-2xl font-semibold mb-2" style={{ color: "var(--ink)" }}>
          {msg.title}
        </h3>
        <p className="text-sm mb-6" style={{ color: "var(--ink-soft)" }}>
          {msg.text}
        </p>
        <button
          onClick={onClose}
          className="w-full rounded-2xl py-3 font-semibold text-sm"
          style={{ background: "var(--primary)", color: "#fff" }}
        >
          Continuar jornada
        </button>
      </div>
    </div>
  );
}

