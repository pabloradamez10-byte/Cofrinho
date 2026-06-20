
import React, { useState, useEffect, useMemo, useCallback } from "react";

import Onboarding from "./components/Onboarding";
import HomeScreen from "./components/HomeScreen";
import CofrinhoScreen from "./components/CofrinhoScreen";
import SimuladorScreen from "./components/SimuladorScreen";
import AcademiaScreen from "./components/AcademiaScreen";
import DashboardScreen from "./components/DashboardScreen";
import CelebrationModal from "./components/CelebrationModal";
import Toast from "./components/Toast";
import BottomNav from "./components/BottomNav";

import { MILESTONES, MOTIVATION } from "./lib/constants";
import { loadData, saveData } from "./lib/helpers";

export default function App() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("home");
  const [celebration, setCelebration] = useState(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const loaded = loadData();
    if (loaded) setData(loaded);
  }, []);

  useEffect(() => {
    if (data) saveData(data);
  }, [data]);

  const completeOnboarding = (goal) => {
    setData({
      goal,
      savings: [],
      completedDates: [],
      milestonesShown: {},
    });
  };

  const checkMilestones = useCallback((newSavings, target, milestonesShown) => {
    const total = newSavings.reduce((s, e) => s + e.value, 0);
    const pct = target > 0 ? (total / target) * 100 : 0;
    const shown = { ...milestonesShown };
    let toCelebrate = null;
    for (const m of MILESTONES) {
      if (pct >= m && !shown[m]) {
        shown[m] = true;
        toCelebrate = m;
      }
    }
    return { shown, toCelebrate };
  }, []);

  const addSaving = (entry) => {
    setData((prev) => {
      const savings = [...prev.savings, entry];
      const { shown, toCelebrate } = checkMilestones(savings, prev.goal.target, prev.milestonesShown);
      if (toCelebrate) setTimeout(() => setCelebration(toCelebrate), 350);
      else setToast(MOTIVATION[Math.floor(Math.random() * MOTIVATION.length)]);
      return { ...prev, savings, milestonesShown: shown };
    });
  };

  const deleteSaving = (id) => {
    setData((prev) => ({ ...prev, savings: prev.savings.filter((s) => s.id !== id) }));
  };

  const completeMission = (date) => {
    setData((prev) => {
      if (prev.completedDates.includes(date)) return prev;
      const completedDates = [...prev.completedDates, date];
      return { ...prev, completedDates };
    });
    setToast("Missão concluída. Você está construindo um hábito forte.");
  };

  const streak = useMemo(() => {
    if (!data) return 0;
    const set = new Set(data.completedDates);
    let count = 0;
    let d = new Date();
    while (set.has(d.toISOString().slice(0, 10))) {
      count++;
      d.setDate(d.getDate() - 1);
    }
    return count;
  }, [data]);

  if (!data) {
    return <Onboarding onComplete={completeOnboarding} />;
  }

  return (
    <div className="font-body min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="max-w-md mx-auto min-h-screen relative" style={{ background: "var(--bg)" }}>
        {tab === "home" && <HomeScreen data={data} onAddQuick={completeMission} streak={streak} />}
        {tab === "cofrinho" && <CofrinhoScreen data={data} onAdd={addSaving} onDelete={deleteSaving} />}
        {tab === "simulador" && <SimuladorScreen />}
        {tab === "academia" && <AcademiaScreen />}
        {tab === "dashboard" && <DashboardScreen data={data} streak={streak} />}
        <div style={{ height: 84 }} />
      </div>
      <BottomNav tab={tab} setTab={setTab} />
      <Toast text={toast} onDone={() => setToast("")} />
      <CelebrationModal milestone={celebration} onClose={() => setCelebration(null)} />
    </div>
  );
}
