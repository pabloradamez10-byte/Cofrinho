import React from "react";
import { Home, PiggyBank, Calculator, GraduationCap, TrendingUp } from "lucide-react";

const TABS = [
  { id: "home", label: "Início", icon: Home },
  { id: "cofrinho", label: "Cofrinho", icon: PiggyBank },
  { id: "simulador", label: "Simulador", icon: Calculator },
  { id: "academia", label: "Academia", icon: GraduationCap },
  { id: "dashboard", label: "Painel", icon: TrendingUp },
];

export default function BottomNav({ tab, setTab }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-20" style={{ background: "var(--surface)", borderTop: "1px solid var(--line)" }}>
      <div className="max-w-md mx-auto grid grid-cols-5">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} className="flex flex-col items-center gap-1 py-2.5">
              <t.icon size={20} color={active ? "var(--primary)" : "var(--ink-soft)"} strokeWidth={active ? 2.4 : 2} />
              <span className="text-[10px] font-semibold" style={{ color: active ? "var(--primary)" : "var(--ink-soft)" }}>
                {t.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

