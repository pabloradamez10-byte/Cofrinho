import React, { useState } from "react";
import { Plus, PiggyBank, HelpCircle, Trash2 } from "lucide-react";
import TopBar from "./TopBar";
import { SAVING_CATEGORIES } from "../lib/constants";
import { brl } from "../lib/helpers";

export default function CofrinhoScreen({ data, onAdd, onDelete }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [cat, setCat] = useState(SAVING_CATEGORIES[0].id);
  const [note, setNote] = useState("");

  const sorted = [...data.savings].sort((a, b) => new Date(b.date) - new Date(a.date));
  const total = data.savings.reduce((s, e) => s + e.value, 0);

  const submit = () => {
    const v = parseFloat(value);
    if (!v || v <= 0) return;
    onAdd({ id: Date.now(), value: v, category: cat, note: note.trim(), date: new Date().toISOString() });
    setValue("");
    setNote("");
    setOpen(false);
  };

  return (
    <div className="pb-4">
      <TopBar
        title="🐷 Cofrinho"
        subtitle={`${brl(total)} guardados em ${data.savings.length} registro${data.savings.length === 1 ? "" : "s"}`}
      />
      <div className="px-5">
        <button
          onClick={() => setOpen(true)}
          className="w-full rounded-2xl py-3.5 font-semibold text-sm flex items-center justify-center gap-2 mb-5"
          style={{ background: "var(--primary)", color: "#fff" }}
        >
          <Plus size={18} /> Registrar economia
        </button>

        {sorted.length === 0 ? (
          <div className="text-center py-12">
            <PiggyBank size={36} className="mx-auto mb-3" color="var(--line)" />
            <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
              Nenhuma economia registrada ainda.
              <br />
              Toda decisão pequena conta.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {sorted.map((s) => {
              const Icon = SAVING_CATEGORIES.find((c) => c.id === s.category)?.icon || HelpCircle;
              return (
                <div
                  key={s.id}
                  className="rounded-2xl p-4 flex items-center gap-3"
                  style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "var(--primary-lt)" }}
                  >
                    <Icon size={18} color="var(--primary-dk)" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
                      {s.category}
                    </p>
                    {s.note && (
                      <p className="text-xs truncate" style={{ color: "var(--ink-soft)" }}>
                        {s.note}
                      </p>
                    )}
                    <p className="text-[11px]" style={{ color: "var(--ink-soft)" }}>
                      {new Date(s.date).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <span className="font-display font-semibold text-sm" style={{ color: "var(--primary-dk)" }}>
                    +{brl(s.value)}
                  </span>
                  <button onClick={() => onDelete(s.id)} className="p-1.5 -mr-1">
                    <Trash2 size={15} color="var(--ink-soft)" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-30 flex items-end justify-center"
          style={{ background: "rgba(22,36,29,0.4)" }}
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-t-3xl p-5 pb-7"
            style={{ background: "var(--surface)" }}
          >
            <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: "var(--line)" }} />
            <h3 className="font-display text-xl font-medium mb-4" style={{ color: "var(--ink)" }}>
              Registrar economia
            </h3>

            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--ink-soft)" }}>
              Valor economizado
            </label>
            <div className="relative mt-1.5 mb-4">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold" style={{ color: "var(--ink-soft)" }}>
                R$
              </span>
              <input
                value={value}
                onChange={(e) => setValue(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="0,00"
                inputMode="decimal"
                autoFocus
                className="w-full rounded-2xl border pl-11 pr-4 py-3 text-base outline-none"
                style={{ borderColor: "var(--line)", color: "var(--ink)" }}
              />
            </div>

            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--ink-soft)" }}>
              Categoria
            </label>
            <div className="flex flex-wrap gap-2 mt-1.5 mb-4">
              {SAVING_CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCat(c.id)}
                  className="px-3.5 py-2 rounded-full text-xs font-semibold border"
                  style={{
                    background: cat === c.id ? "var(--primary)" : "var(--surface)",
                    color: cat === c.id ? "#fff" : "var(--ink)",
                    borderColor: cat === c.id ? "var(--primary)" : "var(--line)",
                  }}
                >
                  {c.id}
                </button>
              ))}
            </div>

            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--ink-soft)" }}>
              Observação (opcional)
            </label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex: deixei de comprar café hoje"
              className="w-full rounded-2xl border px-4 py-3 text-sm outline-none mt-1.5 mb-5"
              style={{ borderColor: "var(--line)", color: "var(--ink)" }}
            />

            <button
              onClick={submit}
              className="w-full rounded-2xl py-3.5 font-semibold text-sm"
              style={{ background: "var(--primary)", color: "#fff" }}
            >
              Salvar economia
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

