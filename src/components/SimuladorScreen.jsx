import React, { useMemo, useState } from "react";
import { ArrowUpCircle, Calculator, ShieldCheck } from "lucide-react";
import TopBar from "./TopBar";
import { fromCents, simulateIncomeIncrease, simulateNewInstallment, toCents } from "../financial-engine/index.js";
import { brl } from "../lib/helpers";

function moneyInput(value) {
  const number = Number(String(value).replace(",", "."));
  return Number.isFinite(number) && number >= 0 ? toCents(number) : 0;
}

export default function SimuladorScreen({ financialData }) {
  const [installment, setInstallment] = useState("500");
  const [incomeIncrease, setIncomeIncrease] = useState(50000);
  const today = new Date().toISOString().slice(0, 10);
  const installmentResult = useMemo(() => simulateNewInstallment(financialData, today, moneyInput(installment)), [financialData, installment, today]);
  const incomeResult = useMemo(() => simulateIncomeIncrease(financialData, today, incomeIncrease), [financialData, incomeIncrease, today]);
  return (
    <div className="pb-4">
      <TopBar title="Simulador de decisões" subtitle="Teste possibilidades sem alterar seus dados" />
      <div className="px-5 space-y-5">
        <section className="rounded-3xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
          <div className="flex gap-2 items-center"><Calculator size={20} color="var(--primary)" /><h2 className="font-display text-xl font-semibold">Posso assumir uma parcela?</h2></div>
          <label htmlFor="new-installment" className="block text-xs font-semibold uppercase mt-4" style={{ color: "var(--ink-soft)" }}>Valor mensal da nova parcela</label>
          <div className="relative mt-2"><span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold" style={{ color: "var(--ink-soft)" }}>R$</span><input id="new-installment" value={installment} onChange={(event) => setInstallment(event.target.value.replace(/[^0-9,.]/g, ""))} inputMode="decimal" className="w-full rounded-2xl border pl-11 pr-4 py-3 outline-none" style={{ borderColor: "var(--line)" }} /></div>
          <div className="rounded-2xl p-3 mt-4" style={{ background: installmentResult.affordable ? "var(--primary-lt)" : "#FDECEC" }}><div className="flex gap-2"><ShieldCheck size={18} color={installmentResult.affordable ? "var(--primary)" : "var(--accent)"} /><div><p className="text-sm font-semibold">{installmentResult.affordable ? "Cabe na projeção atual" : "Não é seguro assumir agora"}</p><p className="text-[11px] mt-1" style={{ color: "var(--ink-soft)" }}>Capacidade mensal prevista: {brl(fromCents(installmentResult.monthlyCapacityCents))}. O cálculo considera os dados já informados.</p></div></div></div>
          <div className="grid grid-cols-3 gap-2 mt-3">{installmentResult.forecasts.map((item) => <div key={item.days} className="rounded-2xl p-2 text-center" style={{ background: "var(--bg)" }}><p className="text-[10px]" style={{ color: "var(--ink-soft)" }}>{item.days} dias</p><p className="text-xs font-semibold mt-1" style={{ color: item.simulatedBalanceCents < 0 ? "var(--accent)" : "var(--primary)" }}>{brl(fromCents(item.simulatedBalanceCents))}</p></div>)}</div>
        </section>

        <section className="rounded-3xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
          <div className="flex gap-2 items-center"><ArrowUpCircle size={20} color="var(--primary)" /><h2 className="font-display text-xl font-semibold">E se minha renda aumentar?</h2></div>
          <div className="grid grid-cols-3 gap-2 mt-4">{[50000, 100000, 150000].map((value) => <button key={value} onClick={() => setIncomeIncrease(value)} className="rounded-2xl py-2 text-xs font-semibold" style={{ background: incomeIncrease === value ? "var(--primary)" : "var(--primary-lt)", color: incomeIncrease === value ? "white" : "var(--primary-dk)" }}>+ {brl(fromCents(value))}</button>)}</div>
          <div className="space-y-2 mt-4">{incomeResult.map((item) => <div key={item.days} className="flex justify-between rounded-2xl p-3" style={{ background: "var(--bg)" }}><span className="text-xs">Em {item.days} dias</span><span className="text-sm font-semibold" style={{ color: "var(--primary)" }}>{brl(fromCents(item.simulatedBalanceCents))}</span></div>)}</div>
        </section>
        <p className="text-[11px] px-1" style={{ color: "var(--ink-soft)" }}>Simulações são estimativas e nunca criam lançamentos. O resultado melhora conforme o Atlas completa rendas, despesas, cartões e dívidas.</p>
      </div>
    </div>
  );
}
