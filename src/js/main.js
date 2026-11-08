import { render } from "./views.js";
import {
    atualizarPresenca,
    carregarPerfil,
    registrarAtividadeSessao,
} from "./api.js";
import {
    protectQuizFromAccidentalExit,
    restoreQuizProgress,
} from "./quiz-progress.js";
import { notify } from "./notifications.js";
import { state } from "./state.js";
import { applySavedTheme } from "./themes.js";
import "./nav-animations.js";

const ACCOUNT_ACTIVITY_KEY = 'account_last_activity_at';
const ACCOUNT_IDLE_LIMIT = 60 * 60 * 1000;
const ACTIVITY_SYNC_INTERVAL = 2 * 60 * 1000;

// Inicialização
window.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('token_oab')) {
        localStorage.removeItem('can_use_personal_theme');
    }
    applySavedTheme();

    const normalizedPath = window.location.pathname.replace(/\/+$/, '') || '/';
    const isAppPath = normalizedPath === '/' || normalizedPath === '/index.html';
    const resetToken = new URLSearchParams(window.location.search).get('reset_token');
    if (!isAppPath) {
        state.screen = 'NOT_FOUND';
    } else if (resetToken) {
        state.screen = 'RESET_PASSWORD';
        state.resetToken = resetToken;
    }
    const quizRestaurado = state.screen !== 'RESET_PASSWORD' && restoreQuizProgress();
    protectQuizFromAccidentalExit();
    render();
    if (localStorage.getItem('token_oab')) {
        carregarPerfil()
            .then(() => {
                applySavedTheme();
                render();
            })
            .catch(erro => {
                console.error('Erro ao verificar permissões da conta:', erro);
                if (!localStorage.getItem('token_oab')) render();
            });
    }
    if (quizRestaurado) {
        notify('Seu simulado foi restaurado de onde você parou.', 'info');
    }

    let lastActivityAt = Number(localStorage.getItem(ACCOUNT_ACTIVITY_KEY)) || Date.now();
    let lastActivitySyncAt = 0;
    let lastActivityStorageWriteAt = 0;
    let activitySync = null;

    const encerrarSessaoPorInatividade = () => {
        if (!localStorage.getItem('token_oab')) return;
        localStorage.removeItem('token_oab');
        localStorage.removeItem('user_name');
        localStorage.removeItem('is_admin');
        localStorage.removeItem('can_use_personal_theme');
        localStorage.removeItem(ACCOUNT_ACTIVITY_KEY);
        state.screen = 'HOME';
        render();
        notify('Sua sessão foi encerrada após uma hora de inatividade.', 'info');
    };

    const sincronizarAtividade = () => {
        if (activitySync || !localStorage.getItem('token_oab')) return;
        activitySync = registrarAtividadeSessao()
            .then(sessaoValida => {
                lastActivitySyncAt = Date.now();
                if (!sessaoValida) encerrarSessaoPorInatividade();
            })
            .catch(erro => {
                console.error('Erro ao sincronizar atividade da sessão:', erro);
            })
            .finally(() => {
                activitySync = null;
            });
    };

    const verificarInatividade = () => {
        if (!localStorage.getItem('token_oab')) return;
        const atividadeSalva = Number(localStorage.getItem(ACCOUNT_ACTIVITY_KEY));
        if (atividadeSalva) lastActivityAt = atividadeSalva;
        if (Date.now() - lastActivityAt >= ACCOUNT_IDLE_LIMIT) {
            encerrarSessaoPorInatividade();
            return;
        }
        if (
            Date.now() - lastActivityAt <= ACTIVITY_SYNC_INTERVAL &&
            Date.now() - lastActivitySyncAt >= ACTIVITY_SYNC_INTERVAL
        ) {
            sincronizarAtividade();
        }
    };

    const registrarInteracao = () => {
        if (!localStorage.getItem('token_oab')) return;
        const agora = Date.now();
        const atividadeSalva = Number(localStorage.getItem(ACCOUNT_ACTIVITY_KEY));
        if (atividadeSalva) lastActivityAt = atividadeSalva;
        if (agora - lastActivityAt >= ACCOUNT_IDLE_LIMIT) {
            encerrarSessaoPorInatividade();
            return;
        }

        lastActivityAt = agora;
        if (agora - lastActivityStorageWriteAt >= 10_000) {
            localStorage.setItem(ACCOUNT_ACTIVITY_KEY, String(agora));
            lastActivityStorageWriteAt = agora;
        }
        if (agora - lastActivitySyncAt >= ACTIVITY_SYNC_INTERVAL) {
            sincronizarAtividade();
        }
    };

    if (localStorage.getItem('token_oab')) {
        if (Date.now() - lastActivityAt >= ACCOUNT_IDLE_LIMIT) {
            encerrarSessaoPorInatividade();
        } else {
            sincronizarAtividade();
        }
    }

    ['pointerdown', 'pointermove', 'keydown', 'touchstart', 'wheel'].forEach(eventName => {
        document.addEventListener(eventName, registrarInteracao, { passive: true });
    });
    window.setInterval(verificarInatividade, 30_000);
    document.addEventListener('visibilitychange', verificarInatividade);

    const indicadorOnline = document.getElementById('online-students');
    const registrarPresenca = () => {
        if (document.visibilityState !== 'visible') return;
        atualizarPresenca()
            .then(total => {
                indicadorOnline.textContent = `Estudantes online: ${total}`;
                indicadorOnline.dataset.status = 'connected';
            })
            .catch(erro => {
                indicadorOnline.dataset.status = 'error';
                console.error('Erro ao atualizar presença:', erro);
            });
    };

    registrarPresenca();
    window.setInterval(registrarPresenca, 30_000);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') registrarPresenca();
    });
});
