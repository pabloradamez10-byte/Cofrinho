
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";

import Onboarding from "./components/Onboarding";
import FinancialHomeScreen from "./components/FinancialHomeScreen";
import AccountsScreen from "./components/AccountsScreen";
import AccountDetailScreen from "./components/AccountDetailScreen";
import CardsScreen from "./components/CardsScreen";
import CardDetailScreen from "./components/CardDetailScreen";
import ActivitiesScreen from "./components/ActivitiesScreen";
import GoalsOverviewScreen from "./components/GoalsOverviewScreen";
import MoreScreen from "./components/MoreScreen";
import PlanningScreen from "./components/PlanningScreen";
import SimuladorScreen from "./components/SimuladorScreen";
import AcademiaScreen from "./components/AcademiaScreen";
import DashboardScreen from "./components/DashboardScreen";
import CelebrationModal from "./components/CelebrationModal";
import Toast from "./components/Toast";
import BottomNav from "./components/BottomNav";

import { MILESTONES, MOTIVATION } from "./lib/constants";
import { loadData, saveData } from "./lib/helpers";
import { initializeFinancialData } from "./financial-engine/index.js";

export default function App() {
  const skipNextSave = useRef(false);
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("home");
  const [celebration, setCelebration] = useState(null);
  const [toast, setToast] = useState("");
  const [saveError, setSaveError] = useState("");
  const [deletedSaving, setDeletedSaving] = useState(null);
  const [financialData, setFinancialData] = useState(null);
  const [financialError, setFinancialError] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [selectedCardId, setSelectedCardId] = useState(null);

  useEffect(() => {
    const loaded = loadData();
    if (loaded) {
      skipNextSave.current = true;
      setData(loaded);
    }
  }, []);

  useEffect(() => {
    if (data) {
      if (skipNextSave.current) {
        skipNextSave.current = false;
        return;
      }
      const result = saveData(data);
      setSaveError(result.ok ? "" : "Não foi possível salvar seus dados. Exporte um backup antes de continuar.");
    }
  }, [data]);

  useEffect(() => {
    if (!data || financialData) return;
    const result = initializeFinancialData(data);
    if (result.ok) {
      setFinancialData(result.data);
      setFinancialError("");
    } else {
      setFinancialError(`O motor financeiro não foi iniciado: ${result.error}`);
    }
  }, [data, financialData]);

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
    setData((prev) => {
      const removed = prev.savings.find((s) => s.id === id);
      if (!removed) return prev;
      setDeletedSaving(removed);
      return { ...prev, savings: prev.savings.filter((s) => s.id !== id) };
    });
  };

  const undoDelete = () => {
    if (!deletedSaving) return;
    setData((prev) => ({ ...prev, savings: [...prev.savings, deletedSaving] }));
    setDeletedSaving(null);
    setToast("Economia restaurada.");
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

  const financialReady = financialData && !financialError;

  return (
    <div className="font-body min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="max-w-md mx-auto min-h-screen relative" style={{ background: "var(--bg)" }}>
        {financialError && <div role="alert" className="mx-5 mt-4 rounded-2xl p-3 text-sm" style={{ background: "#FDECEC", color: "#9B1C1C" }}>{financialError} Seus dados anteriores continuam preservados.</div>}
        {tab === "home" && financialReady && <FinancialHomeScreen financialData={financialData} onOpenAccounts={() => setTab("accounts")} onOpenActivities={() => setTab("activities")} />}
        {tab === "accounts" && financialReady && (selectedAccountId
          ? <AccountDetailScreen accountId={selectedAccountId} financialData={financialData} onBack={() => setSelectedAccountId(null)} />
          : <AccountsScreen financialData={financialData} onSelectAccount={setSelectedAccountId} onOpenCards={() => setTab("cards")} />)}
        {tab === "cards" && financialReady && (selectedCardId
          ? <CardDetailScreen cardId={selectedCardId} financialData={financialData} onBack={() => setSelectedCardId(null)} />
          : <CardsScreen financialData={financialData} onBack={() => setTab("accounts")} onSelectCard={setSelectedCardId} />)}
        {tab === "activities" && financialReady && <ActivitiesScreen financialData={financialData} />}
        {tab === "goals" && financialReady && <GoalsOverviewScreen financialData={financialData} />}
        {tab === "more" && <MoreScreen onOpen={setTab} />}
        {tab === "planning" && financialReady && <PlanningScreen financialData={financialData} onBack={() => setTab("more")} />}
        {saveError && <div role="alert" className="mx-5 mt-4 rounded-2xl p-3 text-sm" style={{ background: "#FDECEC", color: "#9B1C1C" }}>{saveError}</div>}
        {tab === "simulador" && <SimuladorScreen />}
        {tab === "academia" && <AcademiaScreen />}
        {tab === "dashboard" && <DashboardScreen data={data} streak={streak} onRestore={(restored) => { setData(restored); setDeletedSaving(null); }} />}
        <div style={{ height: 84 }} />
      </div>
      <BottomNav tab={tab === "cards" ? "accounts" : tab} setTab={(nextTab) => { if (nextTab !== "accounts") setSelectedAccountId(null); setSelectedCardId(null); setTab(nextTab); }} />
      <Toast text={toast} onDone={() => setToast("")} />
      <CelebrationModal milestone={celebration} onClose={() => setCelebration(null)} />
    </div>
  );
}
