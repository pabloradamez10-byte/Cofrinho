import test from "node:test";
import assert from "node:assert/strict";
import { commitImportPreview, createEmptyFinancialData, findPotentialTransfers, parseCsvStatement, parseOfxStatement, parsePdfStatementText, prepareImportPreview } from "../src/financial-engine/index.js";

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

test("reconhece linhas textuais de PDF do Itaú e Banrisul sem adivinhar linha ambígua", () => {
  const parsed = parsePdfStatementText("01/08/2026 PIX ENVIADO JOAO 150,00 D\n02/08/2026 SALARIO EMPRESA 4.000,00 C\n03/08/2026 MOVIMENTO DESCONHECIDO 20,00", "itau");
  assert.equal(parsed.rows.length, 2);
  assert.equal(parsed.rows[0].signedAmountCents, -15_000);
  assert.equal(parsed.rows[1].signedAmountCents, 400_000);
  assert.equal(parsed.rejected.length, 1);
});

test("confirma lote de forma auditável sem reaproveitar duplicidades", () => {
  const data = createEmptyFinancialData();
  const rows = parseCsvStatement("data;descricao;valor;id\n01/08/2026;Mercado;-50,00;one\n05/08/2026;Salario;1000,00;two");
  const preview = prepareImportPreview(rows, { accountId: "itau", existingTransactions: [], categories: data.categories, fileName: "itau.csv" });
  const result = commitImportPreview(data, preview.candidates, { fileName: "itau.csv", accountId: "itau", source: "csv" }, "2026-08-13T12:00:00.000Z");
  assert.equal(result.report.inserted, 2);
  assert.equal(result.data.transactions.length, 2);
  assert.equal(result.data.activities[0].action, "statement_import_confirmed");
  assert.deepEqual(result.data.activities[0].transactionIds, result.data.transactions.map((item) => item.id));
  assert.equal(data.transactions.length, 0);
});

test("cancela o lote inteiro quando uma correção deixa valor inválido", () => {
  const data = createEmptyFinancialData();
  const rows = parseCsvStatement("data;descricao;valor\n01/08/2026;Mercado;-50,00");
  const preview = prepareImportPreview(rows, { accountId: "itau", existingTransactions: [], categories: data.categories });
  preview.candidates[0].transaction.amountCents = 0;
  assert.throws(() => commitImportPreview(data, preview.candidates, {}, "2026-08-13T12:00:00.000Z"), /maior que zero/);
  assert.equal(data.transactions.length, 0);
});
