export function toCents(value) {
  const amount = typeof value === "string" ? Number(value.replace(",", ".")) : value;
  if (!Number.isFinite(amount)) throw new TypeError("O valor monetário deve ser um número válido.");
  return Math.round(amount * 100);
}

export function fromCents(cents) {
  assertCents(cents);
  return cents / 100;
}

export function assertCents(cents, field = "valor") {
  if (!Number.isSafeInteger(cents)) {
    throw new TypeError(`${field} deve ser informado em centavos inteiros.`);
  }
}
