import { userState, state } from "./state.js";
import {
    loadQuestions,
    loadEditionQuestions,
    enviarSimulado,
    login,
    cadastrar,
    solicitarRecuperacaoSenha,
    redefinirSenha,
    carregarPerfil,
    atualizarPerfil,
    historico,
    carregarPainelAdmin,
    atualizarPresenca,
    criarUsuarioAdmin,
    atualizarPermissaoAdmin,
    editarUsuarioAdmin,
    excluirUsuarioAdmin
} from "./api.js";
import {
    clearFieldErrors,
    confirmAction,
    notify,
    setFieldError,
    withButtonLoading,
} from "./notifications.js";
import {
    formatarTempo,
    iniciarCronometro,
    pararCronometro,
    segundosRestantes,
} from "./timer.js";
import { getExamSubjects, getSubjectLabel, getTimerOptions } from "./exam.js";
import {
    clearQuizProgress,
    saveQuizProgress,
} from "./quiz-progress.js";

let adminRefreshTimer = null;

function scrollTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

function resetarTentativa() {
    state.currentIndex = 0;
    state.totalQuestions = 0;
    state.correctAnswers = 0;
    state.currentResultIndex = 0;
    state.arrayAnswers = [];
    userState.correctAnswers = 0;
    userState.questionId = [];
    userState.answers = [];
    pararCronometro();
    state.timerDeadline = null;
    state.timerExpired = false;
    state.quizFinalized = false;
    state.selectedAnswer = null;
    state.answerRevealed = false;
    clearQuizProgress();
}

