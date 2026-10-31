import { userState, state } from "./state.js";
import {
    loadQuestions,
    loadEditionQuestions,
    enviarSimulado,
    login,
    cadastrar,
    historico,
    carregarPainelAdmin,
    atualizarPresenca
} from "./api.js";

let adminRefreshTimer = null;

function scrollTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

function resetarTentativa() {
    state.currentIndex = 0;
    state.correctAnswers = 0;
    state.currentResultIndex = 0;
    state.arrayAnswers = [];
    userState.correctAnswers = 0;
    userState.questionId = [];
    userState.answers = [];
}

function formatarComentario(texto) {
    if (!texto) return "Gabarito não disponível.";
    let formatado = escaparHTML(texto).replace(/(A alternativa [A-D] está)/gi, '<br><br><strong>$1</strong>');
    return formatado;
}

function escaparHTML(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, caractere => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[caractere]);
}

function formatarDataHistorico(data) {
    if (!data) return 'Data indisponível';

    const dataConvertida = new Date(data);
    if (Number.isNaN(dataConvertida.getTime())) return 'Data indisponível';

    return dataConvertida.toLocaleString('pt-BR', {
        dateStyle: 'long',
        timeStyle: 'short'
    });
}

function formatarMateria(materia) {
    const materias = {
        etica: 'Ética Profissional',
        constitucional: 'Direito Constitucional',
        civil: 'Direito Civil',
        processualcivil: 'Direito Processual Civil',
        penal: 'Direito Penal',
        processualpenal: 'Direito Processual Penal'
    };

    return materias[materia] || materia;
}

function renderQuestaoHistorico(resposta, questoes, numeroQuestao, edicao) {
    const questao = questoes.find(item =>
        Number(item.id) === Number(resposta.question_id) &&
        (!resposta.subject || item.materia === resposta.subject)
    );
    const alternativaMarcada = String(resposta.selected_option || '').toLowerCase();
    const gabarito = String(questao?.correta || '').toLowerCase();
    const acertou = gabarito
        ? alternativaMarcada === gabarito
        : Boolean(resposta.is_correct);
    const status = gabarito
        ? (acertou ? 'history-status-correct' : 'history-status-incorrect')
        : 'history-status-unknown';
    const textoStatus = gabarito
        ? (acertou ? 'Acertou' : 'Errou')
        : 'Gabarito indisponível';

    let alternativasHTML = '';
    if (questao?.alternativas) {
        alternativasHTML = Object.entries(questao.alternativas).map(([letra, texto]) => {
            const classes = ['history-option'];
            if (letra === gabarito) classes.push('history-option-correct');
            if (letra === alternativaMarcada) classes.push('history-option-selected');

            return `
                <div class="${classes.join(' ')}">
                    <strong>${escaparHTML(letra.toUpperCase())}.</strong>
                    ${escaparHTML(texto)}
                    ${letra === alternativaMarcada ? '<span>Sua resposta</span>' : ''}
                    ${letra === gabarito ? '<span>Gabarito</span>' : ''}
                </div>
            `;
        }).join('');
    }

    return `
        <details class="history-question">
            <summary>
                <span>Questão ${numeroQuestao}</span>
                <span class="history-question-status ${status}">${textoStatus}</span>
            </summary>
            <div class="history-question-content">
                ${questao
                    ? `<p class="history-question-id">${escaparHTML(edicao)}º Exame OAB · Questão original ${escaparHTML(questao.id)} <span>(questão ${numeroQuestao} deste simulado)</span></p>
                       <p class="history-enunciado">${escaparHTML(questao.enunciado)}</p>
                       <div class="history-options">${alternativasHTML}</div>
                       <div class="history-answer-line">
                           <span>Sua resposta: <strong>${escaparHTML(alternativaMarcada.toUpperCase() || '—')}</strong></span>
                           <span>Gabarito: <strong>${escaparHTML(gabarito.toUpperCase() || '—')}</strong></span>
                       </div>
                       <div class="history-comment">
                           <strong>Comentário</strong>
                           <p>${formatarComentario(questao.comentario)}</p>
                       </div>`
                    : `<p class="history-question-id">Questão original ${escaparHTML(resposta.question_id)} <span>(questão ${numeroQuestao} deste simulado)</span></p>
                       <p class="history-unavailable">Não foi possível carregar o enunciado e o gabarito desta questão.</p>
                       <div class="history-answer-line">
                           <span>Sua resposta: <strong>${escaparHTML(alternativaMarcada.toUpperCase() || '—')}</strong></span>
                       </div>`
                }
            </div>
        </details>
    `;
}

