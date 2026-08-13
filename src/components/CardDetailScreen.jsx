import React, { useMemo } from "react";
import { CalendarClock, CreditCard, Gauge, Layers3 } from "lucide-react";
import TopBar from "./TopBar";
import { calculateCardPosition, fromCents, projectCardInvoices, projectPurchaseInstallments } from "../financial-engine/index.js";
import { brl } from "../lib/helpers";

const monthLabel = (month) => new Date(`${month}-02T12:00:00`).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });

export default function CardDetailScreen({ cardId, financialData, onBack }) {
  const card = financialData.creditCards.find((item) => item.id === cardId);
  const month = new Date().toISOString().slice(0, 7);
  const purchases = useMemo(() => financialData.cardPurchases.filter((item) => item.cardId === cardId), [cardId, financialData.cardPurchases]);
  if (!card) return null;
  const position = calculateCardPosition(card, purchases, month);
  const invoices = projectCardInvoices(card, purchases, month, 6);
  const usage = card.limitCents > 0 ? Math.min(100, Math.max(0, position.usedLimitCents / card.limitCents * 100)) : 0;
  return (
    <div className="pb-4">
      <TopBar title={card.name} subtitle={card.lastFour ? `Cartão final ${card.lastFour}` : "Dados protegidos"} onBack={onBack} />
      <div className="px-5 space-y-4">
        <section className="rounded-3xl p-5" style={{ background: "var(--primary)", color: "#fff" }}><div className="flex items-center gap-2 text-xs font-semibold opacity-80"><CreditCard size={16} /> Fatura atual</div><p className="font-display text-3xl font-semibold mt-2">{brl(fromCents(position.currentInvoiceCents))}</p><p className="text-xs mt-3 opacity-80">Fecha dia {card.closingDay} · vence dia {card.dueDay}</p></section>
        <section className="rounded-3xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}><div className="flex items-center gap-2"><Gauge size={19} color="var(--primary)" /><p className="font-semibold text-sm">Limite</p></div><div className="h-2 rounded-full mt-4 overflow-hidden" style={{ background: "var(--primary-lt)" }}><div className="h-full rounded-full" style={{ width: `${usage}%`, background: usage > 80 ? "var(--accent)" : "var(--primary)" }} /></div><div className="grid grid-cols-3 gap-2 mt-3 text-center"><div><p className="text-[9px] uppercase" style={{ color: "var(--ink-soft)" }}>Total</p><p className="text-xs font-semibold">{brl(fromCents(card.limitCents))}</p></div><div><p className="text-[9px] uppercase" style={{ color: "var(--ink-soft)" }}>Usado</p><p className="text-xs font-semibold">{brl(fromCents(position.usedLimitCents))}</p></div><div><p className="text-[9px] uppercase" style={{ color: "var(--ink-soft)" }}>Disponível</p><p className="text-xs font-semibold" style={{ color: "var(--primary)" }}>{brl(fromCents(position.availableLimitCents))}</p></div></div></section>
        <section><div className="flex items-center gap-2 mb-3"><CalendarClock size={19} color="var(--primary)" /><h2 className="font-display text-xl font-semibold">Próximas faturas</h2></div><div className="grid grid-cols-3 gap-2">{invoices.map((invoice) => <div key={invoice.month} className="rounded-2xl p-3 text-center" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}><p className="text-[10px] capitalize" style={{ color: "var(--ink-soft)" }}>{monthLabel(invoice.month)}</p><p className="text-xs font-semibold mt-1">{brl(fromCents(invoice.amountCents))}</p></div>)}</div></section>
        <section><div className="flex items-center gap-2 mb-3"><Layers3 size={19} color="var(--primary)" /><h2 className="font-display text-xl font-semibold">Compras e parcelas</h2></div>{purchases.length === 0 ? <div className="rounded-3xl p-5 text-center" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}><p className="font-semibold text-sm">Nenhuma compra registrada</p><p className="text-xs mt-1" style={{ color: "var(--ink-soft)" }}>Compras confirmadas pelo Atlas aparecerão aqui.</p></div> : <div className="space-y-2">{purchases.map((purchase) => { const remaining = projectPurchaseInstallments(purchase).filter((item) => !item.paid).length; return <article key={purchase.id} className="rounded-2xl p-3 flex items-center gap-3" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}><div className="flex-1 min-w-0"><p className="font-semibold text-sm truncate">{purchase.description}</p><p className="text-[10px] mt-1" style={{ color: "var(--ink-soft)" }}>{purchase.installmentCount}x · {remaining} parcela(s) restante(s)</p></div><p className="text-sm font-semibold">{brl(fromCents(purchase.totalCents))}</p></article>; })}</div>}</section>
      </div>
    </div>
  );
}