function finalizarSimulado(tempoEsgotado = false) {
    if (state.quizFinalized) return;

    state.quizFinalized = true;
    state.timerExpired = tempoEsgotado;
    pararCronometro();
    clearQuizProgress();
    if (tempoEsgotado) {
        notify('O tempo acabou. Confira as questões que você conseguiu responder.', 'info');
    }

    enviarSimulado(
        state.arrayAnswers,
        state.correctAnswers,
        state.editionSelected,
        state.totalQuestions
    );
    state.screen = 'RESULT';
    render();
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

function mostrarErroDeFormulario(form, message) {
    const texto = String(message || 'Confira os dados informados e tente novamente.');
    if (/email ou senha|credenciais/i.test(texto)) {
        form.querySelector('.form-error')?.remove();
        const error = document.createElement('p');
        error.className = 'form-error';
        error.setAttribute('role', 'alert');
        error.textContent = texto;
        form.prepend(error);
        return;
    }

    const campo = /email/i.test(texto)
        ? form.querySelector('[name="email"], #login-email')
        : /senha/i.test(texto)
            ? form.querySelector('[name="senha"], #login-password, #register-password')
            : /nome/i.test(texto)
                ? form.querySelector('[name="nome"], #register-name')
                : null;

    if (campo) {
        setFieldError(campo, texto);
    } else {
        notify(texto, 'error');
    }
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
    return getSubjectLabel(materia);
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

function renderUsuariosOnline(usuarios) {
    if (!usuarios.length) {
        return '<p class="history-unavailable">Nenhuma conta com atividade recente.</p>';
    }

    return `<ul class="admin-online-list">
        ${usuarios.map(usuario => `
            <li>
                <strong>${escaparHTML(usuario.name)}</strong>
                <span>${escaparHTML(usuario.email)}</span>
                <time datetime="${escaparHTML(usuario.last_activity)}">Ativo em ${escaparHTML(formatarDataHistorico(usuario.last_activity))}</time>
            </li>
        `).join('')}
    </ul>`;
}

function atualizarResumoPainelAdmin(app, painel) {
    const resumo = painel.summary;
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

    const listaOnline = app.querySelector('[data-admin-online-users]');
    if (listaOnline) listaOnline.innerHTML = renderUsuariosOnline(painel.online_users);

    for (const estudante of painel.students) {
        const item = app.querySelector(`[data-admin-user="${estudante.id}"]`);
        if (!item) continue;
        const status = item.querySelector('[data-admin-user-status]');
        if (status) status.textContent = estudante.online ? 'Online' : 'Offline';
        const role = item.querySelector('[data-admin-user-role]');
        if (role) role.textContent = estudante.is_admin ? 'Administrador' : 'Estudante';
        const roleButton = item.querySelector('[data-user-action="role"]');
        if (roleButton) {
            roleButton.dataset.userAdmin = String(estudante.is_admin);
            roleButton.textContent = estudante.is_admin
                ? 'Remover administrador'
                : 'Tornar administrador';
        }
    }
}

function agendarAtualizacaoResumoAdmin(app) {
    adminRefreshTimer = window.setTimeout(async () => {
        if (state.screen !== 'ADMIN' || !app.isConnected) return;

        try {
            const painel = await carregarPainelAdmin();
            if (state.screen === 'ADMIN' && app.isConnected) {
                atualizarResumoPainelAdmin(app, painel);
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
                <section class="admin-online-users" aria-labelledby="admin-online-title">
                    <div class="admin-students-heading">
                        <h2 id="admin-online-title">Contas online</h2>
                        <span>Atividade recente</span>
                    </div>
                    <div data-admin-online-users>${renderUsuariosOnline(painel.online_users)}</div>
                </section>
                <section class="admin-user-create" aria-labelledby="admin-create-title">
                    <h2 id="admin-create-title">Criar conta</h2>
                    <form id="admin-create-user" class="admin-user-form">
                        <label>Nome
                            <input name="nome" type="text" maxlength="120" autocomplete="name" required>
                        </label>
                        <label>Email
                            <input name="email" type="email" maxlength="150" autocomplete="email" required>
                        </label>
                        <label>Senha inicial
                            <input name="senha" type="password" minlength="8" autocomplete="new-password" required>
                        </label>
                        <label class="admin-checkbox-label">
                            <input name="is_admin" type="checkbox">
                            Criar como administrador
                        </label>
                        <button class="btn-primary" type="submit">Criar conta</button>
                    </form>
                    <p class="admin-online-note">A senha inicial deve ser compartilhada com segurança com a pessoa cadastrada.</p>
                </section>
                <div class="admin-students-heading">
                    <h2>Alunos</h2>
                    <span>${painel.students.length} cadastrados</span>
                </div>
                ${painel.students.length
                    ? `<div class="admin-student-list">
                           ${painel.students.map(estudante => `
                               <details class="admin-student" data-admin-user="${estudante.id}">
                                   <summary>
                                       <span class="admin-student-identity">
                                           <strong>${escaparHTML(estudante.name)}</strong>
                                           <span>${escaparHTML(estudante.email)}</span>
                                           <span class="admin-user-badges">
                                               <span data-admin-user-status>${estudante.online ? 'Online' : 'Offline'}</span>
                                               <span data-admin-user-role>${estudante.is_admin ? 'Administrador' : 'Estudante'}</span>
                                           </span>
                                       </span>
                                       <span class="admin-student-count">${estudante.simulations.length} simulados</span>
                                   </summary>
                                   <div class="admin-student-content">
                                       <div class="admin-user-actions">
                                           <button class="btn-nav-outline" type="button" data-user-action="role" data-user-id="${estudante.id}" data-user-admin="${estudante.is_admin}">
                                               ${estudante.is_admin ? 'Remover administrador' : 'Tornar administrador'}
                                           </button>
                                           <button class="btn-nav-outline admin-delete-user" type="button" data-user-action="delete" data-user-id="${estudante.id}" data-user-name="${escaparHTML(estudante.name)}">
                                               Excluir conta
                                           </button>
                                           <details class="admin-user-edit">
                                               <summary>Editar conta</summary>
                                               <form class="admin-user-edit-form" data-user-id="${estudante.id}">
                                                   <label>Nome
                                                       <input name="nome" type="text" maxlength="120" value="${escaparHTML(estudante.name)}" required>
                                                   </label>
                                                   <label>Email
                                                       <input name="email" type="email" maxlength="150" value="${escaparHTML(estudante.email)}" required>
                                                   </label>
                                                   <label>Nova senha (opcional)
                                                       <input name="senha" type="password" minlength="8" autocomplete="new-password">
                                                   </label>
                                                   <button class="btn-nav-outline" type="submit">Salvar alterações</button>
                                               </form>
                                           </details>
                                       </div>
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
        app.querySelector('#admin-create-user').addEventListener('submit', async event => {
            event.preventDefault();
            const form = event.currentTarget;
            clearFieldErrors(form);
            const dados = new FormData(form);
            const button = form.querySelector('[type="submit"]');
            await withButtonLoading(button, async () => {
                try {
                    await criarUsuarioAdmin({
                        nome: dados.get('nome'),
                        email: dados.get('email'),
                        senha: dados.get('senha'),
                        is_admin: dados.get('is_admin') === 'on',
                    });
                    notify('Conta criada com sucesso.', 'success');
                    render();
                } catch (erro) {
                    mostrarErroDeFormulario(form, erro.message || 'Não foi possível criar a conta.');
                }
            }, 'Criando...');
        });
        app.querySelector('.admin-student-list')?.addEventListener('click', async event => {
            const botao = event.target.closest('[data-user-action]');
            if (!botao) return;

            const id = Number(botao.dataset.userId);
            if (botao.dataset.userAction === 'delete') {
                const confirmou = await confirmAction({
                    title: `Excluir a conta de ${botao.dataset.userName}?`,
                    message: 'Os dados pessoais serão removidos. Os simulados serão mantidos anonimizados, e a conta não poderá mais entrar.',
                    confirmLabel: 'Excluir conta',
                    danger: true,
                });
                if (!confirmou) return;
            }

            await withButtonLoading(botao, async () => {
                try {
                    if (botao.dataset.userAction === 'role') {
                        const isAdmin = botao.dataset.userAdmin !== 'true';
                        await atualizarPermissaoAdmin(id, isAdmin);
                        notify(
                            isAdmin
                                ? 'Permissão de administrador concedida.'
                                : 'Permissão de administrador removida.',
                            'success'
                        );
                    } else if (botao.dataset.userAction === 'delete') {
                        await excluirUsuarioAdmin(id);
                        notify('Conta excluída e dados pessoais anonimizados.', 'success');
                    }
                    render();
                } catch (erro) {
                    notify(erro.message || 'Não foi possível atualizar a conta.', 'error');
                }
            }, botao.dataset.userAction === 'delete' ? 'Excluindo...' : 'Salvando...');
        });
        app.querySelector('.admin-student-list')?.addEventListener('submit', async event => {
            const form = event.target.closest('.admin-user-edit-form');
            if (!form) return;
            event.preventDefault();
            clearFieldErrors(form);

            const dados = new FormData(form);
            const usuario = {
                nome: dados.get('nome'),
                email: dados.get('email'),
            };
            const senha = dados.get('senha');
            if (senha) usuario.senha = senha;

            const button = form.querySelector('[type="submit"]');
            await withButtonLoading(button, async () => {
                try {
                    await editarUsuarioAdmin(Number(form.dataset.userId), usuario);
                    notify('Dados da conta atualizados.', 'success');
                    render();
                } catch (erro) {
                    mostrarErroDeFormulario(form, erro.message || 'Não foi possível atualizar os dados da conta.');
                }
            }, 'Salvando...');
        });
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
    const temaRoxoAtivo = document.documentElement.dataset.theme === 'purple';

    return `
        <header class="top-navbar">
            <div class="navbar-content">
                <button
                    id="btn-theme-toggle"
                    class="btn-theme-toggle"
                    type="button"
                    aria-label="${temaRoxoAtivo ? 'Ativar tema padrão' : 'Ativar tema roxo'}"
                    aria-pressed="${temaRoxoAtivo}"
                >${temaRoxoAtivo ? 'Tema padrão' : 'Tema roxo'}</button>
                <span class="user-badge">👤 <strong>${escaparHTML(nomeUsuario)}</strong></span>
                <div class="auth-buttons-header">
                    ${estaLogado ? `
                        <button id="btn-dashboard" class="btn-nav-filled ${state.screen === 'HISTORY' ? 'is-active' : ''}" title="Histórico de Simulados" ${state.screen === 'HISTORY' ? 'aria-current="page"' : ''}>Histórico</button>
                        <button id="btn-account-nav" class="btn-nav-outline ${state.screen === 'ACCOUNT' ? 'is-active' : ''}" ${state.screen === 'ACCOUNT' ? 'aria-current="page"' : ''}>Minha conta</button>
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
    const btnTheme = container.querySelector('#btn-theme-toggle');
    const btnLogout = container.querySelector('#btn-logout');
    const btnLogin = container.querySelector('#btn-login-nav');
    const btnRegister = container.querySelector('#btn-register-nav');
    const btnDashboard = container.querySelector('#btn-dashboard');
    const btnAccount = container.querySelector('#btn-account-nav');
    const btnAccountHome = container.querySelector('#btn-account-home');
    const btnAdmin = container.querySelector('#btn-admin-nav');
    const btnAdminHome = container.querySelector('#btn-admin-home');
    const btnHistoryHome = container.querySelector('#btn-history-home');

    if (btnTheme) {
        btnTheme.addEventListener('click', () => {
            const temaRoxoAtivo = document.documentElement.dataset.theme !== 'purple';
            document.documentElement.dataset.theme = temaRoxoAtivo ? 'purple' : 'default';
            localStorage.setItem('site_theme', temaRoxoAtivo ? 'purple' : 'default');
            btnTheme.textContent = temaRoxoAtivo ? 'Tema padrão' : 'Tema roxo';
            btnTheme.setAttribute('aria-label', temaRoxoAtivo ? 'Ativar tema padrão' : 'Ativar tema roxo');
            btnTheme.setAttribute('aria-pressed', String(temaRoxoAtivo));
        });
    }

    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            localStorage.removeItem('token_oab');
            localStorage.removeItem('user_name');
            localStorage.removeItem('is_admin');
            localStorage.removeItem('account_last_activity_at');
            atualizarPresenca().catch(erro => {
                console.error('Erro ao atualizar presença após sair:', erro);
            });
            notify('Você saiu da sua conta.', 'info');
            render();
        });
    }

    if (btnDashboard){
        btnDashboard.addEventListener('click', () => {
            state.screen = 'HISTORY';
            render();
        });
    }

    if (btnAccount) {
        btnAccount.addEventListener('click', () => {
            state.screen = 'ACCOUNT';
            render();
        });
    }

    if (btnAccountHome) {
        btnAccountHome.addEventListener('click', () => {
            state.screen = 'HOME';
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

async function renderTelaConta(app, headerHTML) {
    app.innerHTML = `
        ${headerHTML}
        <section class="card">
            <div class="history-heading">
                <h1>Minha conta</h1>
                <button id="btn-account-home" class="btn-nav-outline">← Início</button>
            </div>
            <p class="card-subtitle">Atualize seus dados ou altere sua senha.</p>
            <p role="status">Carregando seus dados...</p>
        </section>
    `;
    bindHeaderEvents(app);

    try {
        const perfil = await carregarPerfil();
        if (state.screen !== 'ACCOUNT') return;
        const estudante = perfil.estudante || perfil;

        app.innerHTML = `
            ${headerHTML}
            <section class="card">
                <div class="history-heading">
                    <h1>Minha conta</h1>
                    <button id="btn-account-home" class="btn-nav-outline">← Início</button>
                </div>
                <p class="card-subtitle">Para salvar alterações, confirme sua senha atual.</p>
                <form id="account-form" class="auth-form">
                    <div class="form-group">
                        <label for="account-name">Nome</label>
                        <input type="text" id="account-name" class="input-edicao" maxlength="120" value="${escaparHTML(estudante.nome)}" required>
                    </div>
                    <div class="form-group">
                        <label for="account-email">E-mail</label>
                        <input type="email" id="account-email" class="input-edicao" maxlength="150" value="${escaparHTML(estudante.email)}" required>
                    </div>
                    <div class="form-group">
                        <label for="account-current-password">Senha atual</label>
                        <input type="password" id="account-current-password" class="input-edicao" autocomplete="current-password" required>
                    </div>
                    <div class="form-group">
                        <label for="account-new-password">Nova senha <span>(opcional)</span></label>
                        <input type="password" id="account-new-password" class="input-edicao" minlength="8" autocomplete="new-password">
                    </div>
                    <div class="form-group">
                        <label for="account-confirm-password">Confirme a nova senha</label>
                        <input type="password" id="account-confirm-password" class="input-edicao" minlength="8" autocomplete="new-password">
                    </div>
                    <button class="btn-primary btn-full" type="submit">Salvar alterações</button>
                </form>
            </section>
        `;
        bindHeaderEvents(app);

        const form = app.querySelector('#account-form');
        form.addEventListener('input', () => clearFieldErrors(form));
        form.addEventListener('submit', async event => {
            event.preventDefault();
            const novaSenha = app.querySelector('#account-new-password').value;
            const confirmaSenha = app.querySelector('#account-confirm-password').value;
            if (novaSenha && novaSenha !== confirmaSenha) {
                mostrarErroDeFormulario(form, 'As novas senhas não conferem.');
                return;
            }
            if (!novaSenha && confirmaSenha) {
                mostrarErroDeFormulario(form, 'Informe uma nova senha ou deixe os dois campos em branco.');
                return;
            }

            const payload = {
                nome: app.querySelector('#account-name').value.trim(),
                email: app.querySelector('#account-email').value.trim(),
                senha_atual: app.querySelector('#account-current-password').value,
            };
            if (novaSenha) payload.nova_senha = novaSenha;

            await withButtonLoading(form.querySelector('[type="submit"]'), async () => {
                try {
                    await atualizarPerfil(payload);
                    notify('Seus dados foram atualizados.', 'success');
                    render();
                } catch (erro) {
                    notify(erro.message || 'Não foi possível atualizar sua conta.', 'error');
                }
            }, 'Salvando...');
        });
    } catch (erro) {
        if (state.screen !== 'ACCOUNT') return;
        if (!localStorage.getItem('token_oab')) {
            state.screen = 'LOGIN';
            render();
            return;
        }
        console.error('Erro ao carregar os dados da conta:', erro);
        app.innerHTML = `
            ${headerHTML}
            <section class="card history-error">
                <div class="history-heading">
                    <h1>Não foi possível carregar sua conta</h1>
                    <button id="btn-account-home" class="btn-nav-outline">← Início</button>
                </div>
                <p>${escaparHTML(erro.message || 'Tente novamente em alguns instantes.')}</p>
                <button class="btn-primary" id="btn-retry-account">Tentar novamente</button>
            </section>
        `;
        bindHeaderEvents(app);
        app.querySelector('#btn-retry-account').addEventListener('click', render);
    }
}

export function render() {
    if (adminRefreshTimer !== null) {
        window.clearTimeout(adminRefreshTimer);
        adminRefreshTimer = null;
    }
    const app = document.getElementById('app');
    app.classList.toggle('history-screen', state.screen === 'HISTORY' || state.screen === 'ADMIN');
    const headerHTML = getHeaderUsuarioHTML();

    // --- TELA: HOME ---
    if (state.screen === 'HOME') {
        app.innerHTML = `
            ${headerHTML}

            <div class="card">
                <h1>Simulados OAB — 1ª Fase</h1>
                <p><strong>Escolha como deseja praticar</strong></p>

                <div class="simulation-mode-switch" role="group" aria-label="Tipo de simulado">
                    <button class="simulation-mode-option" type="button" data-simulation-mode="full" aria-pressed="${state.simulationMode === 'full'}">
                        Prova completa <span>80 questões</span>
                    </button>
                    <button class="simulation-mode-option" type="button" data-simulation-mode="subject" aria-pressed="${state.simulationMode === 'subject'}">
                        Por matéria <span>Questões da matéria escolhida</span>
                    </button>
                </div>
                <p id="simulation-mode-help" class="simulation-mode-help"></p>

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
                <div class="subject-selection" id="subject-selection">
                    <label for="subject">Matéria</label>
                    <select class="input-edicao" id="subject" name="subject" disabled>
                        <option value="">Carregando matérias...</option>
                    </select>
                </div>
                <div class="timer-selection">
                    <label for="timer-duration">Tempo do simulado</label>
                    <select class="input-edicao" id="timer-duration" aria-describedby="timer-duration-help">
                    </select>
                    <p id="timer-duration-help"></p>
                </div>
                <button id="btn-iniciar" class="btn-primary" disabled>Iniciar simulado</button>
            </div>

            <section class="seo-content" aria-labelledby="sobre-simulado">
                <h2 id="sobre-simulado">Prepare-se para a 1ª fase do Exame de Ordem</h2>
                <p>Pratique para a prova da OAB com questões de exames anteriores. Escolha a prova completa com 80 questões ou um simulado por matéria, e selecione a edição desejada.</p>
                <h3>Como funciona o simulado</h3>
                <p>Responda às questões da edição escolhida, use o cronômetro opcional e confira seu desempenho ao concluir. Na modalidade por matéria, todas as disciplinas disponíveis naquela edição podem ser selecionadas.</p>
            </section>
        `;

        // Ativa os eventos da Navbar
        bindHeaderEvents(app);

        const start = app.querySelector('#btn-iniciar');
        const edition = app.querySelector('#edicao');
        const timerDuration = app.querySelector('#timer-duration');
        const subjectSelection = app.querySelector('#subject-selection');
        const subjectSelect = app.querySelector('#subject');
        const modeHelp = app.querySelector('#simulation-mode-help');
        const timerHelp = app.querySelector('#timer-duration-help');
        const modeOptions = app.querySelectorAll('[data-simulation-mode]');
        let subjectLoadVersion = 0;

        edition.value = state.editionSelected;

        const atualizarOpcoesDeTempo = () => {
            const fullExam = state.simulationMode === 'full';
            const selectedValue = state.timerDurationMinutes === null
                ? 'none'
                : String(state.timerDurationMinutes);
            const options = getTimerOptions(state.simulationMode).map(option => [
                option.minutes === null ? 'none' : String(option.minutes),
                option.label,
            ]);

            timerDuration.innerHTML = options.map(([value, label]) =>
                `<option value="${value}">${label}</option>`
            ).join('');
            timerDuration.value = options.some(([value]) => value === selectedValue)
                ? selectedValue
                : (fullExam ? '300' : 'none');
            state.timerDurationMinutes = timerDuration.value === 'none'
                ? null
                : Number(timerDuration.value);
            subjectSelection.hidden = fullExam;
            modeHelp.textContent = fullExam
                ? 'Responda às 80 questões da edição escolhida, na ordem original da prova.'
                : 'Escolha uma das matérias disponíveis nesta edição para responder às questões correspondentes.';
            timerHelp.textContent = fullExam
                ? 'A prova oficial tem 80 questões e duração de até 5 horas.'
                : 'A média proporcional é 30 minutos para 8 questões. Você pode acrescentar 5 minutos por opção, até 1 hora.';
        };

        const carregarMaterias = async () => {
            const loadVersion = ++subjectLoadVersion;
            subjectSelect.disabled = true;
            subjectSelect.innerHTML = '<option value="">Carregando matérias...</option>';
            start.disabled = true;

            try {
                const questions = await loadEditionQuestions(state.editionSelected);
                if (loadVersion !== subjectLoadVersion) return;

                const subjects = getExamSubjects(questions);
                subjectSelect.innerHTML = `
                    <option value="">Selecione uma matéria</option>
                    ${subjects.map(subject =>
                        `<option value="${escaparHTML(subject)}">${escaparHTML(getSubjectLabel(subject))}</option>`
                    ).join('')}
                `;
                subjectSelect.disabled = subjects.length === 0;
                state.subject = state.simulationMode === 'subject'
                    && subjects.includes(state.subject)
                    ? state.subject
                    : null;
                subjectSelect.value = state.subject || '';
                start.disabled = subjects.length === 0
                    || (state.simulationMode === 'subject' && !state.subject);
            } catch (erro) {
                if (loadVersion !== subjectLoadVersion) return;
                console.error('Erro ao carregar as matérias do exame:', erro);
                subjectSelect.innerHTML = '<option value="">Não foi possível carregar as matérias</option>';
                notify(erro.message || 'Não foi possível carregar as matérias desta edição.', 'error');
            }
        };

        atualizarOpcoesDeTempo();
        carregarMaterias();

        edition.addEventListener('change', event => {
            state.editionSelected = event.target.value;
            state.subject = null;
            carregarMaterias();
        });

        timerDuration.addEventListener('change', event => {
            state.timerDurationMinutes = event.target.value === 'none'
                ? null
                : Number(event.target.value);
        });

        subjectSelect.addEventListener('change', event => {
            state.subject = event.target.value || null;
            if (state.simulationMode === 'subject') {
                start.disabled = !state.subject;
            }
        });

        modeOptions.forEach(button => {
            button.addEventListener('click', () => {
                const newMode = button.dataset.simulationMode;
                if (state.simulationMode === newMode) return;

                state.simulationMode = newMode;
                if (newMode === 'full') {
                    state.subject = null;
                    state.timerDurationMinutes = 300;
                } else {
                    state.timerDurationMinutes = null;
                }
                modeOptions.forEach(option =>
                    option.setAttribute('aria-pressed', String(option === button))
                );
                atualizarOpcoesDeTempo();
                if (newMode === 'subject' && !subjectSelect.options.length) {
                    carregarMaterias();
                } else if (newMode === 'subject') {
                    state.subject = subjectSelect.value || null;
                    start.disabled = !state.subject;
                } else {
                    start.disabled = false;
                }
            });
        });

        start.addEventListener("click", () => {
            if (state.simulationMode === 'subject' && state.subject === null) {
                notify('Escolha uma matéria para iniciar o simulado.', 'error');
            } else {
                resetarTentativa();
                state.timerDeadline = state.timerDurationMinutes === null
                    ? null
                    : Date.now() + state.timerDurationMinutes * 60_000;
                state.screen = 'QUIZ';
                saveQuizProgress();
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
                        <input type="password" id="login-password" class="input-edicao" placeholder="••••••••" autocomplete="current-password" required>
                    </div>

                    <button type="submit" class="btn-primary btn-full">Entrar</button>
                </form>

                <div class="form-footer">
                    <span>Ainda não tem conta?</span> 
                    <button id="go-to-register" class="btn-link">Cadastre-se</button>
                </div>
                
                <div style="text-align: center; margin-top: 12px;">
                    <button id="btn-forgot-password" class="btn-link">Esqueci minha senha</button>
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
        const btnForgotPassword = app.querySelector('#btn-forgot-password');

        btnGoRegister.addEventListener('click', () => {
            state.screen = 'REGISTER';
            render();
        });

        btnBackHome.addEventListener('click', () => {
            state.screen = 'HOME';
            render();
        });

        btnForgotPassword.addEventListener('click', () => {
            state.screen = 'PASSWORD_RECOVERY';
            render();
        });

        formLogin.addEventListener('input', () => clearFieldErrors(formLogin));
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = app.querySelector('#login-email').value;
            const senha = app.querySelector('#login-password').value;

            const button = formLogin.querySelector('[type="submit"]');
            await withButtonLoading(button, async () => {
                const resultado = await login(email, senha);
                if (resultado.sucesso) {
                    notify('Bem-vindo de volta!', 'success');
                    state.screen = 'HOME';
                    render();
                } else {
                    mostrarErroDeFormulario(formLogin, resultado.erro);
                }
            }, 'Entrando...');
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
                        <input type="password" id="register-password" class="input-edicao" placeholder="Crie uma senha" minlength="8" autocomplete="new-password" required>
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

        formRegister.addEventListener('input', () => clearFieldErrors(formRegister));
        formRegister.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nome = app.querySelector('#register-name').value;
            const email = app.querySelector('#register-email').value;
            const senha = app.querySelector('#register-password').value;

            const button = formRegister.querySelector('[type="submit"]');
            await withButtonLoading(button, async () => {
                const resultado = await cadastrar(nome, email, senha);
                if (resultado.sucesso) {
                    notify('Conta criada. Agora entre com seu email e senha.', 'success');
                    state.screen = 'LOGIN';
                    render();
                } else {
                    mostrarErroDeFormulario(formRegister, resultado.erro);
                }
            }, 'Criando conta...');
        });
    }
    else if (state.screen === 'PASSWORD_RECOVERY') {
        app.innerHTML = `
            ${headerHTML}
            <section class="card">
                <h1>Recuperar senha</h1>
                <p class="card-subtitle">Informe seu e-mail. Se houver uma conta com esse endereço, enviaremos um link para criar uma nova senha.</p>
                <form id="recovery-form" class="auth-form">
                    <div class="form-group">
                        <label for="recovery-email">E-mail</label>
                        <input type="email" id="recovery-email" class="input-edicao" autocomplete="email" required>
                    </div>
                    <button class="btn-primary btn-full" type="submit">Enviar link de recuperação</button>
                </form>
                <div class="form-footer">
                    <button id="recovery-back-login" class="btn-link">Voltar ao login</button>
                </div>
            </section>
        `;
        bindHeaderEvents(app);

        app.querySelector('#recovery-back-login').addEventListener('click', () => {
            state.screen = 'LOGIN';
            render();
        });

        const form = app.querySelector('#recovery-form');
        form.addEventListener('submit', async event => {
            event.preventDefault();
            await withButtonLoading(form.querySelector('[type="submit"]'), async () => {
                try {
                    await solicitarRecuperacaoSenha(app.querySelector('#recovery-email').value.trim());
                    notify('Se o e-mail estiver cadastrado, você receberá instruções para redefinir a senha.', 'success');
                } catch (erro) {
                    notify(erro.message || 'Não foi possível solicitar a recuperação agora.', 'error');
                }
            }, 'Enviando...');
        });
    }
    else if (state.screen === 'RESET_PASSWORD') {
        if (!state.resetToken) {
            state.screen = 'PASSWORD_RECOVERY';
            render();
            return;
        }

        app.innerHTML = `
            ${headerHTML}
            <section class="card">
                <h1>Criar nova senha</h1>
                <p class="card-subtitle">Escolha uma senha com pelo menos 8 caracteres.</p>
                <form id="reset-password-form" class="auth-form">
                    <div class="form-group">
                        <label for="reset-password">Nova senha</label>
                        <input type="password" id="reset-password" class="input-edicao" minlength="8" autocomplete="new-password" required>
                    </div>
                    <div class="form-group">
                        <label for="reset-password-confirm">Confirmar nova senha</label>
                        <input type="password" id="reset-password-confirm" class="input-edicao" minlength="8" autocomplete="new-password" required>
                    </div>
                    <button class="btn-primary btn-full" type="submit">Redefinir senha</button>
                </form>
                <div class="form-footer">
                    <button id="btn-request-another-reset" class="btn-link">Solicitar outro link</button>
                </div>
            </section>
        `;
        bindHeaderEvents(app);

        const form = app.querySelector('#reset-password-form');
        app.querySelector('#btn-request-another-reset').addEventListener('click', () => {
            state.resetToken = null;
            window.history.replaceState({}, '', window.location.pathname);
            state.screen = 'PASSWORD_RECOVERY';
            render();
        });
        form.addEventListener('submit', async event => {
            event.preventDefault();
            const senha = app.querySelector('#reset-password').value;
            const confirmacao = app.querySelector('#reset-password-confirm').value;
            if (senha !== confirmacao) {
                mostrarErroDeFormulario(form, 'As senhas não conferem.');
                return;
            }

            await withButtonLoading(form.querySelector('[type="submit"]'), async () => {
                try {
                    await redefinirSenha(state.resetToken, senha);
                    state.resetToken = null;
                    window.history.replaceState({}, '', window.location.pathname);
                    state.screen = 'LOGIN';
                    notify('Senha redefinida. Entre com sua nova senha.', 'success');
                    render();
                } catch (erro) {
                    notify(erro.message || 'Não foi possível redefinir a senha.', 'error');
                }
            }, 'Redefinindo...');
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
    else if (state.screen === 'ACCOUNT') {
        if (!localStorage.getItem('token_oab')) {
            state.screen = 'LOGIN';
            render();
            return;
        }
        renderTelaConta(app, headerHTML);
    }

    // --- TELA: QUIZ ---
    else if (state.screen === 'QUIZ') {
        if (state.timerDeadline) {
            iniciarCronometro(
                state.timerDeadline,
                () => finalizarSimulado(true),
                state.simulationMode === 'full',
            );
        }
        saveQuizProgress();

        loadQuestions(state.editionSelected).then(questoes => {
            if (state.screen !== 'QUIZ' || state.quizFinalized) return;

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
                finalizarSimulado();
                return;
            };
            
            scrollTop();
            app.innerHTML = `
                ${headerHTML}
                <div class="card" style="text-align: center;">
                    <div class="quiz-heading">
                        <button class="btn-quiz-exit" id="btn-sair-simulado" type="button">Sair do simulado</button>
                        <h1>${state.simulationMode === 'full'
                            ? `Simulado completo — ${state.editionSelected}º Exame`
                            : `Simulado de ${escaparHTML(getSubjectLabel(state.subject))}`
                        }</h1>
                        ${state.timerDeadline
                            ? `<div class="countdown" data-countdown role="timer" aria-label="Tempo restante para o simulado">
                                   <span>Tempo restante</span>
                                   <strong data-timer-display>${formatarTempo(
                                       segundosRestantes(state.timerDeadline),
                                       state.simulationMode === 'full',
                                   )}</strong>
                               </div>`
                            : '<span class="timer-unlimited">Sem limite</span>'
                        }
                    </div>
                    <div class="quiz-session-controls">
                        <span class="quiz-progress">
                            ${state.currentIndex + 1} / ${questoes.length}
                        </span>
                    </div>
                    <div id="container-question">Carregando questões...</div>
                </div>
            `;

            bindHeaderEvents(app);

            app.querySelector('#btn-sair-simulado').addEventListener('click', async () => {
                const confirmou = await confirmAction({
                    title: 'Sair do simulado?',
                    message: 'Seu progresso atual será descartado e você voltará à página inicial.',
                    confirmLabel: 'Sair do simulado',
                    danger: true,
                });
                if (!confirmou) return;

                state.screen = 'HOME';
                state.subject = null;
                resetarTentativa();
                notify('Você saiu do simulado. Seu progresso foi descartado.', 'info');
                render();
            });

            const container = document.getElementById('container-question');
            state.totalQuestions = questoes.length;
            const questao = questoes[state.currentIndex];
            const letters = ['a', 'b', 'c', 'd'];
            const correta = String(questao.correta || '').toLowerCase();
            const alternativaCorreta = questao.alternativas?.[correta];
            const respostaHTML = `
                <strong>Resposta correta: ${escaparHTML(correta.toUpperCase())}.</strong>
                ${alternativaCorreta ? `<p>${escaparHTML(alternativaCorreta)}</p>` : ''}
                <div>${formatarComentario(questao.comentario)}</div>
            `;
            let buttonsHTML = '';

            letters.forEach(letter => {
                buttonsHTML += `
                <button class="btn-alternativa ${state.selectedAnswer === letter ? 'ativo' : ''}" data-letra="${letter}">
                    <strong>${letter.toUpperCase()}.</strong> ${questao.alternativas[letter]}
                </button>
                `;
            });

            container.innerHTML = `
            <p class="enunciado"><strong> Questão ${questao.id} (${state.editionSelected}º Exame OAB 1ª Fase). </strong>${questao.enunciado}</p>
            <div class="container-alternativas">
                ${buttonsHTML}
            </div>
            <div class="quiz-actions">
                <button class="btn-quiz-reveal" id="btn-ver-resposta" type="button" aria-expanded="${state.answerRevealed}" aria-controls="resposta-correta">
                    ${state.answerRevealed ? 'Ocultar resposta' : 'Ver resposta'}
                </button>
                <button class="btn-primary" id="btn-confirmar" type="button">Confirmar resposta</button>
            </div>
            <section class="quiz-answer" id="resposta-correta" aria-live="polite" ${state.answerRevealed ? '' : 'hidden'}>
                ${state.answerRevealed ? respostaHTML : ''}
            </section>
            `;

            const choiceButton = container.querySelectorAll(".btn-alternativa");
            choiceButton.forEach(botao => {
                botao.addEventListener('click', (e) => {
                    choiceButton.forEach(b => b.classList.remove('ativo'));
                    e.currentTarget.classList.add('ativo');
                    state.selectedAnswer = e.currentTarget.getAttribute('data-letra');
                    saveQuizProgress();
                });
            });

            const confirm = app.querySelector('#btn-confirmar');
            confirm.addEventListener("click", () => {
                if (state.selectedAnswer === null){
                    notify('Escolha uma alternativa para continuar.', 'error');
                    return;
                };

                userState.answers.push(state.selectedAnswer);
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
                    selected_option: state.selectedAnswer,
                    is_correct: acertou
                });

                state.currentIndex++;
                state.selectedAnswer = null;
                state.answerRevealed = false;
                saveQuizProgress();
                render();
            });

            const revealButton = app.querySelector('#btn-ver-resposta');
            const answerPanel = app.querySelector('#resposta-correta');
            revealButton.addEventListener('click', () => {
                state.answerRevealed = !state.answerRevealed;
                answerPanel.hidden = !state.answerRevealed;
                revealButton.textContent = state.answerRevealed
                    ? 'Ocultar resposta'
                    : 'Ver resposta';
                revealButton.setAttribute('aria-expanded', String(state.answerRevealed));

                if (state.answerRevealed) {
                    answerPanel.innerHTML = respostaHTML;
                }
                saveQuizProgress();
            });
        }).catch(erro => {
            if (state.screen !== 'QUIZ' || state.quizFinalized) return;
            console.error('Erro ao carregar as questões do simulado:', erro);
            app.innerHTML = `
                ${headerHTML}
                <section class="card history-error">
                    <h1>Não foi possível carregar as questões</h1>
                    <p>${escaparHTML(erro.message || 'Tente novamente em alguns instantes.')}</p>
                    <button class="btn-primary" id="btn-retry-questions">Tentar novamente</button>
                </section>
            `;
            bindHeaderEvents(app);
            app.querySelector('#btn-retry-questions').addEventListener('click', render);
        });
    }

    // --- TELA: RESULT ---
    else if (state.screen == "RESULT"){
        if (state.currentResultIndex == undefined){
            state.currentResultIndex = 0;
        };

        loadQuestions(state.editionSelected).then(questoes => {
            if (state.screen !== 'RESULT') return;

            if (userState.answers.length === 0) {
                app.innerHTML = `
                    ${headerHTML}
                    <section class="card card-result" style="text-align: center;">
                        <h1>${state.timerExpired ? 'Tempo esgotado' : 'Simulado concluído'}</h1>
                        <p>Você não respondeu nenhuma questão${state.timerExpired ? ' antes do fim do tempo' : ''}.</p>
                        <button class="btn-primary" id="btn-reiniciar">Voltar ao início</button>
                    </section>
                `;
                bindHeaderEvents(app);
                app.querySelector('#btn-reiniciar').addEventListener('click', () => {
                    state.screen = 'HOME';
                    state.subject = null;
                    resetarTentativa();
                    render();
                });
                return;
            }

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
                        ${state.timerExpired
                            ? '<p class="countdown-expired">Tempo esgotado. Veja abaixo as questões respondidas.</p>'
                            : ''
                        }
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

                            <div class="gabarito-comentario" style="margin-top: 15px; padding: 12px; background-color: rgba(255, 255, 255, 0.03); border-radius: 6px; border-left: 3px solid var(--primary);">
                                <strong style="color: var(--accent); display: block; margin-bottom: 5px;">Gabarito Detalhado:</strong>
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
        }).catch(erro => {
            if (state.screen !== 'RESULT') return;
            console.error('Erro ao carregar as questões do resultado:', erro);
            app.innerHTML = `
                ${headerHTML}
                <section class="card history-error">
                    <h1>Não foi possível carregar a revisão</h1>
                    <p>${escaparHTML(erro.message || 'Tente novamente em alguns instantes.')}</p>
                    <button class="btn-primary" id="btn-retry-result">Tentar novamente</button>
                </section>
            `;
            bindHeaderEvents(app);
            app.querySelector('#btn-retry-result').addEventListener('click', render);
        });
    }
}