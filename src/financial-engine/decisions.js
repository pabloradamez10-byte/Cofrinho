import { assertCents } from "./money.js";
import { forecastFinancialFuture } from "./planning.js";
import { calculateFinancialPosition } from "./engine.js";

function parseDate(value, field) {
  const date = new Date(`${value?.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) throw new TypeError(`${field} inválida.`);
  return date;
}

export function analyzeGoal(goal, today, monthlyCapacityCents = 0) {
  if (!goal || typeof goal !== "object") throw new TypeError("Meta inválida.");
  assertCents(goal.targetCents, "Valor-alvo");
  assertCents(monthlyCapacityCents, "Capacidade mensal");
  const savedCents = (goal.contributions ?? []).reduce((sum, item) => sum + item.amountCents, 0);
  const remainingCents = Math.max(0, goal.targetCents - savedCents);
  const start = parseDate(today, "Data atual");
  let monthsUntilDeadline = null;
  let requiredMonthlyCents = null;
  if (goal.deadline) {
    const deadline = parseDate(goal.deadline, "Prazo da meta");
    const calendarMonths = (deadline.getUTCFullYear() - start.getUTCFullYear()) * 12
      + deadline.getUTCMonth() - start.getUTCMonth();
    monthsUntilDeadline = Math.max(1, calendarMonths + (deadline.getUTCDate() > start.getUTCDate() ? 1 : 0));
    requiredMonthlyCents = remainingCents === 0 ? 0 : Math.ceil(remainingCents / monthsUntilDeadline);
  }
  const capacity = Math.max(0, monthlyCapacityCents);
  const estimatedMonths = remainingCents === 0 ? 0 : capacity > 0 ? Math.ceil(remainingCents / capacity) : null;
  const estimatedCompletionDate = estimatedMonths == null
    ? null
    : new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + estimatedMonths, start.getUTCDate(), 12)).toISOString().slice(0, 10);
  return {
    savedCents,
    remainingCents,
    percent: goal.targetCents > 0 ? Math.min(100, savedCents / goal.targetCents * 100) : 100,
    monthsUntilDeadline,
    requiredMonthlyCents,
    suggestedMonthlyCents: requiredMonthlyCents == null ? capacity : Math.min(requiredMonthlyCents, capacity),
    estimatedMonths,
    estimatedCompletionDate,
    onTrack: remainingCents === 0 || (requiredMonthlyCents != null && capacity >= requiredMonthlyCents),
  };
}

export function calculateMonthlyPlanningCapacity(data, today) {
  const forecast = forecastFinancialFuture(data, today, 30);
  return Math.max(0, forecast.incomeCents - forecast.expenseCents);
}

export function simulateNewInstallment(data, today, installmentCents) {
  assertCents(installmentCents, "Nova parcela");
  const forecasts = [30, 60, 90].map((days) => {
    const base = forecastFinancialFuture(data, today, days);
    const occurrences = Math.ceil(days / 30);
    return { ...base, occurrences, simulatedExpenseCents: installmentCents * occurrences, simulatedBalanceCents: base.projectedBalanceCents - installmentCents * occurrences };
  });
  const monthlyCapacityCents = calculateMonthlyPlanningCapacity(data, today);
  const affordable = installmentCents > 0
    && installmentCents <= monthlyCapacityCents
    && forecasts.every((item) => item.simulatedBalanceCents >= 0);
  return { installmentCents, monthlyCapacityCents, affordable, forecasts };
}

export function analyzePurchaseDecision(data, today, input) {
  if (!input || typeof input !== "object") throw new TypeError("Compra simulada inválida.");
  const installmentCents = input.installmentCents;
  const installmentCount = input.installmentCount;
  assertCents(installmentCents, "Valor da parcela");
  if (installmentCents <= 0) throw new RangeError("O valor da parcela deve ser maior que zero.");
  if (!Number.isInteger(installmentCount) || installmentCount < 1 || installmentCount > 120) {
    throw new TypeError("Quantidade de parcelas inválida.");
  }

  const simulation = simulateNewInstallment(data, today, installmentCents);
  const position = calculateFinancialPosition(data.accounts, data.transactions, today);
  const monthlyCapacityAfterCents = simulation.monthlyCapacityCents - installmentCents;
  const totalPurchaseCents = installmentCents * installmentCount;
  const hasImmediateRoom = position.freeMoneyCents >= installmentCents;
  const lowestProjectedBalanceCents = Math.min(...simulation.forecasts.map((forecast) => forecast.simulatedBalanceCents));
  const approved = simulation.affordable && hasImmediateRoom;
  const recommendation = approved ? "can_buy" : "do_not_buy";
  const reasonCode = !hasImmediateRoom ? "insufficient_free_money"
    : installmentCents > simulation.monthlyCapacityCents ? "insufficient_monthly_capacity"
      : lowestProjectedBalanceCents < 0 ? "negative_projected_balance"
        : "affordable";

  return {
    itemName: typeof input.itemName === "string" && input.itemName.trim() ? input.itemName.trim() : "Compra simulada",
    recommendation,
    reasonCode,
    installmentCents,
    installmentCount,
    totalPurchaseCents,
    freeMoneyCents: position.freeMoneyCents,
    monthlyCapacityCents: simulation.monthlyCapacityCents,
    monthlyCapacityAfterCents,
    lowestProjectedBalanceCents,
    forecasts: simulation.forecasts.map(({ days, projectedBalanceCents, simulatedBalanceCents }) => ({ days, projectedBalanceCents, simulatedBalanceCents })),
    readOnly: true,
  };
}

export function simulateIncomeIncrease(data, today, increaseCents) {
  assertCents(increaseCents, "Aumento de renda");
  return [30, 60, 90].map((days) => {
    const base = forecastFinancialFuture(data, today, days);
    const occurrences = Math.ceil(days / 30);
    return { days, baseBalanceCents: base.projectedBalanceCents, addedIncomeCents: increaseCents * occurrences, simulatedBalanceCents: base.projectedBalanceCents + increaseCents * occurrences };
  });
}
