import React, { useMemo } from "react";
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, CheckCircle2, Clock3, Repeat2, Scale } from "lucide-react";
import TopBar from "./TopBar";
import {
  calculateAccountBalances,
  fromCents,
  getAccountTransactions,
  transactionImpactForAccount,
} from "../financial-engine/index.js";
import { brl } from "../lib/helpers";

const STATUS_LABELS = {
  detected: "Detectado",
  awaiting_confirmation: "Aguardando confirmação",
  confirmed: "Confirmado",
  corrected: "Corrigido",
  ignored: "Ignorado",
  reversed: "Desfeito",
  cleared: "Confirmado",
  pending: "Pendente",
  scheduled: "Agendado",
  cancelled: "Cancelado",
};

const RECONCILIATION_LABELS = {
  unreconciled: "Ainda não conferido",
  reconciled: "Saldo conferido",
  difference_found: "Diferença encontrada",
  needs_review: "Aguardando conferência",
};

function TransactionIcon({ type }) {
  if (type === "income") return <ArrowDownLeft size={18} color="var(--primary)" />;
  if (type === "expense") return <ArrowUpRight size={18} color="var(--accent)" />;
  return <Repeat2 size={18} color="var(--ink-soft)" />;
}

export default function AccountDetailScreen({ accountId, financialData, onBack }) {
  const account = financialData.accounts.find((item) => item.id === accountId);
  const balances = useMemo(
    () => calculateAccountBalances(financialData.accounts, financialData.transactions),
    [financialData]
  );
  const transactions = useMemo(
    () => getAccountTransactions(accountId, financialData.transactions),
    [accountId, financialData.transactions]
  );

  if (!account) return null;
  const difference = account.reconciliationDifferenceCents;
  const hasStatementBalance = Number.isSafeInteger(account.statementBalanceCents);
  const reconciliationOk = account.reconciliationStatus === "reconciled";

  return (
    <div className="pb-4">
      <TopBar title={account.name} subtitle="Histórico e conferência da conta" onBack={onBack} />
      <div className="px-5 space-y-4">
        <section className="rounded-3xl p-5" style={{ background: "var(--primary)", color: "#fff" }} aria-label="Saldo calculado">
          <p className="text-xs font-semibold opacity-80">Saldo calculado pelo Cofrinho</p>
          <p className="font-display text-3xl font-semibold mt-2">{brl(fromCents(balances[account.id]))}</p>
          {account.reserved ? <p className="text-xs mt-2 opacity-80">Este valor está reservado e não compõe o dinheiro livre.</p> : null}
        </section>

        <section className="rounded-3xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--line)" }} aria-label="Conciliação da conta">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: reconciliationOk ? "var(--primary-lt)" : "var(--accent-lt)" }}>
              {reconciliationOk ? <CheckCircle2 size={20} color="var(--primary)" /> : <Scale size={20} color="var(--accent)" />}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">Conciliação</p>
              <p className="text-xs" style={{ color: "var(--ink-soft)" }}>{RECONCILIATION_LABELS[account.reconciliationStatus] ?? "Situação não informada"}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div><p className="text-[10px] uppercase font-semibold" style={{ color: "var(--ink-soft)" }}>Saldo informado</p><p className="font-display font-semibold mt-1">{hasStatementBalance ? brl(fromCents(account.statementBalanceCents)) : "Não informado"}</p></div>
            <div className="text-right"><p className="text-[10px] uppercase font-semibold" style={{ color: "var(--ink-soft)" }}>Diferença</p><p className="font-display font-semibold mt-1" style={{ color: difference ? "var(--accent)" : "var(--ink)" }}>{Number.isSafeInteger(difference) ? brl(fromCents(difference)) : "—"}</p></div>
          </div>
          {account.lastReconciledAt ? <p className="text-[10px] mt-3" style={{ color: "var(--ink-soft)" }}>Última conferência: {new Date(account.lastReconciledAt).toLocaleString("pt-BR")}</p> : null}
          {difference ? <div className="flex gap-2 mt-3 rounded-2xl p-3" style={{ background: "var(--accent-lt)" }}><AlertTriangle size={17} color="var(--accent)" /><p className="text-xs" style={{ color: "var(--ink-soft)" }}>A diferença ficará visível até ser explicada e confirmada.</p></div> : null}
        </section>

        <section aria-labelledby="account-history-title">
          <div className="flex items-end justify-between mb-3">
            <div><h2 id="account-history-title" className="font-display text-xl font-semibold">Movimentações</h2><p className="text-xs" style={{ color: "var(--ink-soft)" }}>Mais recentes primeiro</p></div>
            <span className="text-xs font-semibold" style={{ color: "var(--ink-soft)" }}>{transactions.length}</span>
          </div>
          {transactions.length === 0 ? (
            <div className="rounded-3xl p-6 text-center" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
              <Clock3 size={27} color="var(--primary)" className="mx-auto" />
              <p className="font-semibold text-sm mt-3">Nenhuma movimentação registrada</p>
              <p className="text-xs mt-1" style={{ color: "var(--ink-soft)" }}>Quando o Atlas incluir dados confirmados, eles aparecerão aqui.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((transaction) => {
                const impact = transactionImpactForAccount(transaction, account.id);
                return (
                  <article key={transaction.id} className="rounded-2xl p-3 flex gap-3" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--primary-lt)" }}><TransactionIcon type={transaction.type} /></div>
                    <div className="flex-1 min-w-0"><p className="font-semibold text-sm truncate">{transaction.description}</p><p className="text-[10px] mt-1" style={{ color: "var(--ink-soft)" }}>{new Date(transaction.date).toLocaleDateString("pt-BR")} · {STATUS_LABELS[transaction.status] ?? transaction.status}</p></div>
                    <p className="font-semibold text-sm whitespace-nowrap" style={{ color: impact > 0 ? "var(--primary)" : impact < 0 ? "var(--accent)" : "var(--ink-soft)" }}>{impact > 0 ? "+" : ""}{brl(fromCents(impact))}</p>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
