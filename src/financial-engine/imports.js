import { findDuplicate } from "./engine.js";
import { validateTransaction } from "./validation.js";

const HEADER_ALIASES = {
  date: ["data", "date", "dtposted", "data lancamento"],
  description: ["descricao", "descrição", "description", "memo", "historico", "histórico"],
  amount: ["valor", "amount", "trnamt", "valor lancamento"],
  externalId: ["id", "fitid", "identificador", "documento"],
};

function normalize(value) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function stableHash(value) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function parseDate(value) {
  const text = String(value ?? "").trim();
  const br = text.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  const iso = text.match(/^(\d{4})[/-](\d{2})[/-](\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const ofx = text.match(/^(\d{4})(\d{2})(\d{2})/);
  if (ofx) return `${ofx[1]}-${ofx[2]}-${ofx[3]}`;
  throw new TypeError(`Data não reconhecida: ${text || "vazia"}.`);
}

function parseAmount(value) {
  let text = String(value ?? "").trim().replace(/R\$/gi, "").replace(/\s/g, "");
  if (!text) throw new TypeError("Valor vazio no extrato.");
  if (text.includes(",")) text = text.replace(/\./g, "").replace(",", ".");
  const number = Number(text);
  if (!Number.isFinite(number) || number === 0) throw new TypeError(`Valor inválido: ${value}.`);
  return Math.round(number * 100);
}

function splitCsvLine(line, delimiter) {
  const cells = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"' && quoted) { current += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === delimiter && !quoted) { cells.push(current.trim()); current = ""; }
    else current += char;
  }
  cells.push(current.trim());
  return cells;
}

function findHeader(headers, field) {
  const aliases = HEADER_ALIASES[field].map(normalize);
  return headers.findIndex((header) => aliases.includes(normalize(header)));
}

export function parseCsvStatement(content) {
  const lines = String(content).replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) throw new TypeError("O CSV não possui lançamentos.");
  const delimiter = (lines[0].match(/;/g)?.length ?? 0) >= (lines[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const headers = splitCsvLine(lines[0], delimiter);
  const indexes = Object.fromEntries(Object.keys(HEADER_ALIASES).map((field) => [field, findHeader(headers, field)]));
  if (indexes.date < 0 || indexes.description < 0 || indexes.amount < 0) {
    throw new TypeError("O CSV precisa ter as colunas data, descrição e valor.");
  }
  return lines.slice(1).map((line, index) => {
    const cells = splitCsvLine(line, delimiter);
    return {
      row: index + 2,
      date: parseDate(cells[indexes.date]),
      description: cells[indexes.description]?.trim(),
      signedAmountCents: parseAmount(cells[indexes.amount]),
      externalId: indexes.externalId >= 0 ? cells[indexes.externalId]?.trim() : null,
    };
  });
}

function ofxTag(block, tag) {
  return block.match(new RegExp(`<${tag}>([^<\\r\\n]+)`, "i"))?.[1]?.trim() ?? null;
}

export function parseOfxStatement(content) {
  const blocks = String(content).match(/<STMTTRN>[\s\S]*?(?=<STMTTRN>|<\/BANKTRANLIST>|$)/gi) ?? [];
  if (blocks.length === 0) throw new TypeError("Nenhum lançamento foi encontrado no OFX.");
  return blocks.map((block, index) => ({
    row: index + 1,
    date: parseDate(ofxTag(block, "DTPOSTED")),
    description: ofxTag(block, "MEMO") || ofxTag(block, "NAME") || "Lançamento do extrato",
    signedAmountCents: parseAmount(ofxTag(block, "TRNAMT")),
    externalId: ofxTag(block, "FITID"),
  }));
}

export function detectStatementFormat(fileName, content) {
  const name = normalize(fileName);
  if (name.endsWith(".ofx") || /<OFX>|<STMTTRN>/i.test(content)) return "ofx";
  if (name.endsWith(".csv")) return "csv";
  throw new TypeError("Formato não suportado. Use CSV ou OFX nesta primeira versão.");
}

export function suggestCategory(description, categories = []) {
  const text = normalize(description);
  const rules = [
    ["salario", ["salario", "folha pagamento"]], ["peculio", ["peculio"]],
    ["alimentacao", ["mercado", "supermercado", "restaurante", "padaria"]],
    ["transporte", ["posto", "combustivel", "uber", "99app"]],
    ["moradia", ["aluguel", "condominio"]], ["saude", ["farmacia", "hospital", "clinica"]],
    ["assinaturas", ["netflix", "spotify", "internet", "telefone"]], ["dividas", ["emprestimo", "financiamento"]],
  ];
  const suggestion = rules.find(([, terms]) => terms.some((term) => text.includes(term)))?.[0] ?? "outros";
  return categories.some((category) => category.id === suggestion) ? suggestion : categories.find((category) => category.id === "outros")?.id ?? null;
}

export function prepareImportPreview(rows, options) {
  const { accountId, existingTransactions = [], categories = [], fileName = "extrato" } = options ?? {};
  if (typeof accountId !== "string" || !accountId.trim()) throw new TypeError("Selecione a conta do extrato.");
  const candidates = rows.map((row) => {
    if (!row.description?.trim()) throw new TypeError(`Descrição vazia na linha ${row.row}.`);
    const type = row.signedAmountCents > 0 ? "income" : "expense";
    const amountCents = Math.abs(row.signedAmountCents);
    const identity = row.externalId || stableHash(`${row.date}|${row.description}|${row.signedAmountCents}`);
    const transaction = {
      id: `import-${accountId}-${identity}`,
      date: row.date,
      description: row.description.trim(),
      amountCents,
      type,
      categoryId: suggestCategory(row.description, categories),
      sourceAccountId: type === "expense" ? accountId : undefined,
      destinationAccountId: type === "income" ? accountId : undefined,
      paymentMethod: null,
      status: "awaiting_confirmation",
      note: `Prévia de ${fileName}`,
      origin: "statement",
      dedupeKey: `statement:${accountId}:${identity}`,
    };
    validateTransaction(transaction);
    const duplicate = findDuplicate(transaction, existingTransactions);
    return { row: row.row, transaction, duplicate: duplicate.duplicate, duplicateReason: duplicate.reason, selected: !duplicate.duplicate };
  });
  return {
    candidates,
    report: {
      total: candidates.length,
      ready: candidates.filter((item) => item.selected).length,
      duplicates: candidates.filter((item) => item.duplicate).length,
      corrections: 0,
    },
  };
}

export function parseStatementFile(fileName, content) {
  const format = detectStatementFormat(fileName, content);
  return { format, rows: format === "ofx" ? parseOfxStatement(content) : parseCsvStatement(content) };
}

export function findPotentialTransfers(candidates) {
  return candidates.flatMap((left, index) => candidates.slice(index + 1).flatMap((right) => {
    const a = left.transaction;
    const b = right.transaction;
    const differentAccounts = (a.sourceAccountId || a.destinationAccountId) !== (b.sourceAccountId || b.destinationAccountId);
    const opposite = a.type !== b.type && a.amountCents === b.amountCents;
    const days = Math.abs(new Date(a.date) - new Date(b.date)) / 86_400_000;
    return differentAccounts && opposite && days <= 2 ? [{ firstId: a.id, secondId: b.id, confidence: "possible" }] : [];
  }));
}
