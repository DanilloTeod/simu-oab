# Simulado OAB — 1ª Fase

Aplicação web para praticar questões da 1ª fase do Exame de Ordem da OAB. O projeto usa JavaScript puro, módulos ES e Vite. As questões são carregadas de arquivos JSON estáticos; cadastro, login e salvamento de resultados são integrados à API Flask do [backend](https://github.com/DanilloTeod/simu-oab-backend).

- **Aplicação publicada:** [simu-oab.vercel.app](https://simu-oab.vercel.app/)
- **Backend publicado:** `https://danilloteod.pythonanywhere.com`

## Funcionalidades

- Simulado completo com as 80 questões de uma edição ou prática por matéria.
- Seleção de todas as matérias disponíveis na edição escolhida.
- Cronômetro opcional: 5 horas ou sem limite na prova completa; de 30 a 60 minutos ou sem limite por matéria.
- Opção para revelar e ocultar a resposta correta e o comentário de cada questão durante o simulado.
- Confirmação do navegador ao tentar sair durante o simulado e restauração do progresso após recarregar a página.
- Resolução de questões e visualização do resultado.
- Cadastro e login de estudantes.
- Recuperação de senha por email e gerenciamento dos próprios dados e senha.
- Salvamento do resultado e das respostas no backend para usuários autenticados.
- Histórico com revisão de questões, gabaritos e comentários.
- Painel administrativo com contas online, criação e edição de usuários.
- Gestão de permissões de administrador e exclusão com anonimização de dados pessoais.
- Notificações acessíveis, mensagens de validação junto aos campos e confirmações para ações destrutivas.
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
| Solicitar recuperação de senha | `POST /api/senha/recuperar` | Não |
| Redefinir senha por token | `POST /api/senha/redefinir` | Não |
| Consultar ou atualizar o próprio perfil | `GET/PATCH /api/perfil` | JWT |
| Consultar histórico | `GET /api/simulados/historico` | JWT |
| Registrar presença / contador online | `POST /api/presenca` | Opcional |
| Consultar painel administrativo e contas online | `GET /api/admin/dashboard` | JWT de administrador |
| Criar conta no painel | `POST /api/admin/users` | JWT de administrador |
| Editar dados ou redefinir senha | `PATCH /api/admin/users/<id>` | JWT de administrador |
| Alterar permissão de administrador | `PATCH /api/admin/users/<id>/role` | JWT de administrador |
| Excluir conta e anonimizar simulados | `DELETE /api/admin/users/<id>` | JWT de administrador |
| Salvar resultado do simulado | `POST /api/simulados/salvar` | JWT Bearer |

O login guarda o token JWT no localStorage na chave token_oab e o nome do estudante em user_name. A API expira tokens após uma hora. Alterações na conta revogam sessões anteriores e retornam um novo token para manter a sessão atual. O histórico autenticado já pode ser consultado e revisado no site.

Para executar a API localmente, siga as instruções no [README do backend](https://github.com/DanilloTeod/simu-oab-backend). O backend precisa permitir a origem local do Vite e o domínio Vercel em `FRONTEND_ORIGINS`. Para o primeiro acesso administrativo, configure o email em `ADMIN_EMAILS`, garanta que a conta existe e faça login novamente. Depois, use o painel para conceder permissões a outras contas. O backend verifica a permissão em cada requisição administrativa.

O cadastro não autentica automaticamente: depois de criar a conta, entre usando o formulário de login.

Para habilitar a recuperação de senha em produção, configure `SMTP_HOST`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `MAIL_FROM` e `FRONTEND_URL` no ambiente do backend. `SMTP_PORT` assume `587` e `SMTP_USE_TLS` assume `true`. A mensagem de solicitação não revela se o endereço está cadastrado. Nunca coloque as credenciais SMTP no frontend.

## Questões

As questões não são obtidas pela API. Os arquivos ficam em `public/data/` e são requisitados pelo navegador com o caminho:

```text
/data/questoes_oab_<edição>_tipo1.json
```

O formato esperado é um objeto JSON com a propriedade `questoes` contendo uma lista de questões. O frontend filtra essa lista pela matéria selecionada. Para adicionar ou atualizar uma edição, disponibilize o arquivo correspondente nessa pasta.

## Testes

Execute os testes de lógica do frontend e a compilação:

```bash
npm test
npm run build
```

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
