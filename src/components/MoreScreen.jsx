import React from "react";
import { Bot, Calculator, CalendarCheck, CalendarRange, ChevronRight, CircleDollarSign, FileInput, GraduationCap, LayoutDashboard, ListPlus, Settings2, ShieldCheck } from "lucide-react";
import TopBar from "./TopBar";

const ITEMS = [
  { id: "entry", title: "Nova movimentação", subtitle: "Entrada, saída ou transferência", icon: ListPlus },
  { id: "agenda", title: "Agenda financeira", subtitle: "Pagar, receber e acompanhar vencimentos", icon: CalendarCheck },
  { id: "manage", title: "Cadastros financeiros", subtitle: "Contas, cartões, recorrências e dívidas", icon: Settings2 },
  { id: "decision", title: "Posso comprar?", subtitle: "Simule parcelas antes de decidir", icon: CircleDollarSign },
  { id: "planning", title: "Planejamento financeiro", subtitle: "Recorrências, dívidas e previsões", icon: CalendarRange },
  { id: "import", title: "Importar extrato", subtitle: "Prévia segura de CSV e OFX", icon: FileInput },
  { id: "atlas-requests", title: "Pedidos do Atlas", subtitle: "Pareamento, confirmações e auditoria", icon: Bot },
  { id: "simulador", title: "Simulador", subtitle: "Teste metas e decisões", icon: Calculator },
  { id: "academia", title: "Academia financeira", subtitle: "Conteúdos e aprendizado", icon: GraduationCap },
  { id: "dashboard", title: "Painel da versão atual", subtitle: "Indicadores e histórico do Cofrinho", icon: LayoutDashboard },
  { id: "financial-backup", title: "Proteção dos dados", subtitle: "Backup financeiro integral", icon: ShieldCheck },
];

export default function MoreScreen({ onOpen }) {
  return <div className="pb-4"><TopBar title="Mais" subtitle="Ferramentas e proteção do Cofrinho" /><div className="px-5 space-y-3">{ITEMS.map((item, index) => <button key={`${item.title}-${index}`} onClick={() => onOpen(item.id)} className="w-full rounded-3xl p-4 text-left flex items-center gap-3" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}><div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "var(--primary-lt)" }}><item.icon size={20} color="var(--primary)" /></div><div className="flex-1"><p className="font-semibold text-sm">{item.title}</p><p className="text-xs mt-0.5" style={{ color: "var(--ink-soft)" }}>{item.subtitle}</p></div><ChevronRight size={18} color="var(--ink-soft)" /></button>)}</div></div>;
}
