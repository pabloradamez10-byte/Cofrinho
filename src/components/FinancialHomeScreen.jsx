import React, { useMemo } from "react";
import { AlertCircle, CalendarClock, ChevronRight, Landmark, ShieldCheck, Wallet } from "lucide-react";
import TopBar from "./TopBar";
import { calculateFinancialPosition, fromCents, generateFinancialAlerts, summarizeFinancialAlerts } from "../financial-engine/index.js";
import { brl } from "../lib/helpers";

export default function FinancialHomeScreen({ financialData, onOpenAccounts, onOpenActivities }) {
  const position = useMemo(
    () => calculateFinancialPosition(financialData.accounts, financialData.transactions, "2999-12-31"),
    [financialData]
  );
  const pending = (financialData.activities ?? []).filter((activity) => activity.status === "needs_review");
  const alerts = useMemo(() => generateFinancialAlerts(financialData, new Date().toISOString().slice(0, 10)), [financialData]);
  const alertSummary = useMemo(() => summarizeFinancialAlerts(alerts), [alerts]);

  const dueText = (alert) => {
    if (!alert) return "Nenhum compromisso registrado";
    if (alert.daysUntil === 0) return `Hoje · ${brl(fromCents(alert.amountCents))}`;
    if (alert.daysUntil === 1) return `Amanhã · ${brl(fromCents(alert.amountCents))}`;
    return `${new Date(`${alert.date}T12:00:00`).toLocaleDateString("pt-BR")} · ${brl(fromCents(alert.amountCents))}`;
  };

  return (
    <div className="pb-4">
      <TopBar title="Sua situação agora" subtitle="Valores calculados pelo motor financeiro" />
      <div className="px-5 space-y-4">
        {pending.length > 0 && (
          <button onClick={onOpenActivities} className="w-full rounded-3xl p-4 text-left flex gap-3" style={{ background: "var(--accent-lt)" }}>
            <AlertCircle size={22} color="var(--accent)" className="flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-sm" style={{ color: "var(--ink)" }}>{pending.length} item precisa da sua atenção</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--ink-soft)" }}>Confira antes de considerar os dados conciliados.</p>
            </div>
            <ChevronRight size={18} color="var(--ink-soft)" />
          </button>
        )}

        <div className="rounded-3xl p-5" style={{ background: "var(--primary)", color: "#fff" }}>
          <div className="flex items-center gap-2 text-xs font-semibold opacity-80"><Wallet size={16} /> Saldo total</div>
          <p className="font-display text-3xl font-semibold mt-2">{brl(fromCents(position.totalBalanceCents))}</p>
          <button onClick={onOpenAccounts} className="mt-4 text-xs font-semibold flex items-center gap-1 opacity-90">
            Ver todas as contas <ChevronRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-3xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
            <p className="text-xs" style={{ color: "var(--ink-soft)" }}>Dinheiro livre</p>
            <p className="font-display text-xl font-semibold mt-1" style={{ color: "var(--primary-dk)" }}>{brl(fromCents(position.freeMoneyCents))}</p>
          </div>
          <div className="rounded-3xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
            <p className="text-xs" style={{ color: "var(--ink-soft)" }}>Comprometido</p>
            <p className="font-display text-xl font-semibold mt-1" style={{ color: "var(--ink)" }}>{brl(fromCents(position.committedCents))}</p>
          </div>
        </div>

        {position.reservedCents > 0 && (
          <div className="rounded-3xl p-4 flex gap-3" style={{ background: "var(--primary-lt)" }}>
            <ShieldCheck size={21} color="var(--primary)" />
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{brl(fromCents(position.reservedCents))} estão reservados</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--ink-soft)" }}>Esse valor compõe seu saldo, mas não seu dinheiro livre.</p>
            </div>
          </div>
        )}

        <div className="rounded-3xl p-4 space-y-4" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
          <div className="flex gap-3"><CalendarClock size={20} color="var(--primary)" /><div><p className="text-sm font-semibold">Próxima entrada</p><p className="text-xs" style={{ color: "var(--ink-soft)" }}>{alertSummary.nextIncome ? `${alertSummary.nextIncome.title} · ${dueText(alertSummary.nextIncome)}` : "Nenhuma entrada prevista"}</p></div></div>
          <div className="flex gap-3"><Landmark size={20} color={alertSummary.actionable > 0 ? "var(--accent)" : "var(--primary)"} /><div><p className="text-sm font-semibold">Próxima conta</p><p className="text-xs" style={{ color: alertSummary.actionable > 0 ? "var(--accent)" : "var(--ink-soft)" }}>{alertSummary.nextExpense ? `${alertSummary.nextExpense.title} · ${dueText(alertSummary.nextExpense)}` : "Nenhum compromisso registrado"}</p>{alertSummary.overdue > 0 && <p className="text-[11px] font-semibold mt-1" style={{ color: "var(--accent)" }}>{alertSummary.overdue} compromisso(s) possivelmente vencido(s)</p>}</div></div>
        </div>
      </div>
    </div>
  );
}
