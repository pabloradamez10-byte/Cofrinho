import React, { useState, useRef } from "react";
import { Camera, ArrowRight } from "lucide-react";
import { CATEGORIES } from "../lib/constants";
import { resizeImage } from "../lib/helpers";

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [category, setCategory] = useState(null);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [date, setDate] = useState("");
  const [photo, setPhoto] = useState(null);
  const fileRef = useRef(null);

  const steps = ["Conquista", "Nome", "Valor", "Data", "Foto"];

  const canNext = [
    !!category,
    name.trim().length > 0,
    parseFloat(target) > 0,
    !!date,
    true,
  ][step];

  const handlePhoto = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const dataUrl = await resizeImage(f);
    setPhoto(dataUrl);
  };

  const finish = () => {
    onComplete({
      category,
      name: name.trim(),
      target: parseFloat(target),
      date,
      photo,
    });
  };

  return (
    <div className="min-h-screen font-body" style={{ background: "var(--bg)" }}>
      <div className="max-w-md mx-auto px-5 pt-10 pb-8 min-h-screen flex flex-col">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">🐷</span>
          <span className="font-display font-semibold text-xl" style={{ color: "var(--ink)" }}>
            Cofrinho
          </span>
        </div>
        <p className="text-sm mb-7" style={{ color: "var(--ink-soft)" }}>
          Seu futuro financeiro começa com uma decisão por dia.
        </p>

        {/* progress dots */}
        <div className="flex gap-1.5 mb-8">
          {steps.map((_, i) => (
            <div
              key={i}
              className="h-1.5 rounded-full flex-1 transition-all"
              style={{ background: i <= step ? "var(--primary)" : "var(--line)" }}
            />
          ))}
        </div>

        <div className="flex-1">
          {step === 0 && (
            <div>
              <h2 className="font-display text-2xl font-medium mb-1" style={{ color: "var(--ink)" }}>
                Qual é sua conquista?
              </h2>
              <p className="text-sm mb-6" style={{ color: "var(--ink-soft)" }}>
                Escolha o objetivo que vai guiar suas economias.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCategory(c.id)}
                    className="rounded-2xl p-4 text-left border transition-all active:scale-[0.97]"
                    style={{
                      background: category === c.id ? "var(--primary-lt)" : "var(--surface)",
                      borderColor: category === c.id ? "var(--primary)" : "var(--line)",
                    }}
                  >
                    <div className="text-2xl mb-2">{c.emoji}</div>
                    <div className="text-sm font-semibold leading-tight" style={{ color: "var(--ink)" }}>
                      {c.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 className="font-display text-2xl font-medium mb-1" style={{ color: "var(--ink)" }}>
                Dê um nome à sua conquista
              </h2>
              <p className="text-sm mb-6" style={{ color: "var(--ink-soft)" }}>
                Ex: Honda CG 160 Titan 2024, Entrada da casa, Liberdade financeira
              </p>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome da conquista"
                autoFocus
                className="w-full rounded-2xl border px-4 py-3.5 text-base font-body outline-none"
                style={{ borderColor: "var(--line)", background: "var(--surface)", color: "var(--ink)" }}
              />
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="font-display text-2xl font-medium mb-1" style={{ color: "var(--ink)" }}>
                Quanto você precisa?
              </h2>
              <p className="text-sm mb-6" style={{ color: "var(--ink-soft)" }}>
                Valor total necessário, em reais.
              </p>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold" style={{ color: "var(--ink-soft)" }}>
                  R$
                </span>
                <input
                  value={target}
                  onChange={(e) => setTarget(e.target.value.replace(/[^0-9.]/g, ""))}
                  placeholder="10000"
                  inputMode="decimal"
                  autoFocus
                  className="w-full rounded-2xl border pl-11 pr-4 py-3.5 text-base font-body outline-none"
                  style={{ borderColor: "var(--line)", background: "var(--surface)", color: "var(--ink)" }}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="font-display text-2xl font-medium mb-1" style={{ color: "var(--ink)" }}>
                Quando você quer chegar lá?
              </h2>
              <p className="text-sm mb-6" style={{ color: "var(--ink-soft)" }}>
                Escolha a data que faz sentido pra você.
              </p>
              <input
                value={date}
                onChange={(e) => setDate(e.target.value)}
                type="date"
                autoFocus
                className="w-full rounded-2xl border px-4 py-3.5 text-base font-body outline-none"
                style={{ borderColor: "var(--line)", background: "var(--surface)", color: "var(--ink)" }}
              />
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 className="font-display text-2xl font-medium mb-1" style={{ color: "var(--ink)" }}>
                Coloque um rosto na sua meta
              </h2>
              <p className="text-sm mb-6" style={{ color: "var(--ink-soft)" }}>
                Uma foto da sua conquista (opcional, mas ajuda a manter o foco).
              </p>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full aspect-[4/3] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 overflow-hidden"
                style={{ borderColor: "var(--line)", background: "var(--surface)" }}
              >
                {photo ? (
                  <img src={photo} alt="conquista" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <Camera size={28} color="var(--ink-soft)" />
                    <span className="text-sm font-medium" style={{ color: "var(--ink-soft)" }}>
                      Adicionar foto
                    </span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-8">
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="px-5 py-3.5 rounded-2xl font-semibold text-sm"
              style={{ color: "var(--ink-soft)" }}
            >
              Voltar
            </button>
          )}
          <button
            onClick={() => (step === steps.length - 1 ? finish() : setStep((s) => s + 1))}
            disabled={!canNext}
            className="flex-1 rounded-2xl py-3.5 font-semibold text-sm flex items-center justify-center gap-2 transition-opacity"
            style={{ background: "var(--primary)", color: "#fff", opacity: canNext ? 1 : 0.4 }}
          >
            {step === steps.length - 1 ? "Começar minha jornada" : "Continuar"}
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

