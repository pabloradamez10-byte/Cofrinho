import React, { useMemo } from "react";
import { CalendarDays, CheckCircle2, Target, TrendingUp } from "lucide-react";
import TopBar from "./TopBar";
import { analyzeGoal, calculateMonthlyPlanningCapacity, fromCents } from "../financial-engine/index.js";
import { brl } from "../lib/helpers";

const dateLabel = (value) => value ? new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR") : null;

export default function GoalsOverviewScreen({ financialData }) {
  const today = new Date().toISOString().slice(0, 10);
  const capacityCents = useMemo(() => calculateMonthlyPlanningCapacity(financialData, today), [financialData, today]);
  return (
    <div className="pb-4">
      <TopBar title="Metas" subtitle="O motor calcula o caminho; o Atlas mantém os dados atualizados" />
      <div className="px-5 space-y-3">
        {financialData.goals.length === 0 ? <div className="rounded-3xl p-6 text-center" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}><Target className="mx-auto" color="var(--primary)" /><p className="font-semibold mt-3">Nenhuma meta informada</p><p className="text-xs mt-1" style={{ color: "var(--ink-soft)" }}>Quando você definir uma meta com o Atlas, ela aparecerá aqui com prazo e aporte sugerido.</p></div> : null}
        {financialData.goals.map((goal) => {
          const analysis = analyzeGoal(goal, today, capacityCents);
          return (
            <article key={goal.id} className="rounded-3xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
              <div className="flex items-start gap-3"><div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: "var(--primary-lt)" }}><Target size={21} color="var(--primary)" /></div><div className="flex-1"><p className="font-display text-xl font-semibold">{goal.name}</p>{goal.deadline && <p className="text-xs flex items-center gap-1 mt-1" style={{ color: "var(--ink-soft)" }}><CalendarDays size={13} /> Meta: {dateLabel(goal.deadline)}</p>}</div></div>
              <div className="h-2 rounded-full mt-5 overflow-hidden" style={{ background: "var(--primary-lt)" }}><div className="h-full rounded-full" style={{ width: `${analysis.percent}%`, background: "var(--primary)" }} /></div>
              <div className="flex justify-between mt-3"><div><p className="text-[10px] uppercase font-semibold" style={{ color: "var(--ink-soft)" }}>Guardado</p><p className="font-display font-semibold">{brl(fromCents(analysis.savedCents))}</p></div><div className="text-right"><p className="text-[10px] uppercase font-semibold" style={{ color: "var(--ink-soft)" }}>Falta</p><p className="font-display font-semibold">{brl(fromCents(analysis.remainingCents))}</p></div></div>
              {analysis.remainingCents === 0 ? <div className="rounded-2xl p-3 flex gap-2 mt-4" style={{ background: "var(--primary-lt)" }}><CheckCircle2 size={18} color="var(--primary)" /><p className="text-xs font-semibold">Meta alcançada.</p></div> : <div className="rounded-2xl p-3 mt-4" style={{ background: "var(--bg)" }}><div className="flex items-center gap-2"><TrendingUp size={17} color="var(--primary)" /><p className="text-xs font-semibold">Plano calculado</p></div><div className="grid grid-cols-2 gap-3 mt-3"><div><p className="text-[10px] uppercase" style={{ color: "var(--ink-soft)" }}>Aporte necessário</p><p className="text-sm font-semibold">{analysis.requiredMonthlyCents == null ? "Prazo não informado" : `${brl(fromCents(analysis.requiredMonthlyCents))}/mês`}</p></div><div><p className="text-[10px] uppercase" style={{ color: "var(--ink-soft)" }}>Previsão atual</p><p className="text-sm font-semibold">{analysis.estimatedCompletionDate ? dateLabel(analysis.estimatedCompletionDate) : "Aguardando renda livre"}</p></div></div>{analysis.requiredMonthlyCents != null && !analysis.onTrack ? <p className="text-[11px] mt-3" style={{ color: "var(--accent)" }}>A capacidade prevista ainda não cobre o aporte necessário. O Atlas poderá ajudar a ajustar prazo ou valor.</p> : null}</div>}
            </article>
          );
        })}
      </div>
    </div>
  );
}
