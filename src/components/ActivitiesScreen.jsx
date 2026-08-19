import React from "react";
import { Bot, CheckCircle2, Clock3, ShieldCheck } from "lucide-react";
import TopBar from "./TopBar";
import { fromCents, getTransactionsAwaitingConfirmation } from "../financial-engine/index.js";
import { brl } from "../lib/helpers";

export default function ActivitiesScreen({ financialData, onUndo }) {
  const activities = financialData.activities ?? [];
  const awaiting = getTransactionsAwaitingConfirmation(financialData.transactions);
  return (
    <div className="pb-4">
      <TopBar title="Atividades" subtitle="Nada que o Atlas fizer ficará escondido" />
      <div className="px-5 space-y-3">
        {awaiting.length > 0 ? (
          <section className="space-y-2" aria-labelledby="awaiting-title">
            <div><h2 id="awaiting-title" className="font-display text-xl font-semibold">Aguardando você</h2><p className="text-xs" style={{ color: "var(--ink-soft)" }}>Ainda não alteram seus saldos</p></div>
            {awaiting.map((transaction) => <article key={transaction.id} className="rounded-3xl p-4 flex gap-3" style={{ background: "var(--accent-lt)" }}><Clock3 size={20} color="var(--accent)" /><div className="flex-1"><p className="font-semibold text-sm">{transaction.description}</p><p className="text-xs mt-1" style={{ color: "var(--ink-soft)" }}>{brl(fromCents(transaction.amountCents))} · aguardando confirmação no Atlas</p></div></article>)}
          </section>
        ) : null}
        <div className="pt-1"><h2 className="font-display text-xl font-semibold">Histórico auditável</h2><p className="text-xs" style={{ color: "var(--ink-soft)" }}>Alterações realizadas no Cofrinho</p></div>
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
        {financialData.transactions.filter((item) => ["confirmed", "corrected", "cleared"].includes(item.status) && !item.reversesTransactionId).slice().reverse().slice(0, 10).map((transaction) => <article key={`undo-${transaction.id}`} className="rounded-3xl p-4 flex gap-3" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}><div className="flex-1"><p className="font-semibold text-sm">{transaction.description}</p><p className="text-xs mt-1" style={{ color: "var(--ink-soft)" }}>{brl(fromCents(transaction.amountCents))}</p></div><button onClick={() => onUndo?.(transaction.id)} className="rounded-xl px-3 text-xs font-semibold" style={{ background: "var(--accent-lt)", color: "var(--accent)" }}>Desfazer</button></article>)}
        <div className="rounded-3xl p-4 flex gap-3" style={{ background: "var(--primary-lt)" }}><ShieldCheck size={20} color="var(--primary)" /><p className="text-xs" style={{ color: "var(--ink-soft)" }}>As movimentações podem ser desfeitas sem apagar o registro original.</p></div>
      </div>
    </div>
  );
}
