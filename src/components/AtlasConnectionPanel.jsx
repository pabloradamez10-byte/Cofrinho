import React from "react";
import { Link2, ShieldCheck } from "lucide-react";

export default function AtlasConnectionPanel({ pairing, onGenerate }) {
  return <section className="rounded-3xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "var(--primary-lt)" }}><Link2 size={20} color="var(--primary)" /></div>
      <div className="flex-1"><p className="font-semibold text-sm">Conectar ao Atlas Pocket</p><p className="text-xs mt-0.5" style={{ color: "var(--ink-soft)" }}>Código temporário; nenhum lançamento ocorre sem sua confirmação.</p></div>
    </div>
    {pairing ? <div className="mt-4 text-center"><p className="text-xs" style={{ color: "var(--ink-soft)" }}>Digite este código no Atlas</p><p className="text-3xl font-bold tracking-[0.25em] mt-1" aria-label={`Código ${pairing.code}`}>{pairing.code}</p><p className="text-xs mt-2 flex items-center justify-center gap-1" style={{ color: "var(--ink-soft)" }}><ShieldCheck size={14} /> Expira em 5 minutos e funciona uma vez</p></div> : null}
    <button onClick={onGenerate} className="w-full rounded-2xl py-3 mt-4 font-semibold text-sm" style={{ background: "var(--primary)", color: "white" }}>{pairing ? "Gerar outro código" : "Gerar código de conexão"}</button>
  </section>;
}
