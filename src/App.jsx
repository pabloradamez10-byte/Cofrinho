
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
import ImportScreen from "./components/ImportScreen";
import QuickEntryScreen from "./components/QuickEntryScreen";
import FinanceManagerScreen from "./components/FinanceManagerScreen";
import FinancialAgendaScreen from "./components/FinancialAgendaScreen";
import PurchaseDecisionScreen from "./components/PurchaseDecisionScreen";
import FinancialBackupScreen from "./components/FinancialBackupScreen";
import SimuladorScreen from "./components/SimuladorScreen";
import AcademiaScreen from "./components/AcademiaScreen";
import DashboardScreen from "./components/DashboardScreen";
import CelebrationModal from "./components/CelebrationModal";
import Toast from "./components/Toast";
import BottomNav from "./components/BottomNav";
import { createCofrinhoLocalApi, installCofrinhoLocalApi } from "./atlas-bridge/local-api.js";

import { MILESTONES, MOTIVATION } from "./lib/constants";
import { loadData, saveData } from "./lib/helpers";
import { commitImportPreview, initializeFinancialData, restoreFinancialBackup, saveAccount, saveCardPurchase, saveCreditCard, saveDebt, saveFinancialData, saveRecurringEntry, saveTransaction, settleFinancialAlert, undoFinancialTransaction } from "./financial-engine/index.js";

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
  const [atlasPairing, setAtlasPairing] = useState(null);
  const [atlasProposal, setAtlasProposal] = useState(null);
  const financialDataRef = useRef(null);
  const atlasApiRef = useRef(null);

  useEffect(() => { financialDataRef.current = financialData; }, [financialData]);

  useEffect(() => {
    const api = createCofrinhoLocalApi({
      getData: () => financialDataRef.current,
      commitData: (nextData) => { financialDataRef.current = nextData; setFinancialData(nextData); },
      onProposal: setAtlasProposal,
    });
    atlasApiRef.current = api;
    return installCofrinhoLocalApi(api);
  }, []);

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

  const confirmStatementImport = (candidates, metadata) => {
    try {
      const committed = commitImportPreview(financialData, candidates, metadata);
      const saved = saveFinancialData(committed.data);
      if (!saved.ok) return { ok: false, error: saved.error };
      setFinancialData(saved.data);
      return { ok: true, report: committed.report };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  };

  const commitFinancialOperation = (operation, successMessage) => {
    try {
      const nextData = operation(financialData);
      const saved = saveFinancialData(nextData);
      if (!saved.ok) return { ok: false, error: saved.error };
      setFinancialData(saved.data);
      setToast(successMessage);
      return { ok: true, data: saved.data };
    } catch (error) { return { ok: false, error: error.message }; }
  };

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
        {tab === "activities" && financialReady && <ActivitiesScreen financialData={financialData} onUndo={(transactionId) => commitFinancialOperation((current) => undoFinancialTransaction(current, transactionId), "Movimentação desfeita.")} />}
        {tab === "goals" && financialReady && <GoalsOverviewScreen financialData={financialData} />}
        {tab === "more" && <MoreScreen onOpen={setTab} atlasPairing={atlasPairing} onGenerateAtlasPairing={() => setAtlasPairing(atlasApiRef.current.generatePairingCode())} />}
        {tab === "planning" && financialReady && <PlanningScreen financialData={financialData} onBack={() => setTab("more")} />}
        {tab === "import" && financialReady && <ImportScreen financialData={financialData} onBack={() => setTab("more")} onConfirm={confirmStatementImport} />}
        {tab === "entry" && financialReady && <QuickEntryScreen financialData={financialData} onBack={() => setTab("more")} onSave={(input) => commitFinancialOperation((current) => saveTransaction(current, input), "Movimentação registrada.")} />}
        {tab === "manage" && financialReady && <FinanceManagerScreen financialData={financialData} onBack={() => setTab("more")}
          onSaveAccount={(input) => commitFinancialOperation((current) => saveAccount(current, input), "Conta salva.")}
          onSaveCard={(input) => commitFinancialOperation((current) => saveCreditCard(current, input), "Cartão salvo.")}
          onSavePurchase={(input) => commitFinancialOperation((current) => saveCardPurchase(current, input), "Compra registrada.")}
          onSaveRecurring={(input) => commitFinancialOperation((current) => saveRecurringEntry(current, input), "Recorrência salva.")}
          onSaveDebt={(input) => commitFinancialOperation((current) => saveDebt(current, input), "Dívida salva.")} />}
        {tab === "agenda" && financialReady && <FinancialAgendaScreen financialData={financialData} onBack={() => setTab("more")} onSettle={(alert, accountId) => commitFinancialOperation((current) => settleFinancialAlert(current, alert, accountId), alert.type === "income" ? "Recebimento confirmado." : "Pagamento confirmado.")} />}
        {tab === "decision" && financialReady && <PurchaseDecisionScreen financialData={financialData} onBack={() => setTab("more")} />}
        {tab === "financial-backup" && financialReady && <FinancialBackupScreen financialData={financialData} onBack={() => setTab("more")}
          onImport={(restored) => { const saved = saveFinancialData(restored); if (saved.ok) setFinancialData(saved.data); return saved; }}
          onRestoreAutomatic={() => commitFinancialOperation(() => restoreFinancialBackup(), "Versão financeira anterior restaurada.")} />}
        {saveError && <div role="alert" className="mx-5 mt-4 rounded-2xl p-3 text-sm" style={{ background: "#FDECEC", color: "#9B1C1C" }}>{saveError}</div>}
        {tab === "simulador" && financialReady && <SimuladorScreen financialData={financialData} />}
        {tab === "academia" && <AcademiaScreen />}
        {tab === "dashboard" && <DashboardScreen data={data} streak={streak} onRestore={(restored) => { setData(restored); setDeletedSaving(null); }} />}
        <div style={{ height: 84 }} />
      </div>
      <BottomNav tab={tab === "cards" ? "accounts" : tab} setTab={(nextTab) => { if (nextTab !== "accounts") setSelectedAccountId(null); setSelectedCardId(null); setTab(nextTab); }} />
      <Toast text={toast} onDone={() => setToast("")} />
      <CelebrationModal milestone={celebration} onClose={() => setCelebration(null)} />
      {atlasProposal && <div className="fixed inset-0 z-50 flex items-end justify-center p-4" style={{ background: "rgba(0,0,0,.55)" }}><div className="w-full max-w-md rounded-3xl p-5" style={{ background: "var(--surface)" }}><p className="font-bold text-lg">Confirmar lançamento do Atlas?</p><p className="mt-3">{atlasProposal.transaction.description}</p><p className="text-2xl font-bold mt-1">R$ {(atlasProposal.transaction.amountCents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p><p className="text-xs mt-3" style={{ color: "var(--ink-soft)" }}>Nada será alterado antes da sua confirmação.</p><div className="grid grid-cols-2 gap-3 mt-5"><button className="rounded-2xl py-3" style={{ border: "1px solid var(--line)" }} onClick={() => { atlasApiRef.current.reject(atlasProposal.proposalId); setAtlasProposal(null); }}>Recusar</button><button className="rounded-2xl py-3 font-semibold" style={{ background: "var(--primary)", color: "white" }} onClick={() => { atlasApiRef.current.confirm(atlasProposal.proposalId); setAtlasProposal(null); setToast("Lançamento do Atlas confirmado e salvo."); }}>Confirmar</button></div></div></div>}
    </div>
  );
}
