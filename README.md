# ⚖️ Simulado OAB — 1ª Fase

Projeto pessoal de um simulador interativo para a 1ª Fase do Exame de Ordem da OAB. 

Criei esta aplicação com o objetivo de colocar em prática conceitos fundamentais de desenvolvimento web, manipulação do DOM e gestão de estado em JavaScript puro (Vanilla JS), resolvendo um problema real de estudo.

Atualmente disponivel em: https://simu-oab.vercel.app/
---

## 🎯 Aspectos do projeto?

1. **Lógica de estado dinâmico**: Gerir o fluxo entre a escolha da matéria, a exibição das questões e a tela final sem depender de frameworks como React ou Vue.
2. **Requisições assíncronas**: Consumir as questões via `fetch` simulando uma API real.
3. **Navegação por Dashboard no Resultado**: Em vez de uma lista estática gigante, criei uma interface em duas colunas onde o utilizador clica na questão da grelha e vê o detalhe exato do lado direito.

---

## 🛠️ O que utilizei

- **HTML5 & CSS3**: Flexbox e CSS Grid para o layout responsivo do Dashboard.
- **JavaScript (ES6+)**:
  - Módulos nativos (`import` / `export`) para organizar o código.
  - Arquitetura baseada em renderização por estado (`state.js` e `views.js`).
  - Consumo de dados com `Promises` e `Fetch API` (`api.js`).

---

## 📁 Estrutura dos ficheiros

```text
├── index.html       # Ponto de entrada da aplicação (#app)
├── style.css        # Estilos globais e layout do Dashboard
├── main.js          # Arranque da aplicação
├── state.js         # Memória do app (respostas do utilizador, ecrã atual)
├── timer.js         # Cronômetro (em desenvolvimento)
├── api.js           # Carregamento assíncrono das questões
└── views.js         # Lógica visual e renderização dos ecrãs (Home, Quiz, Result)
