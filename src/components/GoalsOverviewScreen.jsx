import React from "react";
import { CalendarDays, Target } from "lucide-react";
import TopBar from "./TopBar";
import { fromCents } from "../financial-engine/index.js";
import { brl } from "../lib/helpers";

export default function GoalsOverviewScreen({ financialData }) {
  return (
    <div className="pb-4">
      <TopBar title="Metas" subtitle="Acompanhe suas conquistas sem preencher formulários" />
      <div className="px-5 space-y-3">
        {financialData.goals.map((goal) => {
          const saved = goal.contributions.reduce((sum, item) => sum + item.amountCents, 0);
          const percent = goal.targetCents > 0 ? Math.min(100, saved / goal.targetCents * 100) : 0;
          return (
            <div key={goal.id} className="rounded-3xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
              <div className="flex items-start gap-3"><div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: "var(--primary-lt)" }}><Target size={21} color="var(--primary)" /></div><div className="flex-1"><p className="font-display text-xl font-semibold">{goal.name}</p>{goal.deadline && <p className="text-xs flex items-center gap-1 mt-1" style={{ color: "var(--ink-soft)" }}><CalendarDays size={13} /> {new Date(`${goal.deadline}T00:00:00`).toLocaleDateString("pt-BR")}</p>}</div></div>
              <div className="h-2 rounded-full mt-5 overflow-hidden" style={{ background: "var(--primary-lt)" }}><div className="h-full rounded-full" style={{ width: `${percent}%`, background: "var(--primary)" }} /></div>
              <div className="flex justify-between mt-3"><div><p className="text-[10px] uppercase font-semibold" style={{ color: "var(--ink-soft)" }}>Guardado</p><p className="font-display font-semibold">{brl(fromCents(saved))}</p></div><div className="text-right"><p className="text-[10px] uppercase font-semibold" style={{ color: "var(--ink-soft)" }}>Objetivo</p><p className="font-display font-semibold">{brl(fromCents(goal.targetCents))}</p></div></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
