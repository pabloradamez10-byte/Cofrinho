import React from "react";
import { ChevronRight, CreditCard, ShieldCheck } from "lucide-react";
import TopBar from "./TopBar";
import { calculateCardPosition, fromCents } from "../financial-engine/index.js";
import { brl } from "../lib/helpers";

const currentMonth = () => new Date().toISOString().slice(0, 7);

export default function CardsScreen({ financialData, onBack, onSelectCard }) {
  const cards = financialData.creditCards.filter((card) => card.active !== false);
  return (
    <div className="pb-4">
      <TopBar title="Cartões" subtitle="Faturas e comprometimento futuro" onBack={onBack} />
      <div className="px-5 space-y-3">
        {cards.length === 0 ? (
          <div className="rounded-3xl p-6 text-center" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
            <CreditCard size={31} color="var(--primary)" className="mx-auto" />
            <p className="font-display text-lg font-semibold mt-3">Nenhum cartão informado</p>
            <p className="text-xs mt-1" style={{ color: "var(--ink-soft)" }}>Quando você enviar os dados ao Atlas, seus cartões aparecerão aqui sem guardar o número completo.</p>
          </div>
        ) : cards.map((card) => {
          const position = calculateCardPosition(card, financialData.cardPurchases, currentMonth());
          return (
            <button type="button" key={card.id} onClick={() => onSelectCard(card.id)} className="w-full rounded-3xl p-4 text-left" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
              <div className="flex items-center gap-3"><div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: "var(--primary-lt)" }}><CreditCard size={21} color="var(--primary)" /></div><div className="flex-1"><p className="font-semibold text-sm">{card.name}</p><p className="text-xs" style={{ color: "var(--ink-soft)" }}>{card.lastFour ? `Final ${card.lastFour}` : "Identificação protegida"}</p></div><ChevronRight size={19} color="var(--ink-soft)" /></div>
              <div className="grid grid-cols-2 gap-3 mt-4"><div><p className="text-[10px] uppercase font-semibold" style={{ color: "var(--ink-soft)" }}>Fatura atual</p><p className="font-display font-semibold mt-1">{brl(fromCents(position.currentInvoiceCents))}</p></div><div className="text-right"><p className="text-[10px] uppercase font-semibold" style={{ color: "var(--ink-soft)" }}>Disponível</p><p className="font-display font-semibold mt-1" style={{ color: "var(--primary)" }}>{brl(fromCents(position.availableLimitCents))}</p></div></div>
            </button>
          );
        })}
        <div className="rounded-3xl p-4 flex gap-3" style={{ background: "var(--primary-lt)" }}><ShieldCheck size={20} color="var(--primary)" /><p className="text-xs" style={{ color: "var(--ink-soft)" }}>O Cofrinho guarda somente os quatro últimos dígitos. Senha, CVV e número completo nunca serão armazenados.</p></div>
      </div>
    </div>
  );
}