function renderSimuladoHistorico(simulado, questoes) {
    const respostas = Array.isArray(simulado.answers) ? simulado.answers : [];
    const edicao = simulado.edition ?? simulado.edicao;
    const acertos = simulado.score ?? simulado.questoes_corretas;
    const total = simulado.total_questions ?? simulado.questoes_totais;
    const materias = [...new Set(respostas.map(resposta => resposta.subject).filter(Boolean))];
    const materiasTexto = materias.length
        ? materias.map(formatarMateria).join(' · ')
        : 'Matéria não identificada';

    return `
        <details class="history-run">
            <summary class="history-run-summary">
                <span class="history-run-summary-main">
                    <span class="history-run-label">Simulado ${escaparHTML(simulado.id)}</span>
                    <span class="history-run-title">${escaparHTML(edicao)}º Exame de Ordem</span>
                    <span class="history-run-subject">${escaparHTML(materiasTexto)}</span>
                    <span class="history-run-date">${escaparHTML(formatarDataHistorico(simulado.submitted_at ?? simulado.data_envio))}</span>
                </span>
                <span class="history-run-summary-meta">
                    <span class="history-score">
                    <strong>${escaparHTML(acertos)} / ${escaparHTML(total)}</strong>
                    <span>acertos</span>
                    </span>
                    <span class="history-run-toggle">
                        <span class="history-run-open-label">Ver questões</span>
                        <span class="history-run-close-label">Ocultar questões</span>
                    </span>
                </span>
            </summary>
            <div class="history-run-content">
                <div class="history-questions">
                    ${respostas.length
                        ? respostas.map((resposta, index) =>
                            renderQuestaoHistorico(resposta, questoes, index + 1, edicao)
                        ).join('')
                        : '<p class="history-unavailable">Este simulado não possui respostas registradas.</p>'
                    }
                </div>
            </div>
        </details>
    `;
}

async function renderTelaHistorico(app, headerHTML) {
    app.innerHTML = `
        ${headerHTML}
        <section class="card history-card">
            <div class="history-heading">
                <div>
                    <h1>Histórico de simulados</h1>
                    <p class="card-subtitle">Acompanhe seus resultados e revise as questões respondidas.</p>
                </div>
                <button id="btn-history-home" class="btn-nav-outline">← Início</button>
            </div>
            <p class="history-loading" role="status">Carregando seu histórico...</p>
        </section>
    `;
    bindHeaderEvents(app);

    try {
        const simulados = await historico();
        if (state.screen !== 'HISTORY') return;

        const edicoes = [...new Set(simulados.map(simulado => String(simulado.edition)))];
        const bancos = await Promise.all(edicoes.map(async edicao => {
            try {
                return [edicao, await loadEditionQuestions(edicao)];
            } catch (erro) {
                console.error(`Erro ao carregar as questões do Exame ${edicao}:`, erro);
                return [edicao, []];
            }
        }));
        const questoesPorEdicao = new Map(bancos);

        app.innerHTML = `
            ${headerHTML}
            <section class="card card-result history-card">
                <div class="history-heading">
                    <div>
                        <h1>Histórico de simulados</h1>
                        <p class="card-subtitle">Seus resultados e a revisão das questões respondidas.</p>
                    </div>
                    <div class="history-heading-actions">
                        <button id="btn-history-home" class="btn-nav-outline">← Início</button>
                        <span class="history-count">${simulados.length} ${simulados.length === 1 ? 'simulado' : 'simulados'}</span>
                    </div>
                </div>
                ${simulados.length
                    ? `<div class="history-runs">
                           ${simulados.map(simulado => renderSimuladoHistorico(
                               simulado,
                               questoesPorEdicao.get(String(simulado.edition)) || []
                           )).join('')}
                       </div>`
                    : '<div class="history-empty"><strong>Nenhum simulado salvo ainda.</strong><p>Quando você concluir um simulado conectado à sua conta, ele aparecerá aqui.</p></div>'
                }
            </section>
        `;
        bindHeaderEvents(app);
        scrollTop();
    } catch (erro) {
        if (state.screen !== 'HISTORY') return;

        if (!localStorage.getItem('token_oab')) {
            state.screen = 'LOGIN';
            render();
            return;
        }

        console.error('Erro ao carregar o histórico:', erro);
        app.innerHTML = `
            ${headerHTML}
            <section class="card history-card history-error">
                <div class="history-heading">
                    <h1>Não foi possível carregar o histórico</h1>
                    <button id="btn-history-home" class="btn-nav-outline">← Início</button>
                </div>
                <p>${escaparHTML(erro.message || 'Tente novamente em alguns instantes.')}</p>
                <button id="btn-retry-history" class="btn-primary">Tentar novamente</button>
            </section>
        `;
        bindHeaderEvents(app);
        app.querySelector('#btn-retry-history').addEventListener('click', render);
    }
}

