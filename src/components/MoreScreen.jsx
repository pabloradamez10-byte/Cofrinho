import React from "react";
import { Calculator, CalendarRange, ChevronRight, FileInput, GraduationCap, LayoutDashboard, ShieldCheck } from "lucide-react";
import TopBar from "./TopBar";

const ITEMS = [
  { id: "planning", title: "Planejamento financeiro", subtitle: "Recorrências, dívidas e previsões", icon: CalendarRange },
  { id: "import", title: "Importar extrato", subtitle: "Prévia segura de CSV e OFX", icon: FileInput },
  { id: "simulador", title: "Simulador", subtitle: "Teste metas e decisões", icon: Calculator },
  { id: "academia", title: "Academia financeira", subtitle: "Conteúdos e aprendizado", icon: GraduationCap },
  { id: "dashboard", title: "Painel da versão atual", subtitle: "Indicadores e histórico do Cofrinho", icon: LayoutDashboard },
  { id: "dashboard", title: "Proteção dos dados", subtitle: "Backup, restauração e recuperação", icon: ShieldCheck },
];

export default function MoreScreen({ onOpen }) {
  return <div className="pb-4"><TopBar title="Mais" subtitle="Ferramentas e proteção do Cofrinho" /><div className="px-5 space-y-3">{ITEMS.map((item, index) => <button key={`${item.title}-${index}`} onClick={() => onOpen(item.id)} className="w-full rounded-3xl p-4 text-left flex items-center gap-3" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}><div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "var(--primary-lt)" }}><item.icon size={20} color="var(--primary)" /></div><div className="flex-1"><p className="font-semibold text-sm">{item.title}</p><p className="text-xs mt-0.5" style={{ color: "var(--ink-soft)" }}>{item.subtitle}</p></div><ChevronRight size={18} color="var(--ink-soft)" /></button>)}</div></div>;
}
