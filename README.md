# Simulado OAB — 1ª Fase

Aplicação web para praticar questões da 1ª fase do Exame de Ordem da OAB. O projeto usa JavaScript puro, módulos ES e Vite. As questões são carregadas de arquivos JSON estáticos; cadastro, login e salvamento de resultados são integrados à API Flask do [backend](https://github.com/DanilloTeod/simu-oab-backend).

- **Aplicação publicada:** [simu-oab.vercel.app](https://simu-oab.vercel.app/)
- **Backend publicado:** `https://danilloteod.pythonanywhere.com`

## Funcionalidades

- Seleção de matéria e edição do exame.
- Resolução de questões e visualização do resultado.
- Cadastro e login de estudantes.
- Salvamento do resultado e das respostas no backend para usuários autenticados.
- Histórico com revisão de questões, gabaritos e comentários.
- Painel administrativo e indicador de estudantes online.
- Layout responsivo e interface construída sem frameworks de frontend.

## Tecnologias

- HTML5 e CSS3.
- JavaScript (ES modules) e Fetch API.
- Vite para desenvolvimento e build.
- API Flask, SQLite e JWT para autenticação e persistência dos resultados.

## Executar localmente

Requer Node.js e npm. Na raiz do frontend:

```bash
npm install
npm run dev
```

O Vite informa no terminal o endereço local para abrir no navegador.

Para gerar e visualizar a versão de produção:

```bash
npm run build
npm run preview
```

## Integração com o backend

O cliente HTTP do frontend está em [`src/js/api.js`](src/js/api.js). Ele usa `http://127.0.0.1:5000` durante o desenvolvimento e `https://danilloteod.pythonanywhere.com` no build de produção:

| Ação | Endpoint | Autenticação |
| --- | --- | --- |
| Criar conta | `POST /api/cadastro` | Não |
| Entrar | `POST /api/login` | Não |
| Consultar histórico | `GET /api/simulados/historico` | JWT |
| Registrar presença / contador online | `POST /api/presenca` | Opcional |
| Consultar painel administrativo | `GET /api/admin/dashboard` | JWT de administrador |
| Salvar resultado do simulado | `POST /api/simulados/salvar` | JWT Bearer |

O login guarda o token JWT em `localStorage` na chave `token_oab` e o nome do estudante em `user_name`. O token é enviado no cabeçalho `Authorization: Bearer <token>` ao salvar um resultado. A API expira tokens após uma hora. O frontend não consulta nem exibe um histórico de resultados persistidos neste momento.

Para executar a API localmente, siga as instruções no [README do backend](https://github.com/DanilloTeod/simu-oab-backend). O backend precisa permitir a origem local do Vite e o domínio Vercel em `FRONTEND_ORIGINS`. Para exibir o botão Admin, configure o email autorizado em `ADMIN_EMAILS` no backend e faça login novamente. A API valida essa autorização em cada requisição administrativa.

O cadastro não autentica automaticamente: depois de criar a conta, entre usando o formulário de login.

## Questões

As questões não são obtidas pela API. Os arquivos ficam em `public/data/` e são requisitados pelo navegador com o caminho:

```text
/data/questoes_oab_<edição>_tipo1.json
```

O formato esperado é um objeto JSON com a propriedade `questoes` contendo uma lista de questões. O frontend filtra essa lista pela matéria selecionada. Para adicionar ou atualizar uma edição, disponibilize o arquivo correspondente nessa pasta.

## Estrutura principal

```text
├── public/
│   └── data/             # Questões em JSON por edição
├── src/
│   ├── assets/           # Ícones e imagens
│   └── js/
│       ├── api.js        # Questões e chamadas ao backend
│       ├── main.js       # Inicialização da aplicação
│       ├── state.js      # Estado do simulado
│       ├── timer.js      # Lógica de cronômetro
│       └── views.js      # Renderização das telas e eventos
├── index.html
├── style.css
└── package.json
```
