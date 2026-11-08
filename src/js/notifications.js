let notificationRegion;
const notificationSound = typeof Audio === 'undefined'
    ? null
    : new Audio(new URL('../assets/notification.mp3', import.meta.url).href);
if (notificationSound) {
    notificationSound.preload = 'auto';
    notificationSound.volume = 0.45;
}

function playNotificationSound() {
    if (!notificationSound) return;
    notificationSound.currentTime = 0;
    notificationSound.play().catch(() => {
        // Browsers can block sound until the user has interacted with the page.
    });
}

function getNotificationRegion() {
    if (notificationRegion?.isConnected) return notificationRegion;

    notificationRegion = document.createElement('div');
    notificationRegion.className = 'notification-region';
    notificationRegion.setAttribute('aria-label', 'Notificações');
    notificationRegion.setAttribute('aria-live', 'polite');
    notificationRegion.setAttribute('aria-relevant', 'additions');
    document.body.append(notificationRegion);
    return notificationRegion;
}

export function notify(message, type = 'info') {
    playNotificationSound();
    const region = getNotificationRegion();
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.setAttribute('role', type === 'error' ? 'alert' : 'status');

    const text = document.createElement('p');
    text.className = 'notification-message';
    text.textContent = message;

    const close = document.createElement('button');
    close.className = 'notification-close';
    close.type = 'button';
    close.setAttribute('aria-label', 'Fechar notificação');
    close.textContent = '×';
    close.addEventListener('click', () => notification.remove());

    notification.append(text, close);
    region.append(notification);

    if (type !== 'error') {
        window.setTimeout(() => notification.remove(), 5000);
    }

    return notification;
}

export function confirmAction({
    title,
    message,
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    danger = false,
}) {
    const previousFocus = document.activeElement;
    const dialog = document.createElement('dialog');
    dialog.className = 'confirmation-dialog';
    dialog.setAttribute('aria-labelledby', 'confirmation-title');

    const heading = document.createElement('h2');
    heading.id = 'confirmation-title';
    heading.textContent = title;

    const description = document.createElement('p');
    description.textContent = message;

    const actions = document.createElement('div');
    actions.className = 'confirmation-actions';

    const cancel = document.createElement('button');
    cancel.className = 'btn-nav-outline';
    cancel.type = 'button';
    cancel.textContent = cancelLabel;

    const confirm = document.createElement('button');
    confirm.className = danger ? 'btn-danger' : 'btn-primary';
    confirm.type = 'button';
    confirm.textContent = confirmLabel;

    actions.append(cancel, confirm);
    dialog.append(heading, description, actions);
    document.body.append(dialog);

    return new Promise(resolve => {
        const finish = result => {
            if (dialog.open) dialog.close();
            dialog.remove();
            if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
                previousFocus.focus();
            }
            resolve(result);
        };

        cancel.addEventListener('click', () => finish(false));
        confirm.addEventListener('click', () => finish(true));
        dialog.addEventListener('cancel', event => {
            event.preventDefault();
            finish(false);
        });
        dialog.addEventListener('click', event => {
            if (event.target === dialog) finish(false);
        });
        dialog.addEventListener('close', () => {
            if (dialog.isConnected) dialog.remove();
        });
        dialog.showModal();
        confirm.focus();
    });
}

export function setFieldError(input, message) {
    if (!input) return;

    const formGroup = input.closest('.form-group, .admin-user-form label, .admin-user-edit-form label');
    if (!formGroup) return;

    formGroup.querySelector('.field-error')?.remove();
    input.setAttribute('aria-invalid', 'true');

    const error = document.createElement('small');
    error.className = 'field-error';
    error.textContent = message;
    if (!input.id) {
        input.id = `${input.name || 'field'}-${input.closest('form')?.dataset.userId || 'form'}`;
    }
    error.id = `${input.id}-error`;
    input.setAttribute('aria-describedby', error.id);
    formGroup.append(error);
    input.focus();
}

export function clearFieldErrors(form) {
    form.querySelectorAll('.field-error').forEach(error => error.remove());
    form.querySelectorAll('.form-error').forEach(error => error.remove());
    form.querySelectorAll('[aria-invalid="true"]').forEach(input => {
        input.removeAttribute('aria-invalid');
        input.removeAttribute('aria-describedby');
    });
}

export async function withButtonLoading(button, action, loadingLabel = 'Aguarde...') {
    if (button.disabled) return;

    const originalLabel = button.textContent;
    button.disabled = true;
    button.textContent = loadingLabel;
    button.setAttribute('aria-busy', 'true');

    try {
        return await action();
    } finally {
        if (button.isConnected) {
            button.disabled = false;
            button.textContent = originalLabel;
            button.removeAttribute('aria-busy');
        }
    }
}
