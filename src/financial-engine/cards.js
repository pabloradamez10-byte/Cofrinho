import { assertCents } from "./money.js";

const POSTED_CARD_STATUSES = new Set(["confirmed", "corrected", "cleared"]);

function requireText(value, field) {
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${field} é obrigatório.`);
}

function requireDay(value, field) {
  if (!Number.isInteger(value) || value < 1 || value > 31) throw new TypeError(`${field} deve estar entre 1 e 31.`);
}

export function validateCreditCard(card) {
  if (!card || typeof card !== "object") throw new TypeError("Cartão inválido.");
  requireText(card.id, "Identificador do cartão");
  requireText(card.name, "Nome do cartão");
  assertCents(card.limitCents, "Limite do cartão");
  if (card.limitCents < 0) throw new RangeError("O limite do cartão não pode ser negativo.");
  requireDay(card.closingDay, "Dia de fechamento");
  requireDay(card.dueDay, "Dia de vencimento");
  if (card.lastFour != null && !/^\d{4}$/.test(card.lastFour)) throw new TypeError("Guarde somente os quatro últimos dígitos do cartão.");
  return card;
}

export function validateCardPurchase(purchase, cardIds = null) {
  if (!purchase || typeof purchase !== "object") throw new TypeError("Compra no cartão inválida.");
  requireText(purchase.id, "Identificador da compra");
  requireText(purchase.cardId, "Cartão da compra");
  requireText(purchase.description, "Descrição da compra");
  requireText(purchase.date, "Data da compra");
  requireText(purchase.firstInvoiceMonth, "Primeira fatura");
  if (Number.isNaN(Date.parse(purchase.date))) throw new TypeError("Data da compra inválida.");
  if (!/^\d{4}-\d{2}$/.test(purchase.firstInvoiceMonth)) throw new TypeError("Mês da primeira fatura inválido.");
  assertCents(purchase.totalCents, "Valor da compra");
  if (purchase.totalCents <= 0) throw new RangeError("O valor da compra deve ser maior que zero.");
  if (!Number.isInteger(purchase.installmentCount) || purchase.installmentCount < 1 || purchase.installmentCount > 120) throw new TypeError("Quantidade de parcelas inválida.");
  if (!Number.isInteger(purchase.paidInstallments ?? 0) || (purchase.paidInstallments ?? 0) < 0 || (purchase.paidInstallments ?? 0) > purchase.installmentCount) throw new TypeError("Quantidade de parcelas pagas inválida.");
  if (!["detected", "awaiting_confirmation", "confirmed", "corrected", "cleared", "ignored", "reversed"].includes(purchase.status)) throw new TypeError("Situação da compra inválida.");
  if (cardIds && !cardIds.has(purchase.cardId)) throw new TypeError(`O cartão ${purchase.cardId} não existe.`);
  return purchase;
}

export function splitInstallments(totalCents, installmentCount) {
  assertCents(totalCents, "Valor da compra");
  if (totalCents <= 0 || !Number.isInteger(installmentCount) || installmentCount < 1) throw new TypeError("Compra ou quantidade de parcelas inválida.");
  const base = Math.floor(totalCents / installmentCount);
  const remainder = totalCents % installmentCount;
  return Array.from({ length: installmentCount }, (_, index) => base + (index < remainder ? 1 : 0));
}

export function addMonths(month, amount) {
  if (!/^\d{4}-\d{2}$/.test(month) || !Number.isInteger(amount)) throw new TypeError("Mês inválido.");
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + amount, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function projectPurchaseInstallments(purchase) {
  validateCardPurchase(purchase);
  const amounts = splitInstallments(purchase.totalCents, purchase.installmentCount);
  return amounts.map((amountCents, index) => ({ purchaseId: purchase.id, cardId: purchase.cardId, number: index + 1, total: purchase.installmentCount, month: addMonths(purchase.firstInvoiceMonth, index), amountCents, paid: index < (purchase.paidInstallments ?? 0) }));
}

export function calculateCardPosition(card, purchases, invoiceMonth) {
  validateCreditCard(card);
  const installments = purchases.filter((purchase) => purchase.cardId === card.id && POSTED_CARD_STATUSES.has(purchase.status)).flatMap(projectPurchaseInstallments);
  const unpaid = installments.filter((installment) => !installment.paid);
  const usedLimitCents = unpaid.reduce((sum, installment) => sum + installment.amountCents, 0);
  const currentInvoiceCents = unpaid.filter((installment) => installment.month === invoiceMonth).reduce((sum, installment) => sum + installment.amountCents, 0);
  return { usedLimitCents, availableLimitCents: card.limitCents - usedLimitCents, currentInvoiceCents, remainingInstallments: unpaid.length };
}

export function projectCardInvoices(card, purchases, startMonth, count = 6) {
  validateCreditCard(card);
  if (!Number.isInteger(count) || count < 1 || count > 24) throw new TypeError("Período de projeção inválido.");
  return Array.from({ length: count }, (_, index) => {
    const month = addMonths(startMonth, index);
    return { month, amountCents: calculateCardPosition(card, purchases, month).currentInvoiceCents };
  });
}
