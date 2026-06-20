# Cofrinho

Aplicativo de construção de hábitos financeiros e acompanhamento de conquistas pessoais.

> "Seu futuro financeiro começa com uma decisão por dia."

## Estrutura do projeto

```
cofrinho-app/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── public/
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── index.css
    ├── assets/
    │   └── piggy-icon.svg
    ├── lib/
    │   ├── constants.js
    │   └── helpers.js
    └── components/
        ├── Onboarding.jsx
        ├── TopBar.jsx
        ├── HomeScreen.jsx
        ├── CofrinhoScreen.jsx
        ├── SimuladorScreen.jsx
        ├── AcademiaScreen.jsx
        ├── DashboardScreen.jsx
        ├── CelebrationModal.jsx
        ├── Toast.jsx
        ├── BottomNav.jsx
        └── JarProgress.jsx
```

## Como rodar localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:5173` no navegador (ou acesse pelo celular na mesma rede, usando o IP da máquina).

## Build de produção

```bash
npm run build
npm run preview
```

Os arquivos finais ficam em `dist/`, prontos para publicar em qualquer host estático (Vercel, Netlify, GitHub Pages etc.).

## Observações

- Os dados (conquista, economias, sequência de dias) são salvos no `localStorage` do navegador. Não há backend nesta versão.
- Os ícones usam a biblioteca `lucide-react`.
- As fontes (Fraunces e Manrope) são carregadas via Google Fonts no `src/index.css`.