function formatarResumoMaterias(respostas) {
    const materias = [...new Set(
        (Array.isArray(respostas) ? respostas : [])
            .map(resposta => resposta.subject)
            .filter(Boolean)
    )];
    return materias.length
        ? materias.map(formatarMateria).join(' · ')
        : 'Matéria não identificada';
}

function renderSimuladoAdmin(simulado, questoes) {
    const respostas = Array.isArray(simulado.answers) ? simulado.answers : [];
    return `
        <details class="admin-simulation">
            <summary>
                <span>${escaparHTML(simulado.edition)}º Exame · ${escaparHTML(formatarDataHistorico(simulado.submitted_at))}</span>
                <strong>${escaparHTML(simulado.score)} / ${escaparHTML(simulado.total_questions)}</strong>
            </summary>
            <div class="admin-simulation-content">
                <p>${escaparHTML(formatarResumoMaterias(respostas))}</p>
                <div class="admin-question-list">
                    ${respostas.map((resposta, index) =>
                        renderQuestaoHistorico(resposta, questoes, index + 1, simulado.edition)
                    ).join('') || '<p class="history-unavailable">Sem respostas registradas.</p>'}
                </div>
            </div>
        </details>
    `;
}

function atualizarResumoPainelAdmin(app, resumo) {
    const valores = {
        students: resumo.total_students,
        simulations: resumo.total_simulations,
        onlineTotal: resumo.online_total,
        onlineStudents: resumo.online_students,
        onlineAnonymous: resumo.online_anonymous,
    };

    for (const [chave, valor] of Object.entries(valores)) {
        const elemento = app.querySelector(`[data-admin-stat="${chave}"]`);
        if (elemento) elemento.textContent = String(valor);
    }

    const notaOnline = app.querySelector('[data-admin-online-note]');
    if (notaOnline) {
        notaOnline.textContent =
            `Online = atividade nos últimos ${Math.round(resumo.online_window_seconds / 60)} minutos. Contagens atualizadas automaticamente.`;
    }
}

function agendarAtualizacaoResumoAdmin(app) {
    adminRefreshTimer = window.setTimeout(async () => {
        if (state.screen !== 'ADMIN' || !app.isConnected) return;

        try {
            const painel = await carregarPainelAdmin();
            if (state.screen === 'ADMIN' && app.isConnected) {
                atualizarResumoPainelAdmin(app, painel.summary);
            }
        } catch (erro) {
            console.error('Erro ao atualizar os indicadores do painel administrativo:', erro);
        } finally {
            if (state.screen === 'ADMIN' && app.isConnected) {
                agendarAtualizacaoResumoAdmin(app);
            }
        }
    }, 30_000);
}

