import React from "react";
import { Wallet, Check, Flame, Target, PiggyBank } from "lucide-react";
import TopBar from "./TopBar";
import { brl } from "../lib/helpers";

export default function DashboardScreen({ data, streak }) {
  const total = data.savings.reduce((s, e) => s + e.value, 0);
  const percent = data.goal.target > 0 ? Math.min(100, (total / data.goal.target) * 100) : 0;

  const stats = [
    { label: "Total economizado", value: brl(total), icon: Wallet },
    { label: "Missões concluídas", value: data.completedDates.length, icon: Check },
    { label: "Sequência atual", value: `${streak} dias`, icon: Flame },
    { label: "Progresso da meta", value: `${Math.round(percent)}%`, icon: Target },
    { label: "Economias registradas", value: data.savings.length, icon: PiggyBank },
  ];

  return (
    <div className="pb-4">
      <TopBar title="📊 Dashboard" subtitle="Sua evolução em números." />
      <div className="px-5 grid grid-cols-2 gap-3">
        {stats.map((s, i) => (
          <div
            key={i}
            className={`rounded-3xl p-4 ${i === stats.length - 1 ? "col-span-2" : ""}`}
            style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
          >
            <s.icon size={18} color="var(--primary)" />
            <p className="font-display text-xl font-semibold mt-2" style={{ color: "var(--ink)" }}>
              {s.value}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--ink-soft)" }}>
              {s.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
