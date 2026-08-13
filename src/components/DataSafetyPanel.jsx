import React, { useRef, useState } from "react";
import { Download, Upload, RotateCcw, ShieldCheck } from "lucide-react";
import { exportBackup, importBackup, restoreAutomaticBackup } from "../lib/helpers";

export default function DataSafetyPanel({ data, onRestore }) {
  const inputRef = useRef(null);
  const [message, setMessage] = useState("");

  const download = () => {
    const blob = new Blob([exportBackup(data)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `cofrinho-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage("Backup exportado com sucesso.");
  };

  const upload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const restored = importBackup(await file.text());
      if (!window.confirm("Restaurar este backup? O estado atual ficará no backup automático.")) return;
      onRestore(restored);
      setMessage("Backup restaurado com sucesso.");
    } catch (error) {
      setMessage(error.message);
    }
  };

  const restoreLast = () => {
    if (!window.confirm("Voltar para o último backup automático?")) return;
    try {
      onRestore(restoreAutomaticBackup());
      setMessage("Último backup automático restaurado.");
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <div className="mt-4 rounded-3xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
      <div className="flex items-center gap-2 mb-1">
        <ShieldCheck size={19} color="var(--primary)" />
        <h3 className="font-display font-semibold" style={{ color: "var(--ink)" }}>Proteção dos dados</h3>
      </div>
      <p className="text-xs mb-4" style={{ color: "var(--ink-soft)" }}>
        Exporte uma cópia antes de trocar de aparelho ou limpar o navegador.
      </p>
      <div className="grid grid-cols-1 gap-2">
        <button onClick={download} className="rounded-2xl py-3 text-sm font-semibold flex justify-center items-center gap-2" style={{ background: "var(--primary)", color: "#fff" }}>
          <Download size={16} /> Exportar backup
        </button>
        <button onClick={() => inputRef.current?.click()} className="rounded-2xl py-3 text-sm font-semibold flex justify-center items-center gap-2 border" style={{ borderColor: "var(--line)", color: "var(--ink)" }}>
          <Upload size={16} /> Restaurar arquivo
        </button>
        <button onClick={restoreLast} className="rounded-2xl py-3 text-sm font-semibold flex justify-center items-center gap-2" style={{ color: "var(--ink-soft)" }}>
          <RotateCcw size={16} /> Recuperar versão anterior
        </button>
      </div>
      <input ref={inputRef} type="file" accept="application/json,.json" className="hidden" onChange={upload} />
      {message && <p className="text-xs mt-3" role="status" style={{ color: "var(--primary-dk)" }}>{message}</p>}
    </div>
  );
}
