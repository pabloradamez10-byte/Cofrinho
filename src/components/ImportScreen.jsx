import React, { useState } from "react";
import { AlertCircle, CheckCircle2, FileSearch, ShieldCheck, Upload } from "lucide-react";
import TopBar from "./TopBar";
import { fromCents, parseStatementFile, prepareImportPreview } from "../financial-engine/index.js";
import { brl } from "../lib/helpers";

export default function ImportScreen({ financialData, onBack }) {
  const [accountId, setAccountId] = useState(financialData.accounts.find((account) => account.active !== false)?.id ?? "");
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function inspectFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError("");
    setPreview(null);
    try {
      const content = await file.text();
      const parsed = parseStatementFile(file.name, content);
      const prepared = prepareImportPreview(parsed.rows, { accountId, existingTransactions: financialData.transactions, categories: financialData.categories, fileName: file.name });
      setPreview({ ...prepared, format: parsed.format.toUpperCase(), fileName: file.name });
    } catch (caught) {
      setError(caught.message);
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  }

  return (
    <div className="pb-4">
      <TopBar title="Importar extrato" subtitle="Prévia segura antes de registrar qualquer valor" onBack={onBack} />
      <div className="px-5 space-y-4">
        <section className="rounded-3xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
          <label htmlFor="statement-account" className="text-xs font-semibold uppercase" style={{ color: "var(--ink-soft)" }}>Conta do extrato</label>
          <select id="statement-account" value={accountId} onChange={(event) => { setAccountId(event.target.value); setPreview(null); }} className="w-full rounded-2xl border px-4 py-3 mt-2 bg-white" style={{ borderColor: "var(--line)" }}>{financialData.accounts.filter((account) => account.active !== false).map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select>
          <label className="rounded-2xl p-4 mt-4 flex items-center justify-center gap-2 font-semibold cursor-pointer" style={{ background: "var(--primary)", color: "white" }}><Upload size={19} />{loading ? "Analisando..." : "Selecionar CSV ou OFX"}<input type="file" accept=".csv,.ofx,text/csv,application/x-ofx" onChange={inspectFile} className="sr-only" disabled={loading || !accountId} /></label>
          <p className="text-[11px] mt-3 text-center" style={{ color: "var(--ink-soft)" }}>O arquivo é analisado neste aparelho. Senhas, tokens e números completos de cartão não são solicitados.</p>
        </section>

        {error ? <div role="alert" className="rounded-2xl p-3 flex gap-2" style={{ background: "#FDECEC", color: "var(--accent)" }}><AlertCircle size={18} /><p className="text-xs">{error}</p></div> : null}

        {preview ? <>
          <section className="rounded-3xl p-4" style={{ background: "var(--primary-lt)" }}><div className="flex gap-2 items-center"><FileSearch size={19} color="var(--primary)" /><div><p className="text-sm font-semibold">{preview.fileName}</p><p className="text-[11px]" style={{ color: "var(--ink-soft)" }}>{preview.format} · somente prévia</p></div></div><div className="grid grid-cols-3 gap-2 mt-4 text-center"><div><p className="font-display text-xl font-semibold">{preview.report.total}</p><p className="text-[10px]">Encontrados</p></div><div><p className="font-display text-xl font-semibold" style={{ color: "var(--primary)" }}>{preview.report.ready}</p><p className="text-[10px]">Prontos</p></div><div><p className="font-display text-xl font-semibold" style={{ color: "var(--accent)" }}>{preview.report.duplicates}</p><p className="text-[10px]">Duplicados</p></div></div></section>
          <section className="space-y-2">{preview.candidates.map((item) => <article key={item.transaction.id} className="rounded-2xl p-3 flex gap-3" style={{ background: "var(--surface)", border: "1px solid var(--line)", opacity: item.duplicate ? 0.65 : 1 }}><div className="pt-0.5">{item.duplicate ? <AlertCircle size={18} color="var(--accent)" /> : <CheckCircle2 size={18} color="var(--primary)" />}</div><div className="flex-1 min-w-0"><p className="text-sm font-semibold truncate">{item.transaction.description}</p><p className="text-[10px] mt-1" style={{ color: "var(--ink-soft)" }}>{new Date(`${item.transaction.date}T00:00:00`).toLocaleDateString("pt-BR")} · {item.transaction.categoryId || "sem categoria"}{item.duplicate ? " · possível duplicidade" : ""}</p></div><p className="text-sm font-semibold whitespace-nowrap" style={{ color: item.transaction.type === "income" ? "var(--primary)" : "var(--accent)" }}>{item.transaction.type === "income" ? "+" : "−"}{brl(fromCents(item.transaction.amountCents))}</p></article>)}</section>
          <div className="rounded-2xl p-3 flex gap-2" style={{ background: "var(--bg)" }}><ShieldCheck size={18} color="var(--primary)" /><p className="text-[11px]" style={{ color: "var(--ink-soft)" }}>Nada foi salvo. Na próxima parte, você poderá revisar, corrigir e confirmar os itens antes de registrá-los.</p></div>
        </> : null}
      </div>
    </div>
  );
}
