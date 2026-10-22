import { userState, state } from "./state.js";
import { loadQuestions, enviarSimulado, login, cadastrar } from "./api.js";

function scrollTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

function formatarComentario(texto) {
    if (!texto) return "Comentário não disponível.";
    let formatado = texto.replace(/(A alternativa [A-D] está)/gi, '<br><br><strong>$1</strong>');
    return formatado;
}
// --- FUNÇÃO AUXILIAR: Gera a Navbar discreta no topo direito ---
function getHeaderUsuarioHTML() {
    const nomeUsuario = localStorage.getItem('user_name') || 'Anônimo';
    const estaLogado = Boolean(localStorage.getItem('user_name'));

    return `
        <header class="top-navbar">
            <div class="navbar-content">
                <span class="user-badge">👤 <strong>${nomeUsuario}</strong></span>
                <div class="auth-buttons-header">
                    ${estaLogado ? `
                        <button id="btn-logout" class="btn-logout-small" title="Sair da conta">Sair</button>
                    ` : `
                        <button id="btn-login-nav" class="btn-nav-outline">Login</button>
                        <button id="btn-register-nav" class="btn-nav-filled">Cadastrar</button>
                    `}
                </div>
            </div>
        </header>
    `;
}
// --- FUNÇÃO AUXILIAR: Configura o evento do botão "Sair" ---
function bindLogoutEvent(container) {
    const btnLogout = container.querySelector('#btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            localStorage.removeItem('token_oab');
            localStorage.removeItem('user_name');
            alert('Você saiu da sua conta.');
            render();
        });
    }
}
// --- FUNÇÃO AUXILIAR: Gerencia os cliques da Navbar (Login, Cadastrar, Sair) ---
function bindHeaderEvents(container) {
    const btnLogout = container.querySelector('#btn-logout');
    const btnLogin = container.querySelector('#btn-login-nav');
    const btnRegister = container.querySelector('#btn-register-nav');

    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            localStorage.removeItem('token_oab');
            localStorage.removeItem('user_name');
            alert('Você saiu da sua conta.');
            render();
        });
    }

    if (btnLogin) {
        btnLogin.addEventListener('click', () => {
            state.screen = 'LOGIN';
            render();
        });
    }

    if (btnRegister) {
        btnRegister.addEventListener('click', () => {
            state.screen = 'REGISTER';
            render();
        });
    }
}

