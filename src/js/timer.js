let intervalId = null;

export function segundosRestantes(deadline) {
    if (!deadline) return null;
    return Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
}

export function formatarTempo(segundos) {
    const minutos = Math.floor(segundos / 60);
    const restoSegundos = segundos % 60;
    return `${String(minutos).padStart(2, '0')}:${String(restoSegundos).padStart(2, '0')}`;
}

export function pararCronometro() {
    if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
    }
}

export function iniciarCronometro(deadline, aoEsgotar) {
    pararCronometro();

    const atualizar = () => {
        const restante = segundosRestantes(deadline);
        const display = document.querySelector('[data-timer-display]');
        if (display && restante !== null) {
            display.textContent = formatarTempo(restante);
            display.closest('[data-countdown]')?.classList.toggle(
                'countdown-warning',
                restante <= 300
            );
        }

        if (restante === 0) {
            pararCronometro();
            aoEsgotar();
        }
    };

    atualizar();
    intervalId = window.setInterval(atualizar, 1000);
}