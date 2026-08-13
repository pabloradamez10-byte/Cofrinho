import React, { useState } from "react";
import { AlertCircle, CheckCircle2, FileSearch, Pencil, ShieldCheck, Upload } from "lucide-react";
import TopBar from "./TopBar";
import { extractPdfText, fromCents, parseStatementFile, prepareImportPreview, toCents } from "../financial-engine/index.js";
import { brl } from "../lib/helpers";

function moneyValue(value) {
  const parsed = Number(String(value).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? toCents(parsed) : 0;
}

export default function ImportScreen({ financialData, onBack, onConfirm }) {
  const [accountId, setAccountId] = useState(financialData.accounts.find((account) => account.active !== false)?.id ?? "");
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [result, setResult] = useState(null);

  async function inspectFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoading(true); setError(""); setPreview(null); setResult(null);
    try {
      const content = file.name.toLowerCase().endsWith(".pdf") ? await extractPdfText(file) : await file.text();
      const parsed = parseStatementFile(file.name, content);
      const prepared = prepareImportPreview(parsed.rows, { accountId, existingTransactions: financialData.transactions, categories: financialData.categories, fileName: file.name });
      setPreview({ ...prepared, rejected: parsed.rejected ?? [], format: parsed.format.toUpperCase(), fileName: file.name });
    } catch (caught) { setError(caught.message); }
    finally { setLoading(false); event.target.value = ""; }
  }

  function changeCandidate(id, changes) {
    setPreview((current) => ({ ...current, candidates: current.candidates.map((item) => {
      if (item.transaction.id !== id) return item;
      const transaction = { ...item.transaction, ...changes };
      if (changes.type) {
        transaction.sourceAccountId = changes.type === "expense" ? accountId : undefined;
        transaction.destinationAccountId = changes.type === "income" ? accountId : undefined;
      }
      return { ...item, transaction, corrected: true };
    }) }));
  }

  function confirmImport() {
    setError("");
    const response = onConfirm(preview.candidates, { fileName: preview.fileName, accountId, source: preview.format.toLowerCase() });
    if (!response.ok) { setError(response.error); return; }
    setResult(response.report); setPreview(null);
  }

  return <div className="pb-4"><TopBar title="Importar extrato" subtitle="Revise tudo antes de atualizar o Cofrinho" onBack={onBack} /><div className="px-5 space-y-4">
    <section className="rounded-3xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}><label htmlFor="statement-account" className="text-xs font-semibold uppercase" style={{ color: "var(--ink-soft)" }}>Conta do extrato</label><select id="statement-account" value={accountId} onChange={(event) => { setAccountId(event.target.value); setPreview(null); setResult(null); }} className="w-full rounded-2xl border px-4 py-3 mt-2 bg-white" style={{ borderColor: "var(--line)" }}>{financialData.accounts.filter((account) => account.active !== false).map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select><label className="rounded-2xl p-4 mt-4 flex items-center justify-center gap-2 font-semibold cursor-pointer" style={{ background: "var(--primary)", color: "white" }}><Upload size={19} />{loading ? "Analisando..." : "Selecionar PDF, CSV ou OFX"}<input type="file" accept=".pdf,.csv,.ofx,application/pdf,text/csv,application/x-ofx" onChange={inspectFile} className="sr-only" disabled={loading || !accountId} /></label><p className="text-[11px] mt-3 text-center" style={{ color: "var(--ink-soft)" }}>A leitura acontece neste aparelho. Nenhuma senha ou credencial bancária é armazenada.</p></section>

    {error ? <div role="alert" className="rounded-2xl p-3 flex gap-2" style={{ background: "#FDECEC", color: "var(--accent)" }}><AlertCircle size={18} /><p className="text-xs">{error}</p></div> : null}
    {result ? <section className="rounded-3xl p-5" style={{ background: "var(--primary-lt)" }}><CheckCircle2 size={25} color="var(--primary)" /><h2 className="font-display text-xl font-semibold mt-2">Importação concluída</h2><p className="text-xs mt-2">{result.inserted} inserido(s), {result.ignored} ignorado(s) e {result.corrected} corrigido(s). A ação foi registrada em Atividades.</p></section> : null}

    {preview ? <><section className="rounded-3xl p-4" style={{ background: "var(--primary-lt)" }}><div className="flex gap-2 items-center"><FileSearch size={19} color="var(--primary)" /><div><p className="text-sm font-semibold">{preview.fileName}</p><p className="text-[11px]" style={{ color: "var(--ink-soft)" }}>{preview.format} · aguardando sua confirmação</p></div></div><div className="grid grid-cols-3 gap-2 mt-4 text-center"><div><p className="font-display text-xl font-semibold">{preview.report.total}</p><p className="text-[10px]">Encontrados</p></div><div><p className="font-display text-xl font-semibold" style={{ color: "var(--primary)" }}>{preview.candidates.filter((item) => item.selected && !item.duplicate).length}</p><p className="text-[10px]">Selecionados</p></div><div><p className="font-display text-xl font-semibold" style={{ color: "var(--accent)" }}>{preview.report.duplicates + preview.rejected.length}</p><p className="text-[10px]">Ignorados</p></div></div></section>
      {preview.rejected.length ? <div className="rounded-2xl p-3" style={{ background: "#FFF3E8" }}><p className="text-xs font-semibold">{preview.rejected.length} linha(s) ambígua(s) não serão importadas.</p></div> : null}
      <section className="space-y-2">{preview.candidates.map((item) => <article key={item.transaction.id} className="rounded-2xl p-3" style={{ background: "var(--surface)", border: "1px solid var(--line)", opacity: item.duplicate ? 0.65 : 1 }}><div className="flex gap-3"><input aria-label={`Selecionar ${item.transaction.description}`} type="checkbox" checked={item.selected} disabled={item.duplicate} onChange={(event) => setPreview((current) => ({ ...current, candidates: current.candidates.map((candidate) => candidate.transaction.id === item.transaction.id ? { ...candidate, selected: event.target.checked } : candidate) }))} /><div className="flex-1 min-w-0"><p className="text-sm font-semibold truncate">{item.transaction.description}</p><p className="text-[10px] mt-1" style={{ color: "var(--ink-soft)" }}>{new Date(`${item.transaction.date}T00:00:00`).toLocaleDateString("pt-BR")} · {item.transaction.categoryId || "sem categoria"}{item.duplicate ? " · duplicidade" : ""}</p></div><p className="text-sm font-semibold whitespace-nowrap" style={{ color: item.transaction.type === "income" ? "var(--primary)" : "var(--accent)" }}>{item.transaction.type === "income" ? "+" : "−"}{brl(fromCents(item.transaction.amountCents))}</p>{!item.duplicate ? <button aria-label={`Corrigir ${item.transaction.description}`} onClick={() => setEditingId(editingId === item.transaction.id ? null : item.transaction.id)}><Pencil size={17} color="var(--primary)" /></button> : null}</div>
        {editingId === item.transaction.id ? <div className="grid grid-cols-2 gap-2 mt-3 pt-3" style={{ borderTop: "1px solid var(--line)" }}><input aria-label="Descrição" value={item.transaction.description} onChange={(event) => changeCandidate(item.transaction.id, { description: event.target.value })} className="col-span-2 rounded-xl border px-3 py-2 text-xs" style={{ borderColor: "var(--line)" }} /><select aria-label="Tipo" value={item.transaction.type} onChange={(event) => changeCandidate(item.transaction.id, { type: event.target.value })} className="rounded-xl border px-2 py-2 text-xs" style={{ borderColor: "var(--line)" }}><option value="expense">Saída</option><option value="income">Entrada</option></select><input aria-label="Valor" defaultValue={fromCents(item.transaction.amountCents).toFixed(2).replace(".", ",")} onBlur={(event) => changeCandidate(item.transaction.id, { amountCents: moneyValue(event.target.value) })} inputMode="decimal" className="rounded-xl border px-3 py-2 text-xs" style={{ borderColor: "var(--line)" }} /><select aria-label="Categoria" value={item.transaction.categoryId || "outros"} onChange={(event) => changeCandidate(item.transaction.id, { categoryId: event.target.value })} className="col-span-2 rounded-xl border px-2 py-2 text-xs" style={{ borderColor: "var(--line)" }}>{financialData.categories.filter((category) => category.active !== false).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div> : null}</article>)}</section>
      <button onClick={confirmImport} disabled={!preview.candidates.some((item) => item.selected && !item.duplicate)} className="w-full rounded-2xl p-4 font-semibold disabled:opacity-50" style={{ background: "var(--primary)", color: "white" }}>Confirmar e registrar selecionados</button><div className="rounded-2xl p-3 flex gap-2" style={{ background: "var(--bg)" }}><ShieldCheck size={18} color="var(--primary)" /><p className="text-[11px]" style={{ color: "var(--ink-soft)" }}>Ao confirmar, o Cofrinho cria backup da versão anterior, confere duplicidades novamente e registra o resultado em Atividades.</p></div></> : null}
  </div></div>;
}
