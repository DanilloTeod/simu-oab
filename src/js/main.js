import { render } from "./views.js";
import { atualizarPresenca } from "./api.js";
import {
    protectQuizFromAccidentalExit,
    restoreQuizProgress,
} from "./quiz-progress.js";
import { notify } from "./notifications.js";

// Inicialização
window.addEventListener('DOMContentLoaded', () => {
    const quizRestaurado = restoreQuizProgress();
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