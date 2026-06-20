import React, { useState, useMemo } from "react";
import TopBar from "./TopBar";
import { brl } from "../lib/helpers";

export default function SimuladorScreen() {
  const [monthly, setMonthly] = useState("200");
  const [rate, setRate] = useState("10");

  const results = useMemo(() => {
    const pmt = parseFloat(monthly) || 0;
    const annual = (parseFloat(rate) || 0) / 100;
    const i = Math.pow(1 + annual, 1 / 12) - 1;
    return [1, 5, 10, 20].map((years) => {
      const n = years * 12;
      const fv = i > 0 ? pmt * ((Math.pow(1 + i, n) - 1) / i) : pmt * n;
      const invested = pmt * n;
      return { years, fv, invested, gain: fv - invested };
    });
  }, [monthly, rate]);

  const max = Math.max(...results.map((r) => r.fv), 1);

  return (
    <div className="pb-4">
      <TopBar title="🧮 Simulador de futuro" subtitle="Veja como pequenos valores crescem com o tempo." />
      <div className="px-5 space-y-4">
        <div className="rounded-3xl p-5 space-y-4" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--ink-soft)" }}>
              Valor mensal investido
            </label>
            <div className="relative mt-1.5">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold" style={{ color: "var(--ink-soft)" }}>
                R$
              </span>
              <input
                value={monthly}
                onChange={(e) => setMonthly(e.target.value.replace(/[^0-9.]/g, ""))}
                inputMode="decimal"
                className="w-full rounded-2xl border pl-11 pr-4 py-3 text-base outline-none"
                style={{ borderColor: "var(--line)", color: "var(--ink)" }}
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--ink-soft)" }}>
              Taxa anual estimada
            </label>
            <div className="relative mt-1.5">
              <input
                value={rate}
                onChange={(e) => setRate(e.target.value.replace(/[^0-9.]/g, ""))}
                inputMode="decimal"
                className="w-full rounded-2xl border pl-4 pr-9 py-3 text-base outline-none"
                style={{ borderColor: "var(--line)", color: "var(--ink)" }}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 font-semibold" style={{ color: "var(--ink-soft)" }}>
                %
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          {results.map((r) => (
            <div key={r.years} className="rounded-3xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
                  {r.years} {r.years === 1 ? "ano" : "anos"}
                </span>
                <span className="font-display text-lg font-semibold" style={{ color: "var(--primary-dk)" }}>
                  {brl(r.fv)}
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--primary-lt)" }}>
                <div className="h-full rounded-full" style={{ width: `${(r.fv / max) * 100}%`, background: "var(--primary)" }} />
              </div>
              <div className="flex justify-between mt-2 text-[11px]" style={{ color: "var(--ink-soft)" }}>
                <span>Investido: {brl(r.invested)}</span>
                <span>Ganho: {brl(r.gain)}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] px-1" style={{ color: "var(--ink-soft)" }}>
          Simulação ilustrativa com juros compostos mensais. Não considera impostos ou taxas.
        </p>
      </div>
    </div>
  );
}

