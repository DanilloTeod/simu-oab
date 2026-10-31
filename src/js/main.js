import { render } from "./views.js";
import { atualizarPresenca } from "./api.js";

// Inicialização
window.addEventListener('DOMContentLoaded', () => {
    render();
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