export function render() {
    let choice = null;
    const app = document.getElementById('app');
    const headerHTML = getHeaderUsuarioHTML();

    // --- TELA: HOME ---
    if (state.screen === 'HOME') {
        app.innerHTML = `
            ${headerHTML}

            <div class="card">
                <h1>Simulado OAB 1ª Fase</h1>
                <p><strong>Escolha uma Disciplina</strong></p>
                
                <button data-materia="etica" class="btn-materia">Ética Profissional</button>
                <button data-materia="constitucional" class="btn-materia">Direito Constitucional</button>
                <button data-materia="civil" class="btn-materia">Direito Civil</button>
                <button data-materia="processualcivil" class="btn-materia">Direito Processual Civil</button>
                <button data-materia="penal" class="btn-materia">Direito Penal</button>        
                <button data-materia="processualpenal" class="btn-materia">Direito Processual Penal</button>        

                <div class="edicao-container">
                    <label for="edicao" class="label-edicao">Edição da Prova: </label>
                    <select class="input-edicao" id="edicao" name="edicao">
                        <option value="39">39° Exame de Ordem Unificado</option>
                        <option value="40">40° Exame de Ordem Unificado</option>
                        <option value="41">41° Exame de Ordem Unificado</option>
                        <option value="42">42° Exame de Ordem Unificado</option>
                        <option value="43">43° Exame de Ordem Unificado</option>
                        <option value="44">44° Exame de Ordem Unificado</option>
                        <option value="45">45° Exame de Ordem Unificado</option>
                        <option value="46">46° Exame de Ordem Unificado</option>
                        <option value="47">47° Exame de Ordem Unificado</option>
                    </select>
                </div>
                <button id="btn-iniciar" class="btn-primary">Iniciar Simulado</button>
            </div>
        `;

        // Ativa os eventos da Navbar
        bindHeaderEvents(app);

        const subjectButtons = app.querySelectorAll('.btn-materia');
        const start = app.querySelector('#btn-iniciar');
        const edition = app.querySelector('#edicao');

        edition.value = state.editionSelected;

        edition.addEventListener('change', (e) => {
            state.editionSelected = e.target.value;
        });

        subjectButtons.forEach(botao => {
            botao.addEventListener('click', (e) => {
                subjectButtons.forEach(b => b.classList.remove('ativo'));
                e.target.classList.add('ativo');
                state.subject = e.target.getAttribute('data-materia');
            });
        });

        start.addEventListener("click", () => {
            if (state.subject === null) {
                alert("Escolha ao menos uma Disciplina!");
            } else {
                state.screen = 'QUIZ';
                render();
            }
        });
    }
    
    // --- TELA: LOGIN ---
    else if (state.screen === 'LOGIN') {
        app.innerHTML = `
            ${headerHTML}

            <div class="card">
                <h1><strong>Acessar Conta</strong></h1>
                <p class="card-subtitle">Entre para salvar seus resultados e acompanhar seu progresso.</p>

                <form id="login-form" class="auth-form">
                    <div class="form-group">
                        <label for="login-email">E-mail</label>
                        <input type="email" id="login-email" class="input-edicao" placeholder="seuemail@exemplo.com" required>
                    </div>

                    <div class="form-group">
                        <label for="login-password">Senha</label>
                        <input type="password" id="login-password" class="input-edicao" placeholder="••••••••" required>
                    </div>

                    <button type="submit" class="btn-primary btn-full">Entrar</button>
                </form>

                <div class="form-footer">
                    <span>Ainda não tem conta?</span> 
                    <button id="go-to-register" class="btn-link">Cadastre-se</button>
                </div>
                
                <div style="text-align: center; margin-top: 15px;">
                    <button id="btn-back-home" class="btn-link-secundary">← Voltar ao Início</button>
                </div>
            </div>
        `;

        bindLogoutEvent(app);

        const formLogin = app.querySelector('#login-form');
        const btnGoRegister = app.querySelector('#go-to-register');
        const btnBackHome = app.querySelector('#btn-back-home');

        btnGoRegister.addEventListener('click', () => {
            state.screen = 'REGISTER';
            render();
        });

        btnBackHome.addEventListener('click', () => {
            state.screen = 'HOME';
            render();
        });

        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = app.querySelector('#login-email').value;
            const senha = app.querySelector('#login-password').value;

            const sucesso = await login(email, senha);
            if (sucesso) {
                state.screen = 'HOME';
                render();
            }
        });
    }

    // --- TELA: REGISTER (CADASTRO) ---
    else if (state.screen === 'REGISTER') {
        app.innerHTML = `
            ${headerHTML}

            <div class="card">
                <h1><strong>Criar Conta</strong></h1>
                <p class="card-subtitle">Cadastre-se para acompanhar seu desempenho no simulado OAB.</p>

                <form id="register-form" class="auth-form">
                    <div class="form-group">
                        <label for="register-name">Nome Completo</label>
                        <input type="text" id="register-name" class="input-edicao" placeholder="Seu nome" required>
                    </div>

                    <div class="form-group">
                        <label for="register-email">E-mail</label>
                        <input type="email" id="register-email" class="input-edicao" placeholder="seuemail@exemplo.com" required>
                    </div>

                    <div class="form-group">
                        <label for="register-password">Senha</label>
                        <input type="password" id="register-password" class="input-edicao" placeholder="Crie uma senha" required>
                    </div>

                    <button type="submit" class="btn-primary btn-full">Criar Minha Conta</button>
                </form>

                <div class="form-footer">
                    <span>Já possui uma conta?</span> 
                    <button id="go-to-login" class="btn-link">Fazer Login</button>
                </div>

                <div style="text-align: center; margin-top: 15px;">
                    <button id="btn-back-home-reg" class="btn-link-secundary">← Voltar ao Início</button>
                </div>
            </div>
        `;

        bindLogoutEvent(app);

        const formRegister = app.querySelector('#register-form');
        const btnGoLogin = app.querySelector('#go-to-login');
        const btnBackHome = app.querySelector('#btn-back-home-reg');

        btnGoLogin.addEventListener('click', () => {
            state.screen = 'LOGIN';
            render();
        });

        btnBackHome.addEventListener('click', () => {
            state.screen = 'HOME';
            render();
        });

        formRegister.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nome = app.querySelector('#register-name').value;
            const email = app.querySelector('#register-email').value;
            const senha = app.querySelector('#register-password').value;

            const cadastrou = await cadastrar(nome, email, senha);
            if (cadastrou) {
                state.screen = 'LOGIN';
                render();
            }
        });
    }

    // --- TELA: QUIZ ---
    else if (state.screen === 'QUIZ') {
        loadQuestions(state.editionSelected).then(questoes => {
            state.totalQuestions = questoes.length;
            if (questoes.length === 0){
                app.innerHTML = `
                    ${headerHTML}
                    <div class="card" style="text-align: center;">
                        <p>Não existem questões cadastradas para esta matéria ainda.</p>
                    </div>
                `;
                bindLogoutEvent(app);
                return;
            }

            if (state.currentIndex >= questoes.length){
                enviarSimulado(
                    state.arrayAnswers,
                    state.correctAnswers,
                    state.editionSelected,
                    state.totalQuestions
                );
                state.screen = "RESULT";
                render();
                return;
            };
            
            scrollTop();
            app.innerHTML = `
                ${headerHTML}
                <div class="card" style="text-align: center;">
                    <h1>Simulado de ${state.subject.toUpperCase()}</h1>
                    <span style="display: inline-block; padding: 4px 12px; background-color: rgba(255, 255, 255, 0.1); border-radius: 12px; font-size: 0.85rem; margin-bottom: 15px;">
                        ${state.currentIndex + 1} / ${questoes.length}
                    </span>
                    <div id="container-question">Carregando questões...</div>
                </div>
            `;

            bindLogoutEvent(app);

            const container = document.getElementById('container-question');
            choice = null;
            state.totalQuestions = questoes.length;
            const questao = questoes[state.currentIndex];
            const letters = ['a', 'b', 'c', 'd'];
            let buttonsHTML = '';

            letters.forEach(letter => {
                buttonsHTML += `
                <button class="btn-alternativa" data-letra="${letter}">
                    <strong>${letter.toUpperCase()}.</strong> ${questao.alternativas[letter]}
                </button>
                `;
            });

            container.innerHTML = `
            <p class="enunciado"><strong> Questão ${questao.id} (${state.editionSelected}º Exame OAB 1ª Fase). </strong>${questao.enunciado}</p>
            <div class="container-alternativas">
                ${buttonsHTML}
            </div>
            <button class="btn-primary" id="btn-confirmar" style="margin-top: 20px;">Confirmar</button>
            `;

            const choiceButton = container.querySelectorAll(".btn-alternativa");
            choiceButton.forEach(botao => {
                botao.addEventListener('click', (e) => {
                    choiceButton.forEach(b => b.classList.remove('ativo'));
                    e.currentTarget.classList.add('ativo');
                    choice = e.currentTarget.getAttribute('data-letra');
                });
            });

            const confirm = app.querySelector('#btn-confirmar');
            confirm.addEventListener("click", () => {
                if (choice === null){
                    alert("Escolha ao menos uma alternativa.");
                    return;
                };

                userState.answers.push(choice);
                userState.questionId.push(questao.id);
                
                let acertou = false;
                if (userState.answers[state.currentIndex].toLowerCase() === questao.correta.toLowerCase()){
                    state.correctAnswers++;
                    userState.correctAnswers++;
                    acertou = true;
                };

                state.arrayAnswers.push({
                    question_id: questao.id,
                    subject: questao.materia,
                    selected_option: choice,
                    is_correct: acertou
                });

                state.currentIndex++;
                render();
            });
        });
    }

    // --- TELA: RESULT ---
    else if (state.screen == "RESULT"){
        console.log(userState.correctAnswers)
        if (state.currentResultIndex == undefined){
            state.currentResultIndex = 0;
        };

        loadQuestions(state.editionSelected).then(questoes => {
            let gridBotoesHTML = '';
            userState.answers.forEach((answer, index) => {
                const qId = userState.questionId[index];
                const qOriginal = questoes.find(q => q.id === qId);

                const acertou = answer.toLowerCase() == qOriginal.correta.toLowerCase();
                const corBorda = acertou ? '#22c55e' : '#ef4444';
                const classeAtiva = index === state.currentResultIndex ? 'ativo' : '';

                gridBotoesHTML += `
                    <button class="btn-grid-questao ${classeAtiva}" data-index="${index}" style="border-bottom: 3px solid ${corBorda};">
                        ${index + 1}
                    </button>
                `;
            }); 
            
            const indexAtual = state.currentResultIndex;
            const qIdAtual = userState.questionId[indexAtual];
            const qOriginalAtual = questoes.find(q => q.id === qIdAtual);
            const respostaUsuario = userState.answers[indexAtual];

            const acertouAtual = respostaUsuario.toLowerCase() === qOriginalAtual.correta.toLowerCase();
            const corBordaDetalhe = acertouAtual ? '#22c55e' : '#ef4444';
            const corFundoDetalhe = acertouAtual ? 'rgba(34, 197, 94, 0.05)' : 'rgba(239, 68, 68, 0.07)';

            let alternativasHTML = '';
            ['a', 'b', 'c', 'd'].forEach(letra => {
                alternativasHTML += `
                    <div class="gabarito-alternativas">
                        <strong>${letra.toUpperCase()}.</strong> ${qOriginalAtual.alternativas[letra]}
                    </div>
                `;
            });

            scrollTop();
            app.innerHTML = `
                ${headerHTML}

                <div class="card card-result" style="max-width: 1050px !important;">
                    <div style="text-align: center; margin-bottom: 25px;">
                        <h1 style="margin-bottom: 8px;">Simulado Concluído!</h1>
                        <p class="concluido" style="font-size: 1.1rem; margin: 0; opacity: 0.9;">
                            Você acertou <strong style="color: #4ade80; font-size: 1.2rem;">${userState.correctAnswers}</strong> de <strong>${userState.answers.length}</strong> questões.
                        </p>
                    </div>
                    
                    <div class="resultado-container-layout">
                        <div class="sidebar-questoes">
                            <div class="sidebar-titulo">Questões (${userState.answers.length})</div>
                            <div class="grid-botoes">
                                ${gridBotoesHTML}
                            </div>
                        </div>

                        <div class="painel-detalhe" style="border-left: 6px solid ${corBordaDetalhe}; background-color: ${corFundoDetalhe};">
                            <div class="gabarito-enunciado">
                                <strong>Questão ${qOriginalAtual.id} (${state.editionSelected}º Exame OAB 1ª Fase) (${indexAtual + 1} de ${userState.answers.length}).</strong> ${qOriginalAtual.enunciado}
                            </div>

                            <div style="margin-bottom: 15px;">
                                ${alternativasHTML}
                            </div>

                            <div class="gabarito-rodape">
                                <span>Sua resposta: <strong style="color: ${corBordaDetalhe}; font-size: 1.1rem;">${respostaUsuario.toUpperCase()}</strong></span>
                                <span class="gabarito-badge">Correta: <strong style="color: #4ade80; font-size: 1.1rem;">${qOriginalAtual.correta.toUpperCase()}</strong></span>
                            </div>

                            <div class="gabarito-comentario" style="margin-top: 15px; padding: 12px; background-color: rgba(255, 255, 255, 0.03); border-radius: 6px; border-left: 3px solid #3b82f6;">
                                <strong style="color: #60a5fa; display: block; margin-bottom: 5px;">Gabarito Detalhado:</strong>
                                <p style="font-size: 0.9rem; line-height: 1.4; color: #cbd5e1; margin: 0;">${formatarComentario(qOriginalAtual.comentario)}</p>
                            </div>
                        </div>
                    </div>

                    <div style="display: flex; justify-content: flex-end; width: 100%; margin-top: 20px;">
                        <button class="btn-primary" id="btn-reiniciar" style="margin: 0; width: auto; padding: 10px 20px;">Voltar ao Início</button>
                    </div>
                </div>
            `;

            bindLogoutEvent(app);

            const botoesGrid = app.querySelectorAll('.btn-grid-questao');
            botoesGrid.forEach(botao => {
                botao.addEventListener('click', (e) => {
                    const novoIndex = parseInt(e.currentTarget.getAttribute('data-index'));
                    state.currentResultIndex = novoIndex;
                    render();
                });
            });

            const btnReiniciar = app.querySelector("#btn-reiniciar");
            btnReiniciar.addEventListener('click', () => {
                state.screen = "HOME";
                state.subject = null;
                state.currentIndex = 0;
                state.correctAnswers = 0;
                state.currentResultIndex = 0;

                userState.correctAnswers = 0;
                userState.questionId = [];
                userState.answers = [];
                render();
            });
        });
    }
}