async function renderTelaAdmin(app, headerHTML) {
    app.innerHTML = `
        ${headerHTML}
        <section class="card card-result admin-card">
            <div class="history-heading">
                <div>
                    <h1>Painel administrativo</h1>
                    <p class="card-subtitle">Acompanhamento de alunos, simulados e atividade recente.</p>
                </div>
                <button id="btn-admin-home" class="btn-nav-outline">← Início</button>
            </div>
            <p class="history-loading" role="status">Carregando dados administrativos...</p>
        </section>
    `;
    bindHeaderEvents(app);

    try {
        const painel = await carregarPainelAdmin();
        if (state.screen !== 'ADMIN') return;

        const edicoes = [...new Set(
            painel.students.flatMap(estudante =>
                estudante.simulations.map(simulado => String(simulado.edition))
            )
        )];
        const bancos = await Promise.all(edicoes.map(async edicao => {
            try {
                return [edicao, await loadEditionQuestions(edicao)];
            } catch (erro) {
                console.error(`Erro ao carregar as questões do Exame ${edicao}:`, erro);
                return [edicao, []];
            }
        }));
        const questoesPorEdicao = new Map(bancos);
        if (state.screen !== 'ADMIN') return;

        const resumo = painel.summary;
        app.innerHTML = `
            ${headerHTML}
            <section class="card card-result admin-card">
                <div class="history-heading">
                    <div>
                        <h1>Painel administrativo</h1>
                        <p class="card-subtitle">Acompanhamento de alunos, simulados e atividade recente.</p>
                    </div>
                    <div class="history-heading-actions">
                        <button id="btn-admin-home" class="btn-nav-outline">← Início</button>
                        <button id="btn-admin-refresh" class="btn-nav-outline">Atualizar</button>
                    </div>
                </div>
                <p class="admin-online-note" data-admin-online-note>Online = atividade nos últimos ${Math.round(resumo.online_window_seconds / 60)} minutos. Contagens atualizadas automaticamente.</p>
                <div class="admin-stats">
                    <article class="admin-stat"><span>Alunos cadastrados</span><strong data-admin-stat="students">${escaparHTML(resumo.total_students)}</strong></article>
                    <article class="admin-stat"><span>Simulados realizados</span><strong data-admin-stat="simulations">${escaparHTML(resumo.total_simulations)}</strong></article>
                    <article class="admin-stat admin-stat-online-total"><span>Total online</span><strong data-admin-stat="onlineTotal">${escaparHTML(resumo.online_total)}</strong></article>
                    <article class="admin-stat admin-stat-online"><span>Alunos logados online</span><strong data-admin-stat="onlineStudents">${escaparHTML(resumo.online_students)}</strong></article>
                    <article class="admin-stat admin-stat-anonymous"><span>Anônimos online</span><strong data-admin-stat="onlineAnonymous">${escaparHTML(resumo.online_anonymous)}</strong></article>
                </div>
                <div class="admin-students-heading">
                    <h2>Alunos</h2>
                    <span>${painel.students.length} cadastrados</span>
                </div>
                ${painel.students.length
                    ? `<div class="admin-student-list">
                           ${painel.students.map(estudante => `
                               <details class="admin-student">
                                   <summary>
                                       <span class="admin-student-identity">
                                           <strong>${escaparHTML(estudante.name)}</strong>
                                           <span>${escaparHTML(estudante.email)}</span>
                                       </span>
                                       <span class="admin-student-count">${estudante.simulations.length} simulados</span>
                                   </summary>
                                   <div class="admin-student-content">
                                       ${estudante.simulations.map(simulado =>
                                           renderSimuladoAdmin(
                                               simulado,
                                               questoesPorEdicao.get(String(simulado.edition)) || []
                                           )
                                       ).join('') ||
                                           '<p class="history-unavailable">Este aluno ainda não realizou simulados.</p>'}
                                   </div>
                               </details>
                           `).join('')}
                       </div>`
                    : '<div class="history-empty">Nenhum aluno cadastrado.</div>'
                }
            </section>
        `;
        bindHeaderEvents(app);
        app.querySelector('#btn-admin-refresh').addEventListener('click', render);
        agendarAtualizacaoResumoAdmin(app);
    } catch (erro) {
        if (state.screen !== 'ADMIN') return;
        console.error('Erro ao carregar painel administrativo:', erro);
        app.innerHTML = `
            ${headerHTML}
            <section class="card admin-card history-error">
                <div class="history-heading">
                    <h1>Painel administrativo indisponível</h1>
                    <button id="btn-admin-home" class="btn-nav-outline">← Início</button>
                </div>
                <p>${escaparHTML(erro.message || 'Não foi possível carregar os dados.')}</p>
                <button id="btn-admin-retry" class="btn-primary">Tentar novamente</button>
            </section>
        `;
        bindHeaderEvents(app);
        app.querySelector('#btn-admin-retry').addEventListener('click', render);
    }
}

