import React from "react";
import { Bot, CheckCircle2, Clock3, ShieldCheck } from "lucide-react";
import TopBar from "./TopBar";

export default function ActivitiesScreen({ financialData }) {
  const activities = financialData.activities ?? [];
  return (
    <div className="pb-4">
      <TopBar title="Atividades" subtitle="Nada que o Atlas fizer ficará escondido" />
      <div className="px-5 space-y-3">
        {activities.length === 0 ? (
          <div className="rounded-3xl p-6 text-center" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
            <Bot size={30} color="var(--primary)" className="mx-auto" />
            <p className="font-display text-lg font-semibold mt-3">Nenhuma atividade ainda</p>
            <p className="text-xs mt-1" style={{ color: "var(--ink-soft)" }}>As ações confirmadas no Atlas Pocket aparecerão aqui.</p>
          </div>
        ) : activities.map((activity) => {
          const pending = activity.status === "needs_review";
          return (
            <div key={activity.id} className="rounded-3xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: pending ? "var(--accent-lt)" : "var(--primary-lt)" }}>
                  {pending ? <Clock3 size={20} color="var(--accent)" /> : <CheckCircle2 size={20} color="var(--primary)" />}
                </div>
                <div className="flex-1"><p className="font-semibold text-sm">{activity.title}</p><p className="text-xs mt-1" style={{ color: "var(--ink-soft)" }}>{activity.description}</p><p className="text-[10px] mt-2" style={{ color: "var(--ink-soft)" }}>{new Date(activity.date).toLocaleString("pt-BR")}</p></div>
              </div>
            </div>
          );
        })}
        <div className="rounded-3xl p-4 flex gap-3" style={{ background: "var(--primary-lt)" }}><ShieldCheck size={20} color="var(--primary)" /><p className="text-xs" style={{ color: "var(--ink-soft)" }}>Futuramente você poderá abrir cada ação, ver o antes e depois, corrigir ou desfazer quando for seguro.</p></div>
      </div>
    </div>
  );
}
