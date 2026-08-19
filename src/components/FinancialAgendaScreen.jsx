import React, { useMemo, useState } from "react";
import { CalendarCheck, CheckCircle2 } from "lucide-react";
import TopBar from "./TopBar";
import { fromCents, generateFinancialAlerts } from "../financial-engine/index.js";
import { brl } from "../lib/helpers";

export default function FinancialAgendaScreen({ financialData, onBack, onSettle }) {
  const alerts = useMemo(() => generateFinancialAlerts(financialData, new Date().toISOString().slice(0, 10), { overdueDays: 7, lookAheadDays: 60 }), [financialData]);
  const accounts = financialData.accounts.filter((item) => item.active !== false && item.type !== "credit_card");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [error, setError] = useState("");
  function settle(alert) { setError(""); const result = onSettle(alert, accountId); if (!result.ok) setError(result.error); }
  return <div className="pb-4"><TopBar title="Agenda financeira" subtitle="Contas, recebimentos, dívidas e faturas" onBack={onBack} /><div className="px-5 space-y-3">
    <label className="block text-xs font-semibold">Conta usada nas baixas<select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="w-full rounded-xl border px-3 py-3 mt-1">{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
    {error && <p className="rounded-2xl p-3 text-xs" style={{ background: "#FDECEC", color: "var(--accent)" }}>{error}</p>}
    {alerts.length === 0 ? <div className="rounded-3xl p-6 text-center" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}><CalendarCheck size={30} className="mx-auto" color="var(--primary)" /><p className="font-semibold mt-2">Agenda em dia</p><p className="text-xs mt-1" style={{ color: "var(--ink-soft)" }}>Cadastre recorrências, dívidas ou cartões.</p></div> : alerts.map((alert) => <article key={alert.id} className="rounded-3xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}><div className="flex gap-3"><div className="flex-1"><p className="font-semibold text-sm">{alert.title}</p><p className="text-xs mt-1" style={{ color: alert.daysUntil <= 0 ? "var(--accent)" : "var(--ink-soft)" }}>{new Date(`${alert.date}T12:00:00`).toLocaleDateString("pt-BR")} · {alert.daysUntil < 0 ? "possivelmente vencido" : alert.daysUntil === 0 ? "hoje" : `em ${alert.daysUntil} dia(s)`}</p></div><p className="font-semibold" style={{ color: alert.type === "income" ? "var(--primary)" : "var(--accent)" }}>{alert.type === "income" ? "+" : "−"}{brl(fromCents(alert.amountCents))}</p></div><button onClick={() => settle(alert)} disabled={!accountId} className="w-full rounded-xl p-2.5 mt-3 flex justify-center items-center gap-2 text-xs font-semibold" style={{ background: "var(--primary-lt)", color: "var(--primary)" }}><CheckCircle2 size={16} />{alert.type === "income" ? "Marcar como recebido" : "Marcar como pago"}</button></article>)}
  </div></div>;
}
