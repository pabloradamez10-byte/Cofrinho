import test from "node:test";
import assert from "node:assert/strict";
import { findPotentialTransfers, parseCsvStatement, parseOfxStatement, prepareImportPreview } from "../src/financial-engine/index.js";

const categories = [{ id: "alimentacao", name: "Alimentação" }, { id: "salario", name: "Salário" }, { id: "outros", name: "Outros" }];

test("lê CSV brasileiro com valores positivos e negativos", () => {
  const rows = parseCsvStatement('Data;Descrição;Valor;ID\n01/08/2026;Supermercado;-123,45;abc\n05/08/2026;Salário;4.000,00;def');
  assert.equal(rows[0].date, "2026-08-01");
  assert.equal(rows[0].signedAmountCents, -12_345);
  assert.equal(rows[1].signedAmountCents, 400_000);
});

test("lê lançamentos OFX e preserva o FITID", () => {
  const rows = parseOfxStatement('<OFX><BANKTRANLIST><STMTTRN><DTPOSTED>20260801120000<TRNAMT>-25.50<FITID>fit-1<MEMO>PADARIA</STMTTRN></BANKTRANLIST></OFX>');
  assert.equal(rows[0].externalId, "fit-1");
  assert.equal(rows[0].signedAmountCents, -2_550);
});

test("prepara prévia sem inserir e marca duplicidade", () => {
  const rows = parseCsvStatement('data,descricao,valor,id\n2026-08-01,Mercado,-50.00,dup-1\n2026-08-05,Salario,1000.00,new-1');
  const existing = [{ id: "old", date: "2026-08-01", description: "Mercado", amountCents: 5_000, type: "expense", sourceAccountId: "itau", status: "confirmed", origin: "statement", dedupeKey: "statement:itau:dup-1" }];
  const preview = prepareImportPreview(rows, { accountId: "itau", existingTransactions: existing, categories, fileName: "teste.csv" });
  assert.equal(preview.report.total, 2);
  assert.equal(preview.report.duplicates, 1);
  assert.equal(preview.report.ready, 1);
  assert.equal(existing.length, 1);
  assert.equal(preview.candidates[1].transaction.categoryId, "salario");
});

test("sinaliza possível transferência entre contas sem convertê-la automaticamente", () => {
  const common = { date: "2026-08-01", description: "PIX", amountCents: 10_000, status: "awaiting_confirmation", origin: "statement" };
  const candidates = [
    { transaction: { ...common, id: "a", type: "expense", sourceAccountId: "itau" } },
    { transaction: { ...common, id: "b", type: "income", destinationAccountId: "banrisul" } },
  ];
  assert.equal(findPotentialTransfers(candidates).length, 1);
  assert.equal(candidates[0].transaction.type, "expense");
});
