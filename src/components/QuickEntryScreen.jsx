import React, { useMemo, useState } from "react";
import { ArrowDownCircle, ArrowLeftRight, ArrowUpCircle } from "lucide-react";
import TopBar from "./TopBar";
import { toCents } from "../financial-engine/index.js";

const TYPES = [
  { id: "expense", label: "Saída", icon: ArrowDownCircle },
  { id: "income", label: "Entrada", icon: ArrowUpCircle },
  { id: "transfer", label: "Transferência", icon: ArrowLeftRight },
];
const money = (value) => toCents(Number(String(value).replace(/\./g, "").replace(",", ".")));

export default function QuickEntryScreen({ financialData, onBack, onSave }) {
  const accounts = useMemo(() => financialData.accounts.filter((item) => item.active !== false), [financialData]);
  const [form, setForm] = useState({ type: "expense", description: "", amount: "", date: new Date().toISOString().slice(0, 10), sourceAccountId: accounts[0]?.id ?? "", destinationAccountId: accounts[0]?.id ?? "", categoryId: "outros" });
  const [error, setError] = useState("");
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const categories = financialData.categories.filter((item) => item.active !== false && [form.type, "both"].includes(item.kind));

  function submit(event) {
    event.preventDefault(); setError("");
    try {
      const result = onSave({
        type: form.type, description: form.description, amountCents: money(form.amount), date: form.date,
        categoryId: form.type === "transfer" ? "outros" : form.categoryId,
        sourceAccountId: form.type === "income" ? null : form.sourceAccountId,
        destinationAccountId: form.type === "expense" ? null : form.destinationAccountId,
      });
      if (!result.ok) throw new Error(result.error);
      setForm((current) => ({ ...current, description: "", amount: "" }));
    } catch (caught) { setError(caught.message); }
  }

  return <div className="pb-4"><TopBar title="Nova movimentação" subtitle="Entrada, saída ou transferência" onBack={onBack} /><form onSubmit={submit} className="px-5 space-y-4">
    <div className="grid grid-cols-3 gap-2">{TYPES.map((type) => <button type="button" key={type.id} onClick={() => update("type", type.id)} className="rounded-2xl p-3 flex flex-col items-center gap-1 text-xs font-semibold" style={{ background: form.type === type.id ? "var(--primary)" : "var(--surface)", color: form.type === type.id ? "white" : "var(--ink)", border: "1px solid var(--line)" }}><type.icon size={20} />{type.label}</button>)}</div>
    <div className="rounded-3xl p-4 space-y-3" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
      <label className="block text-xs font-semibold">Descrição<input required value={form.description} onChange={(event) => update("description", event.target.value)} className="w-full rounded-xl border px-3 py-3 mt-1" placeholder="Ex.: Supermercado" /></label>
      <div className="grid grid-cols-2 gap-3"><label className="text-xs font-semibold">Valor<input required inputMode="decimal" value={form.amount} onChange={(event) => update("amount", event.target.value)} className="w-full rounded-xl border px-3 py-3 mt-1" placeholder="0,00" /></label><label className="text-xs font-semibold">Data<input required type="date" value={form.date} onChange={(event) => update("date", event.target.value)} className="w-full rounded-xl border px-3 py-3 mt-1" /></label></div>
      {form.type !== "income" && <label className="block text-xs font-semibold">Conta de origem<select value={form.sourceAccountId} onChange={(event) => update("sourceAccountId", event.target.value)} className="w-full rounded-xl border px-3 py-3 mt-1">{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>}
      {form.type !== "expense" && <label className="block text-xs font-semibold">Conta de destino<select value={form.destinationAccountId} onChange={(event) => update("destinationAccountId", event.target.value)} className="w-full rounded-xl border px-3 py-3 mt-1">{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>}
      {form.type !== "transfer" && <label className="block text-xs font-semibold">Categoria<select value={form.categoryId} onChange={(event) => update("categoryId", event.target.value)} className="w-full rounded-xl border px-3 py-3 mt-1">{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>}
    </div>
    {error && <p role="alert" className="rounded-2xl p-3 text-xs" style={{ background: "#FDECEC", color: "var(--accent)" }}>{error}</p>}
    <button className="w-full rounded-2xl p-4 font-semibold" style={{ background: "var(--primary)", color: "white" }}>Registrar movimentação</button>
  </form></div>;
}
