import React, { useMemo } from "react";
import { Flame, Check, Award } from "lucide-react";
import TopBar from "./TopBar";
import JarProgress from "./JarProgress";
import { CATEGORIES, MISSIONS, MILESTONES } from "../lib/constants";
import { brl, todayStr, dayOfYear } from "../lib/helpers";

export default function HomeScreen({ data, onAddQuick, streak }) {
  const total = useMemo(() => data.savings.reduce((s, e) => s + e.value, 0), [data.savings]);
  const target = data.goal.target;
  const remaining = Math.max(0, target - total);
  const percent = target > 0 ? (total / target) * 100 : 0;
  const cat = CATEGORIES.find((c) => c.id === data.goal.category);

  const today = todayStr();
  const missionIdx = dayOfYear() % MISSIONS.length;
  const mission = MISSIONS[missionIdx];
  const doneToday = data.completedDates.includes(today);

  const estDate = useMemo(() => {
    if (data.savings.length < 2 || remaining <= 0) return null;
    const sorted = [...data.savings].sort((a, b) => new Date(a.date) - new Date(b.date));
    const first = new Date(sorted[0].date);
    const days = Math.max(1, (new Date() - first) / 86400000);
    const ratePerDay = total / days;
    if (ratePerDay <= 0) return null;
    const daysLeft = remaining / ratePerDay;
    const d = new Date();
    d.setDate(d.getDate() + Math.ceil(daysLeft));
    return d;
  }, [data.savings, total, remaining]);

  return (
    <div className="pb-4">
      <TopBar title="🎯 Minha Conquista" />
      <div className="px-5 space-y-4">
        {/* goal card */}
        <div className="rounded-3xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
          <div className="flex gap-4">
            <div
              className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center"
              style={{ background: "var(--primary-lt)" }}
            >
              {data.goal.photo ? (
                <img src={data.goal.photo} className="w-full h-full object-cover" alt={data.goal.name} />
              ) : (
                <span className="text-3xl">{cat?.emoji}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--primary)" }}>
                {cat?.label}
              </span>
              <h2 className="font-display text-xl font-medium truncate mt-0.5" style={{ color: "var(--ink)" }}>
                {data.goal.name}
              </h2>
              <p className="text-xs mt-1" style={{ color: "var(--ink-soft)" }}>
                Meta: {new Date(data.goal.date + "T00:00:00").toLocaleDateString("pt-BR")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-5">
            <JarProgress percent={percent} size={104} />
            <div className="flex-1 space-y-2.5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--ink-soft)" }}>
                  Acumulado
                </p>
                <p className="font-display text-lg font-semibold" style={{ color: "var(--primary-dk)" }}>
                  {brl(total)}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--ink-soft)" }}>
                  Falta
                </p>
                <p className="font-display text-lg font-semibold" style={{ color: "var(--ink)" }}>
                  {brl(remaining)}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 flex items-center justify-between text-xs" style={{ borderTop: "1px solid var(--line)" }}>
            <span style={{ color: "var(--ink-soft)" }}>
              Objetivo: <b style={{ color: "var(--ink)" }}>{brl(target)}</b>
            </span>
            {estDate && (
              <span style={{ color: "var(--ink-soft)" }}>
                Previsão: <b style={{ color: "var(--ink)" }}>{estDate.toLocaleDateString("pt-BR")}</b>
              </span>
            )}
          </div>
        </div>

        {/* streak */}
        <div className="rounded-3xl px-5 py-4 flex items-center gap-3" style={{ background: "var(--accent-lt)" }}>
          <Flame size={26} color="var(--accent)" fill="var(--accent)" />
          <div>
            <p className="font-display text-lg font-semibold" style={{ color: "var(--ink)" }}>
              {streak} {streak === 1 ? "dia seguido" : "dias seguidos"}
            </p>
            <p className="text-xs" style={{ color: "var(--ink-soft)" }}>
              Mantenha o hábito vivo todos os dias.
            </p>
          </div>
        </div>

        {/* mission */}
        <div className="rounded-3xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
          <p className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--primary)" }}>
            Missão do dia
          </p>
          <p className="font-display text-lg font-medium mb-4" style={{ color: "var(--ink)" }}>
            {mission}
          </p>
          <button
            onClick={() => onAddQuick(today)}
            disabled={doneToday}
            className="w-full rounded-2xl py-3 font-semibold text-sm flex items-center justify-center gap-2"
            style={{
              background: doneToday ? "var(--primary-lt)" : "var(--primary)",
              color: doneToday ? "var(--primary-dk)" : "#fff",
            }}
          >
            {doneToday ? (
              <>
                <Check size={16} /> Missão concluída
              </>
            ) : (
              "Concluir missão"
            )}
          </button>
        </div>

        {/* milestones strip */}
        <div className="grid grid-cols-4 gap-2">
          {MILESTONES.map((m) => {
            const reached = percent >= m;
            return (
              <div
                key={m}
                className="rounded-2xl py-3 flex flex-col items-center gap-1"
                style={{ background: reached ? "var(--gold-lt)" : "var(--surface)", border: "1px solid var(--line)" }}
              >
                <Award size={18} color={reached ? "var(--gold)" : "var(--line)"} fill={reached ? "var(--gold)" : "none"} />
                <span className="text-xs font-semibold" style={{ color: reached ? "var(--ink)" : "var(--ink-soft)" }}>
                  {m}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

