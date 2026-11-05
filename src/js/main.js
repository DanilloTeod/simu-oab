import { render } from "./views.js";
import { atualizarPresenca } from "./api.js";
import {
    protectQuizFromAccidentalExit,
    restoreQuizProgress,
} from "./quiz-progress.js";
import { notify } from "./notifications.js";
import { state } from "./state.js";

// Inicialização
window.addEventListener('DOMContentLoaded', () => {
    const resetToken = new URLSearchParams(window.location.search).get('reset_token');
    if (resetToken) {
        state.screen = 'RESET_PASSWORD';
        state.resetToken = resetToken;
    }
    const quizRestaurado = state.screen !== 'RESET_PASSWORD' && restoreQuizProgress();
    protectQuizFromAccidentalExit();
    render();
    if (quizRestaurado) {
        notify('Seu simulado foi restaurado de onde você parou.', 'info');
    }
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