// --- FUNÇÃO AUXILIAR: Gera a Navbar discreta no topo direito ---
function getHeaderUsuarioHTML() {
    const estaLogado = Boolean(localStorage.getItem('token_oab'));
    const nomeUsuario = estaLogado
        ? (localStorage.getItem('user_name') || 'Estudante')
        : 'Anônimo';

    return `
        <header class="top-navbar">
            <div class="navbar-content">
                <span class="user-badge">👤 <strong>${escaparHTML(nomeUsuario)}</strong></span>
                <div class="auth-buttons-header">
                    ${estaLogado ? `
                        <button id="btn-dashboard" class="btn-nav-filled ${state.screen === 'HISTORY' ? 'is-active' : ''}" title="Histórico de Simulados" ${state.screen === 'HISTORY' ? 'aria-current="page"' : ''}>Histórico</button>
                        ${localStorage.getItem('is_admin') === 'true'
                            ? `<button id="btn-admin-nav" class="btn-nav-outline ${state.screen === 'ADMIN' ? 'is-active' : ''}" ${state.screen === 'ADMIN' ? 'aria-current="page"' : ''}>Admin</button>`
                            : ''
                        }
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

// --- FUNÇÃO AUXILIAR: Gerencia os cliques da Navbar (Login, Cadastrar, Sair) ---
function bindHeaderEvents(container) {
    const btnLogout = container.querySelector('#btn-logout');
    const btnLogin = container.querySelector('#btn-login-nav');
    const btnRegister = container.querySelector('#btn-register-nav');
    const btnDashboard = container.querySelector('#btn-dashboard');
    const btnAdmin = container.querySelector('#btn-admin-nav');
    const btnAdminHome = container.querySelector('#btn-admin-home');
    const btnHistoryHome = container.querySelector('#btn-history-home');

    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            localStorage.removeItem('token_oab');
            localStorage.removeItem('user_name');
            localStorage.removeItem('is_admin');
            atualizarPresenca().catch(erro => {
                console.error('Erro ao atualizar presença após sair:', erro);
            });
            alert('Você saiu da sua conta.');
            render();
        });
    }

    if (btnDashboard){
        btnDashboard.addEventListener('click', () => {
            state.screen = 'HISTORY';
            render();
        });
    }

    if (btnAdmin) {
        btnAdmin.addEventListener('click', () => {
            state.screen = 'ADMIN';
            render();
        });
    }

    if (btnAdminHome) {
        btnAdminHome.addEventListener('click', () => {
            state.screen = 'HOME';
            render();
        });
    }

    if (btnHistoryHome) {
        btnHistoryHome.addEventListener('click', () => {
            state.screen = 'HOME';
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
    if (adminRefreshTimer !== null) {
        window.clearTimeout(adminRefreshTimer);
        adminRefreshTimer = null;
    }
    let choice = null;
    const app = document.getElementById('app');
    app.classList.toggle('history-screen', state.screen === 'HISTORY' || state.screen === 'ADMIN');
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
                resetarTentativa();
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

        bindHeaderEvents(app)

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

        bindHeaderEvents(app)

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
    else if (state.screen === 'HISTORY') {
        if (!localStorage.getItem('token_oab')) {
            state.screen = 'LOGIN';
            render();
            return;
        }
        renderTelaHistorico(app, headerHTML);
    }
    else if (state.screen === 'ADMIN') {
        if (localStorage.getItem('is_admin') !== 'true') {
            state.screen = 'HOME';
            render();
            return;
        }
        renderTelaAdmin(app, headerHTML);
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
                bindHeaderEvents(app)
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

            bindHeaderEvents(app);

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

            bindHeaderEvents(app);

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
                resetarTentativa();
                render();
            });
        });
    }
}