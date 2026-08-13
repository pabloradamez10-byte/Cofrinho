import React, { useMemo } from "react";
import { Banknote, ChevronRight, Landmark, PiggyBank, Smartphone, WalletCards } from "lucide-react";
import TopBar from "./TopBar";
import { calculateAccountBalances, fromCents } from "../financial-engine/index.js";
import { brl } from "../lib/helpers";

const ICONS = { checking: Landmark, cash: Banknote, digital_wallet: Smartphone, savings: PiggyBank, credit_card: WalletCards };

export default function AccountsScreen({ financialData }) {
  const balances = useMemo(
    () => calculateAccountBalances(financialData.accounts, financialData.transactions),
    [financialData]
  );

  return (
    <div className="pb-4">
      <TopBar title="Contas" subtitle="Saldos consolidados pelo Cofrinho" />
      <div className="px-5 space-y-3">
        {financialData.accounts.filter((account) => account.active !== false).map((account) => {
          const Icon = ICONS[account.type] ?? Landmark;
          return (
            <div key={account.id} className="rounded-3xl p-4 flex items-center gap-3" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: "var(--primary-lt)" }}><Icon size={21} color="var(--primary)" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2"><p className="font-semibold text-sm truncate">{account.name}</p>{account.reserved && <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full" style={{ background: "var(--gold-lt)", color: "var(--ink)" }}>Reservado</span>}</div>
                <p className="font-display text-lg font-semibold mt-0.5">{brl(fromCents(balances[account.id]))}</p>
                {account.reconciliationStatus === "needs_review" && <p className="text-[11px]" style={{ color: "var(--accent)" }}>Saldo aguardando conferência</p>}
              </div>
              <ChevronRight size={18} color="var(--ink-soft)" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
