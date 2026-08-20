import React, { useEffect, useState } from "react";
import { Check, Link2, ShieldCheck, X } from "lucide-react";
import TopBar from "./TopBar";
import { createAtlasPairing, createNativeAtlasPairing, getNativeAtlasConnectionStatus, fromCents, loadAtlasRequests } from "../financial-engine/index.js";
import { brl } from "../lib/helpers";

export default function AtlasRequestsScreen({ onBack, onDecide }) {
  const [requests, setRequests] = useState(() => loadAtlasRequests());
  const [pairing, setPairing] = useState(null);
  const [message, setMessage] = useState("");
  const [connected, setConnected] = useState(false);
  useEffect(() => { const refresh = () => setRequests(loadAtlasRequests()); window.addEventListener("cofrinho:atlas-requests-changed", refresh); return () => window.removeEventListener("cofrinho:atlas-requests-changed", refresh); }, []);
  useEffect(() => {
    const refreshConnection = () => getNativeAtlasConnectionStatus().then((result) => setConnected(Boolean(result?.connected))).catch(() => setConnected(false));
    refreshConnection();
    document.addEventListener("visibilitychange", refreshConnection);
    return () => document.removeEventListener("visibilitychange", refreshConnection);
  }, []);
  async function generateCode() { setMessage(""); try { setPairing(await createNativeAtlasPairing() || await createAtlasPairing()); } catch (error) { setMessage(error.message); } }
  function decide(id, decision) { const result = onDecide(id, decision); setMessage(result.ok ? (decision === "approve" ? "Pedido aprovado e registrado." : "Pedido rejeitado e registrado.") : result.error); setRequests(loadAtlasRequests()); }
  const pending = requests.filter((request) => request.status === "awaiting_confirmation");
  return <div className="pb-4"><TopBar title="Pedidos do Atlas" subtitle="Nada é alterado sem sua confirmação" onBack={onBack} /><div className="px-5 space-y-4">
    <section className="rounded-3xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}><div className="flex gap-2 items-center"><Link2 size={20} color="var(--primary)" /><h2 className="font-display text-xl font-semibold">Conectar Atlas Pocket</h2></div><p className="text-xs mt-2 font-semibold" style={{ color: connected ? "var(--primary)" : "var(--ink-soft)" }}>{connected ? "Atlas Pocket conectado neste aparelho." : "Ainda não conectado."}</p><p className="text-xs mt-2" style={{ color: "var(--ink-soft)" }}>Gere um código temporário e informe no Atlas Pocket. Ele expira em 10 minutos e funciona uma única vez.</p>{pairing ? <div className="rounded-2xl p-4 mt-4 text-center" style={{ background: "var(--primary-lt)" }}><p className="text-[10px] uppercase" style={{ color: "var(--ink-soft)" }}>Código de pareamento</p><p className="font-display text-3xl font-semibold tracking-[0.25em] mt-1">{pairing.code}</p></div> : <button onClick={generateCode} className="w-full rounded-2xl p-3 mt-4 font-semibold" style={{ background: "var(--primary)", color: "white" }}>Gerar código temporário</button>}</section>
    {message ? <div role="status" className="rounded-2xl p-3 text-xs" style={{ background: "var(--primary-lt)" }}>{message}</div> : null}
    <section><div className="flex justify-between items-center mb-3"><h2 className="font-display text-xl font-semibold">Aguardando decisão</h2><span className="text-xs">{pending.length}</span></div>{pending.length === 0 ? <div className="rounded-3xl p-5 text-center" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}><ShieldCheck className="mx-auto" color="var(--primary)" /><p className="font-semibold mt-2">Nenhum pedido pendente</p><p className="text-xs mt-1" style={{ color: "var(--ink-soft)" }}>As propostas enviadas pelo Atlas aparecerão aqui.</p></div> : <div className="space-y-3">{pending.map((request) => { const transaction=request.payload.transaction; return <article key={request.requestId} className="rounded-3xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}><p className="text-[10px] uppercase" style={{ color: "var(--ink-soft)" }}>Atlas propõe registrar</p><div className="flex justify-between gap-3 mt-2"><div><p className="font-semibold">{transaction.description}</p><p className="text-xs mt-1" style={{ color: "var(--ink-soft)" }}>{transaction.type === "income" ? "Entrada" : transaction.type === "expense" ? "Saída" : "Transferência"} · {transaction.date}</p></div><p className="font-display font-semibold">{brl(fromCents(transaction.amountCents))}</p></div><div className="grid grid-cols-2 gap-2 mt-4"><button onClick={() => decide(request.requestId, "reject")} className="rounded-2xl p-3 flex justify-center gap-2 font-semibold" style={{ border: "1px solid var(--line)" }}><X size={18} />Rejeitar</button><button onClick={() => decide(request.requestId, "approve")} className="rounded-2xl p-3 flex justify-center gap-2 font-semibold" style={{ background: "var(--primary)", color: "white" }}><Check size={18} />Aprovar</button></div></article>; })}</div>}</section>
    <div className="rounded-2xl p-3 flex gap-2" style={{ background: "var(--bg)" }}><ShieldCheck size={18} color="var(--primary)" /><p className="text-[11px]" style={{ color: "var(--ink-soft)" }}>A API local não possui ações para PIX, pagamento, contratação de empréstimo, movimentação bancária ou exclusão de dados.</p></div>
  </div></div>;
}
