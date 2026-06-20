import React, { useState } from "react";
import { ChevronDown, Circle } from "lucide-react";
import TopBar from "./TopBar";
import { ACADEMY } from "../lib/constants";

export default function AcademiaScreen() {
  const [openId, setOpenId] = useState(null);

  return (
    <div className="pb-4">
      <TopBar title="🎓 Academia Financeira" subtitle="Aprenda no seu ritmo, um tema por vez." />
      <div className="px-5 space-y-2.5">
        {ACADEMY.map((cat) => {
          const isOpen = openId === cat.id;
          return (
            <div
              key={cat.id}
              className="rounded-3xl overflow-hidden"
              style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
            >
              <button onClick={() => setOpenId(isOpen ? null : cat.id)} className="w-full flex items-center gap-3 p-4">
                <span className="text-2xl">{cat.emoji}</span>
                <span className="flex-1 text-left font-display text-base font-medium" style={{ color: "var(--ink)" }}>
                  {cat.title}
                </span>
                <ChevronDown
                  size={18}
                  color="var(--ink-soft)"
                  style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }}
                />
              </button>
              {isOpen && (
                <div className="px-4 pb-4 space-y-3">
                  {cat.tips.map((t, i) => (
                    <div key={i} className="flex gap-2.5">
                      <Circle size={6} fill="var(--primary)" color="var(--primary)" className="mt-1.5 flex-shrink-0" />
                      <p className="text-sm leading-relaxed" style={{ color: "var(--ink-soft)" }}>
                        {t}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

