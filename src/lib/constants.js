import { Coffee, Utensils, Repeat, ShoppingBag, HelpCircle } from "lucide-react";

export const STORAGE_KEY = "cofrinho_data_v1";

export const CATEGORIES = [
  { id: "dividas", label: "Sair das dívidas", emoji: "💳" },
  { id: "moto", label: "Comprar uma moto", emoji: "🏍️" },
  { id: "carro", label: "Comprar um carro", emoji: "🚗" },
  { id: "casa", label: "Comprar uma casa", emoji: "🏠" },
  { id: "viagem", label: "Fazer uma viagem", emoji: "✈️" },
  { id: "negocio", label: "Abrir um negócio", emoji: "💼" },
  { id: "reserva", label: "Reserva de emergência", emoji: "🛟" },
  { id: "outra", label: "Outra conquista", emoji: "🎯" },
];

export const SAVING_CATEGORIES = [
  { id: "Café", icon: Coffee },
  { id: "Delivery", icon: Utensils },
  { id: "Lanche", icon: Utensils },
  { id: "Assinatura", icon: Repeat },
  { id: "Compra por impulso", icon: ShoppingBag },
  { id: "Outro", icon: HelpCircle },
];

export const MISSIONS = [
  "Anote todos os gastos de hoje",
  "Evite uma compra por impulso",
  "Leve água de casa em vez de comprar",
  "Revise seus gastos da semana",
  "Guarde R$ 5 agora mesmo",
  "Pesquise uma alternativa mais barata antes de comprar",
  "Cancele uma assinatura que você não usa",
  "Cozinhe em vez de pedir delivery hoje",
  "Compare o preço em dois lugares antes de comprar",
  "Separe um valor simbólico para sua conquista",
];

export const ACADEMY = [
  {
    id: "organizacao",
    title: "Organização financeira",
    emoji: "🗂️",
    tips: [
      "O primeiro passo é saber para onde o dinheiro vai. Anote tudo por 7 dias seguidos, sem julgar os gastos — só observe.",
      "Separe contas fixas, variáveis e desejos. Isso revela rápido onde dá para cortar sem sofrer.",
      "Defina um dia fixo na semana para revisar o saldo. Hábito vence força de vontade.",
    ],
  },
  {
    id: "reserva",
    title: "Reserva de emergência",
    emoji: "🛟",
    tips: [
      "A reserva existe para imprevistos, não para metas. Mantenha-a em algo líquido, fácil de resgatar.",
      "Uma meta inicial realista é de 3 a 6 meses do seu custo de vida mensal.",
      "Comece pequeno: R$ 50 guardados toda semana já criam o hábito antes do valor importar.",
    ],
  },
  {
    id: "dividas",
    title: "Dívidas",
    emoji: "💳",
    tips: [
      "Liste todas as dívidas com valor, juros e vencimento. Encarar o número real é o que destrava o plano.",
      "Quite primeiro a dívida com juros mais altos — geralmente cartão de crédito e cheque especial.",
      "Negocie sempre. Muitas instituições oferecem desconto para pagamento à vista de dívidas em atraso.",
    ],
  },
  {
    id: "cdb",
    title: "CDB",
    emoji: "🏦",
    tips: [
      "CDB é um empréstimo que você faz ao banco em troca de juros. Quanto maior o prazo, geralmente maior o retorno.",
      "Prefira CDBs com liquidez diária se o dinheiro for de uma meta de curto prazo.",
      "Verifique se o CDB tem cobertura do FGC — isso reduz bastante o risco até o limite garantido.",
    ],
  },
  {
    id: "tesouro",
    title: "Tesouro Direto",
    emoji: "📜",
    tips: [
      "É a forma mais simples de emprestar dinheiro ao governo federal e receber juros em troca.",
      "O Tesouro Selic costuma ser indicado para reserva de emergência, por ter baixa oscilação de preço.",
      "Títulos prefixados ou IPCA+ fazem mais sentido para metas de longo prazo, como aposentadoria ou casa própria.",
    ],
  },
  {
    id: "investimentos",
    title: "Investimentos",
    emoji: "📈",
    tips: [
      "Antes de investir, tenha clareza do prazo e do objetivo — isso define o tipo de investimento certo.",
      "Diversificar reduz risco: não coloque toda sua conquista em um único tipo de ativo.",
      "Juros compostos recompensam tempo. Começar cedo importa mais do que começar com um valor alto.",
    ],
  },
  {
    id: "planejamento",
    title: "Planejamento financeiro",
    emoji: "🧭",
    tips: [
      "Toda meta financeira fica mais fácil quando vira um número com data — é o que o Cofrinho faz por você.",
      "Revise sua meta a cada poucos meses. Ajustar o plano não é fracasso, é manutenção.",
      "Celebre marcos parciais. Comemorar 25% e 50% mantém a motivação viva até o 100%.",
    ],
  },
];

export const MILESTONES = [25, 50, 75, 100];

export const MILESTONE_MSG = {
  25: { title: "25% conquistado!", text: "Você já provou que consegue manter o ritmo. Continue assim." },
  50: { title: "Metade do caminho!", text: "Você já passou da metade. Sua conquista está cada vez mais real." },
  75: { title: "75% concluído!", text: "Está quase lá. A reta final começou." },
  100: { title: "Conquista alcançada!", text: "Você chegou lá. Essa decisão diária valeu a pena." },
};

export const MOTIVATION = [
  "Parabéns. Você está mais perto da sua conquista.",
  "Mais um passo rumo ao seu objetivo.",
  "Seu futuro financeiro começa com uma decisão por dia.",
];

export const TABS = [
  { id: "home", label: "Início", icon: "Home" },
  { id: "cofrinho", label: "Cofrinho", icon: "PiggyBank" },
  { id: "simulador", label: "Simulador", icon: "Calculator" },
  { id: "academia", label: "Academia", icon: "GraduationCap" },
  { id: "dashboard", label: "Painel", icon: "TrendingUp" },
];

